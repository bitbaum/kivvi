import { eq, and, lt, sql, desc, count } from 'drizzle-orm';
import { documents, documentItems, documentPayments, contacts } from '@kivvi/database';
import type { Database, DocumentStatus } from '@kivvi/database';
import { getNextNumber } from './number-sequences';

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
  if (status === 'dunning_3') return 3;
  if (status === 'dunning_2') return 2;
  if (status === 'dunning_1') return 1;
  return 0;
}

function getNextDunningStatus(currentStatus: string): DocumentStatus | null {
  const current = getDunningLevel(currentStatus);
  if (current === 0) return 'dunning_1';
  if (current === 1) return 'dunning_2';
  if (current === 2) return 'dunning_3';
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
  companyId: string
): Promise<OverdueInvoice[]> {
  const now = new Date();

  const results = await db.query.documents.findMany({
    where: and(
      eq(documents.companyId, companyId),
      eq(documents.type, 'invoice'),
      sql`${documents.status} IN ('sent', 'confirmed', 'delivered', 'partially_paid', 'overdue', 'dunning_1', 'dunning_2', 'dunning_3')`,
      lt(documents.dueDate, now)
    ),
    with: {
      contact: { columns: { id: true, name: true } },
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
    daysOverdue: Math.floor((now.getTime() - new Date(doc.dueDate!).getTime()) / (1000 * 60 * 60 * 24)),
    dunningLevel: getDunningLevel(doc.status),
  }));
}

/**
 * Get dunning statistics for a company.
 */
export async function getDunningStats(
  db: Database,
  companyId: string
): Promise<DunningStats> {
  const overdue = await detectOverdueInvoices(db, companyId);

  // Get payments for all overdue invoices to calculate outstanding amounts
  let totalOverdueAmount = 0;
  for (const inv of overdue) {
    const [paymentsResult] = await db
      .select({
        totalPaid: sql<string>`COALESCE(SUM(${documentPayments.amount}::numeric), 0)`,
      })
      .from(documentPayments)
      .where(eq(documentPayments.documentId, inv.id));

    const outstanding = Number(inv.total) - parseFloat(paymentsResult?.totalPaid || '0');
    totalOverdueAmount += Math.max(0, outstanding);
  }

  return {
    totalOverdue: overdue.length,
    totalOverdueAmount,
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
  invoiceId: string
): Promise<{ dunningDoc: any; newLevel: DocumentStatus }> {
  // Fetch the invoice
  const [invoice] = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.id, invoiceId),
        eq(documents.companyId, companyId),
        eq(documents.type, 'invoice')
      )
    )
    .limit(1);

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  if (invoice.status === 'paid' || invoice.status === 'cancelled') {
    throw new Error(`Cannot create dunning for a ${invoice.status} invoice`);
  }

  const nextStatus = getNextDunningStatus(invoice.status);
  if (!nextStatus) {
    throw new Error('Invoice is already at maximum dunning level');
  }

  // Calculate outstanding amount (total - paid)
  const [paymentsResult] = await db
    .select({
      totalPaid: sql<string>`COALESCE(SUM(${documentPayments.amount}::numeric), 0)`,
    })
    .from(documentPayments)
    .where(eq(documentPayments.documentId, invoiceId));

  const totalPaid = parseFloat(paymentsResult?.totalPaid || '0');
  const outstanding = (parseFloat(invoice.total) - totalPaid).toFixed(2);

  // Generate dunning document number
  const number = await getNextNumber(db, companyId, 'dunning');

  // Create dunning document
  const [dunningDoc] = await db
    .insert(documents)
    .values({
      companyId,
      type: 'dunning',
      status: 'draft',
      number,
      contactId: invoice.contactId,
      issueDate: new Date(),
      currency: invoice.currency,
      subtotal: outstanding,
      vatAmount: '0',
      total: outstanding,
      notes: `Dunning notice for invoice ${invoice.number}. Payment was due on ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('de-CH') : 'unknown'}. Outstanding amount: CHF ${outstanding}.`,
      convertedFromId: invoice.id,
      createdBy: userId,
    })
    .returning();

  // Create a single line item referencing the outstanding amount
  await db.insert(documentItems).values({
    documentId: dunningDoc.id,
    position: 0,
    description: `Outstanding amount for invoice ${invoice.number}`,
    quantity: '1',
    unitPrice: outstanding,
    discount: '0',
    vatRate: '0',
    total: outstanding,
  });

  // Escalate the invoice status
  await db
    .update(documents)
    .set({
      status: nextStatus,
      updatedAt: new Date(),
    })
    .where(eq(documents.id, invoiceId));

  return { dunningDoc, newLevel: nextStatus };
}

/**
 * Get dunning history for a specific invoice.
 * Returns all dunning documents linked to this invoice.
 */
export async function getDunningHistory(
  db: Database,
  companyId: string,
  invoiceId: string
) {
  return db.query.documents.findMany({
    where: and(
      eq(documents.companyId, companyId),
      eq(documents.type, 'dunning'),
      eq(documents.convertedFromId, invoiceId)
    ),
    orderBy: [desc(documents.createdAt)],
  });
}
