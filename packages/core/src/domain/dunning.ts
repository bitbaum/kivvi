import Decimal from "decimal.js";
import { eq, and, lt, sql, desc, count, inArray, ne } from "drizzle-orm";
import { DEFAULT_LOCALE, DEFAULT_CURRENCY } from "../config/locale";
import {
  documents,
  documentItems,
  documentPayments,
  contacts,
  companies,
  users,
} from "@kivvi/database";
import type { Database, DocumentStatus } from "@kivvi/database";
import { getNextNumber } from "./number-sequences";
import { NON_TERMINAL_STATUSES } from "../config/document-constants";
import { logger } from "../logger";

// ============================================================================
// TYPES
// ============================================================================

export interface OverdueInvoice {
  id: string;
  number: string;
  contactId: string | null;
  contactName: string | null;
  issueDate: Date;
  dueDate: Date;
  total: string;
  status: string;
  daysOverdue: number;
  dunningLevel: number; // 0 = no dunning yet, 1-3 = dunning level
  dunningBlock: boolean; // Mahnsperre — skip this contact in the dunning run
}

export interface DunningStats {
  totalOverdue: number;
  totalOverdueAmount: number;
  level0Count: number;
  level1Count: number;
  level2Count: number;
  level3Count: number;
}

// ============================================================================
// DUNNING LEVEL DETECTION
// ============================================================================

function getDunningLevel(status: string): number {
  if (status === "dunning_3") return 3;
  if (status === "dunning_2") return 2;
  if (status === "dunning_1") return 1;
  return 0;
}

function getNextDunningStatus(currentStatus: string): DocumentStatus | null {
  const current = getDunningLevel(currentStatus);
  if (current === 0) return "dunning_1";
  if (current === 1) return "dunning_2";
  if (current === 2) return "dunning_3";
  return null; // Already at max level
}

// ============================================================================
// DOMAIN FUNCTIONS
// ============================================================================

/**
 * Find all overdue invoices for a company.
 * An invoice is overdue if: it's not paid/cancelled, and dueDate < now.
 */
export async function detectOverdueInvoices(
  db: Database,
  companyId: string,
): Promise<OverdueInvoice[]> {
  const now = new Date();

  const results = await db.query.documents.findMany({
    where: and(
      eq(documents.companyId, companyId),
      eq(documents.type, "invoice"),
      inArray(documents.status, [...NON_TERMINAL_STATUSES]),
      lt(documents.dueDate, now),
    ),
    with: {
      contact: { columns: { id: true, name: true, dunningBlock: true } },
    },
    orderBy: [desc(documents.dueDate)],
  });

  return results.map((doc) => ({
    id: doc.id,
    number: doc.number,
    contactId: doc.contact?.id ?? null,
    contactName: doc.contact?.name ?? null,
    issueDate: doc.issueDate,
    dueDate: doc.dueDate!,
    total: doc.total,
    status: doc.status,
    daysOverdue: Math.floor(
      (now.getTime() - new Date(doc.dueDate!).getTime()) /
        (1000 * 60 * 60 * 24),
    ),
    dunningLevel: getDunningLevel(doc.status),
    dunningBlock: doc.contact?.dunningBlock ?? false,
  }));
}

/**
 * Get dunning statistics for a company.
 */
export async function getDunningStats(
  db: Database,
  companyId: string,
): Promise<DunningStats> {
  const overdue = await detectOverdueInvoices(db, companyId);

  // Bulk fetch payments for all overdue invoices (avoids N+1)
  let totalOverdueAmount = new Decimal(0);
  if (overdue.length > 0) {
    const overdueIds = overdue.map((inv) => inv.id);
    const paymentsByDoc = await db
      .select({
        documentId: documentPayments.documentId,
        totalPaid: sql<string>`COALESCE(SUM(${documentPayments.amount}::numeric), 0)`,
      })
      .from(documentPayments)
      .where(inArray(documentPayments.documentId, overdueIds))
      .groupBy(documentPayments.documentId);

    const paidMap = new Map(
      paymentsByDoc.map((p) => [p.documentId, p.totalPaid]),
    );

    for (const inv of overdue) {
      const outstanding = new Decimal(inv.total).minus(
        new Decimal(paidMap.get(inv.id) || "0"),
      );
      if (outstanding.greaterThan(0)) {
        totalOverdueAmount = totalOverdueAmount.plus(outstanding);
      }
    }
  }

  return {
    totalOverdue: overdue.length,
    totalOverdueAmount: totalOverdueAmount.toNumber(),
    level0Count: overdue.filter((i) => i.dunningLevel === 0).length,
    level1Count: overdue.filter((i) => i.dunningLevel === 1).length,
    level2Count: overdue.filter((i) => i.dunningLevel === 2).length,
    level3Count: overdue.filter((i) => i.dunningLevel === 3).length,
  };
}

/**
 * Create a dunning document for an overdue invoice.
 * - Escalates the invoice to the next dunning level
 * - Creates a dunning document linked to the invoice via convertedFromId
 */
export async function createDunning(
  db: Database,
  companyId: string,
  userId: string,
  invoiceId: string,
): Promise<{
  dunningDoc: typeof documents.$inferSelect;
  newLevel: DocumentStatus;
}> {
  // Fetch the invoice
  const [invoice] = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.id, invoiceId),
        eq(documents.companyId, companyId),
        eq(documents.type, "invoice"),
      ),
    )
    .limit(1);

  if (!invoice) {
    throw new Error("Invoice not found");
  }

  if (invoice.status === "paid" || invoice.status === "cancelled") {
    throw new Error(`Cannot create dunning for a ${invoice.status} invoice`);
  }

  const nextStatus = getNextDunningStatus(invoice.status);
  if (!nextStatus) {
    throw new Error("Invoice is already at maximum dunning level");
  }

  // Calculate outstanding amount (total - paid)
  const [paymentsResult] = await db
    .select({
      totalPaid: sql<string>`COALESCE(SUM(${documentPayments.amount}::numeric), 0)`,
    })
    .from(documentPayments)
    .where(eq(documentPayments.documentId, invoiceId));

  const totalPaid = new Decimal(paymentsResult?.totalPaid || "0");
  const outstanding = new Decimal(invoice.total).minus(totalPaid).toFixed(2);

  // Generate dunning document number
  const number = await getNextNumber(db, companyId, "dunning");

  // Wrap dunning document + item + invoice status update in transaction
  return db.transaction(async (tx) => {
    // Create dunning document
    const [dunningDoc] = await tx
      .insert(documents)
      .values({
        companyId,
        type: "dunning",
        status: "draft",
        number,
        contactId: invoice.contactId,
        issueDate: new Date(),
        currency: invoice.currency,
        subtotal: outstanding,
        vatAmount: "0",
        total: outstanding,
        notes: `Dunning notice for invoice ${invoice.number}. Payment was due on ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString(DEFAULT_LOCALE) : "unknown"}. Outstanding amount: ${DEFAULT_CURRENCY} ${outstanding}.`,
        convertedFromId: invoice.id,
        createdBy: userId,
      })
      .returning();

    // Create a single line item referencing the outstanding amount
    await tx.insert(documentItems).values({
      documentId: dunningDoc.id,
      position: 0,
      description: `Outstanding amount for invoice ${invoice.number}`,
      quantity: "1",
      unitPrice: outstanding,
      discount: "0",
      vatRate: "0",
      total: outstanding,
    });

    // Escalate the invoice status
    await tx
      .update(documents)
      .set({
        status: nextStatus,
        updatedAt: new Date(),
      })
      .where(
        and(eq(documents.id, invoiceId), eq(documents.companyId, companyId)),
      );

    return { dunningDoc, newLevel: nextStatus };
  });
}

// ============================================================================
// AUTOMATED DUNNING PROCESSING (CRON)
// ============================================================================

// Days overdue thresholds for auto-escalation
const DUNNING_THRESHOLDS = {
  dunning_1: 14, // 14+ days overdue → create dunning_1
  dunning_2: 30, // 30+ days overdue → create dunning_2
  dunning_3: 60, // 60+ days overdue → create dunning_3
} as const;

export interface DunningProcessResult {
  processed: number;
  created: number;
  errors: Array<{ companyId: string; invoiceId: string; error: string }>;
}

export interface DunningInfo {
  dunningDocId: string;
  dunningNumber: string;
  invoiceId: string;
  invoiceNumber: string;
  newLevel: DocumentStatus;
  contactName: string | null;
  total: string;
  currency: string;
  dueDate: string | null;
  companyId: string;
}

export interface ProcessDunningOptions {
  onDunningCreated?: (
    info: DunningInfo,
    emailRecipients: string[],
  ) => Promise<void>;
}

/**
 * Process all overdue invoices across all companies.
 * Called by cron job daily. Auto-escalates dunning levels based on time thresholds.
 */
export async function processOverdueInvoices(
  db: Database,
  options?: ProcessDunningOptions,
): Promise<DunningProcessResult> {
  const result: DunningProcessResult = {
    processed: 0,
    created: 0,
    errors: [],
  };

  // Find all companies that have overdue invoices
  const companiesWithOverdue = await db
    .select({ id: companies.id })
    .from(companies)
    .where(
      sql`EXISTS (
        SELECT 1 FROM ${documents}
        WHERE ${documents.companyId} = ${companies.id}
        AND ${documents.type} = 'invoice'
        AND ${documents.status} IN ('sent', 'confirmed', 'delivered', 'partially_paid', 'overdue', 'dunning_1', 'dunning_2')
        AND ${documents.dueDate} IS NOT NULL
        AND ${documents.dueDate} < NOW()
      )`,
    );

  for (const company of companiesWithOverdue) {
    try {
      const overdue = await detectOverdueInvoices(db, company.id);
      result.processed += overdue.length;

      for (const invoice of overdue) {
        try {
          // Mahnsperre: never dun a blocked contact (invoice stays overdue).
          if (invoice.dunningBlock) continue;

          // Determine if this invoice should be escalated
          const currentLevel = invoice.dunningLevel;
          let shouldEscalate = false;

          if (
            currentLevel === 0 &&
            invoice.daysOverdue >= DUNNING_THRESHOLDS.dunning_1
          ) {
            shouldEscalate = true;
          } else if (
            currentLevel === 1 &&
            invoice.daysOverdue >= DUNNING_THRESHOLDS.dunning_2
          ) {
            shouldEscalate = true;
          } else if (
            currentLevel === 2 &&
            invoice.daysOverdue >= DUNNING_THRESHOLDS.dunning_3
          ) {
            shouldEscalate = true;
          }

          if (!shouldEscalate) continue;

          // Get system user (first user of the company)
          const firstUser = await db.query.users.findFirst({
            where: eq(users.companyId, company.id),
            columns: { id: true },
          });

          if (!firstUser) {
            result.errors.push({
              companyId: company.id,
              invoiceId: invoice.id,
              error: "No users found for company",
            });
            continue;
          }

          // Create dunning document
          const { dunningDoc, newLevel } = await createDunning(
            db,
            company.id,
            firstUser.id,
            invoice.id,
          );

          result.created++;

          // Send email if callback provided and contact has email
          if (options?.onDunningCreated && invoice.contactId) {
            const contact = await db.query.contacts.findFirst({
              where: and(
                eq(contacts.id, invoice.contactId),
                eq(contacts.companyId, company.id),
              ),
              columns: { email: true, name: true },
            });

            if (contact?.email) {
              try {
                await options.onDunningCreated(
                  {
                    dunningDocId: dunningDoc.id,
                    dunningNumber: dunningDoc.number,
                    invoiceId: invoice.id,
                    invoiceNumber: invoice.number,
                    newLevel,
                    contactName: contact.name,
                    total: dunningDoc.total,
                    currency: dunningDoc.currency,
                    dueDate: invoice.dueDate
                      ? new Date(invoice.dueDate).toISOString().split("T")[0]
                      : null,
                    companyId: company.id,
                  },
                  [contact.email],
                );
              } catch (emailError) {
                logger.error(
                  `Failed to send dunning email for ${invoice.number}`,
                  emailError,
                );
              }
            }
          }
        } catch (invoiceError) {
          result.errors.push({
            companyId: company.id,
            invoiceId: invoice.id,
            error:
              invoiceError instanceof Error
                ? invoiceError.message
                : "Unknown error",
          });
        }
      }
    } catch (companyError) {
      result.errors.push({
        companyId: company.id,
        invoiceId: "",
        error:
          companyError instanceof Error
            ? companyError.message
            : "Unknown error",
      });
    }
  }

  return result;
}
