import { z } from "zod";
import Decimal from "decimal.js";
import { eq, and, asc, desc, sql } from "drizzle-orm";
import {
  bankAccounts,
  bankTransactions,
  documents,
  contacts,
} from "@kivvi/database";
import type { Database, BankAccount, BankTransaction } from "@kivvi/database";
import { recordPayment } from "./documents";
import { logger } from "../logger";
import { parseCamtXml, normalizeIban, type CamtStatement } from "./camt-parser";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export const createBankAccountSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  iban: z.string().max(34).optional().nullable(),
  bankName: z.string().max(200).optional().nullable(),
  currency: z.string().max(3).default("CHF"),
  accountId: z.string().uuid().optional().nullable(),
});

export const importTransactionSchema = z.object({
  date: z.string().min(1),
  description: z.string().optional().nullable(),
  reference: z.string().optional().nullable(),
  amount: z.string().min(1),
  balance: z.string().optional().nullable(),
  // CAMT.053/054 optional fields
  entryReference: z.string().optional().nullable(),
  valueDate: z.string().optional().nullable(),
  debtorName: z.string().optional().nullable(),
  creditorName: z.string().optional().nullable(),
  remittanceInfo: z.string().optional().nullable(),
});

// ============================================================================
// BANK ACCOUNTS
// ============================================================================

export async function listBankAccounts(
  db: Database,
  companyId: string,
): Promise<BankAccount[]> {
  return db
    .select()
    .from(bankAccounts)
    .where(eq(bankAccounts.companyId, companyId))
    .orderBy(asc(bankAccounts.name));
}

export async function getBankAccount(
  db: Database,
  companyId: string,
  bankAccountId: string,
): Promise<BankAccount | null> {
  const [account] = await db
    .select()
    .from(bankAccounts)
    .where(
      and(
        eq(bankAccounts.id, bankAccountId),
        eq(bankAccounts.companyId, companyId),
      ),
    );
  return account || null;
}

export async function createBankAccount(
  db: Database,
  companyId: string,
  input: z.infer<typeof createBankAccountSchema>,
): Promise<BankAccount> {
  const validated = createBankAccountSchema.parse(input);

  const [account] = await db
    .insert(bankAccounts)
    .values({
      companyId,
      name: validated.name,
      iban: validated.iban || null,
      bankName: validated.bankName || null,
      currency: validated.currency,
      accountId: validated.accountId || null,
    })
    .returning();

  return account;
}

export async function updateBankAccount(
  db: Database,
  companyId: string,
  bankAccountId: string,
  input: z.infer<typeof createBankAccountSchema>,
): Promise<BankAccount> {
  const validated = createBankAccountSchema.parse(input);

  const [account] = await db
    .update(bankAccounts)
    .set({
      name: validated.name,
      iban: validated.iban || null,
      bankName: validated.bankName || null,
      currency: validated.currency,
      accountId: validated.accountId || null,
    })
    .where(
      and(
        eq(bankAccounts.id, bankAccountId),
        eq(bankAccounts.companyId, companyId),
      ),
    )
    .returning();

  if (!account) throw new Error("Bank account not found");
  return account;
}

// ============================================================================
// BANK TRANSACTIONS
// ============================================================================

export interface TransactionWithMatch extends BankTransaction {
  matchedDocument?: {
    id: string;
    number: string;
    type: string;
    total: string;
    contactName: string | null;
  } | null;
}

export interface TransactionFilters {
  bankAccountId: string;
  isReconciled?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function listTransactions(
  db: Database,
  companyId: string,
  filters: TransactionFilters,
): Promise<{
  data: TransactionWithMatch[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 50;

  // Verify bank account belongs to company
  const bankAccount = await getBankAccount(
    db,
    companyId,
    filters.bankAccountId,
  );
  if (!bankAccount) throw new Error("Bank account not found");

  const conditions = [
    eq(bankTransactions.bankAccountId, filters.bankAccountId),
  ];

  if (filters.isReconciled !== undefined) {
    conditions.push(eq(bankTransactions.isReconciled, filters.isReconciled));
  }
  if (filters.search) {
    conditions.push(
      sql`(${bankTransactions.description} ILIKE ${`%${filters.search}%`} OR ${bankTransactions.reference} ILIKE ${`%${filters.search}%`})`,
    );
  }

  const whereClause = and(...conditions);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(bankTransactions)
    .where(whereClause);

  const rows = await db
    .select({
      transaction: bankTransactions,
      docId: documents.id,
      docNumber: documents.number,
      docType: documents.type,
      docTotal: documents.total,
      contactName: contacts.name,
    })
    .from(bankTransactions)
    .leftJoin(
      documents,
      eq(bankTransactions.reconciledDocumentId, documents.id),
    )
    .leftJoin(contacts, eq(documents.contactId, contacts.id))
    .where(whereClause)
    .orderBy(desc(bankTransactions.date))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const data: TransactionWithMatch[] = rows.map((r) => ({
    ...r.transaction,
    matchedDocument: r.docId
      ? {
          id: r.docId,
          number: r.docNumber!,
          type: r.docType!,
          total: r.docTotal!,
          contactName: r.contactName,
        }
      : null,
  }));

  return {
    data,
    total: count,
    page,
    pageSize,
    totalPages: Math.ceil(count / pageSize),
  };
}

export interface ImportTransactionsOptions {
  /** CAMT closing balance — used to update bankAccounts.balance instead of last row's balance */
  closingBalance?: string;
}

/**
 * Import bank transactions from parsed data (CSV or CAMT).
 * Deduplicates by entryReference when present.
 */
export async function importTransactions(
  db: Database,
  companyId: string,
  bankAccountId: string,
  transactions: z.infer<typeof importTransactionSchema>[],
  options?: ImportTransactionsOptions,
): Promise<{ imported: number; skippedDuplicates: number }> {
  const bankAccount = await getBankAccount(db, companyId, bankAccountId);
  if (!bankAccount) throw new Error("Bank account not found");

  if (transactions.length === 0) return { imported: 0, skippedDuplicates: 0 };

  // Dedup: find existing entryReferences for this bank account
  const incomingRefs = transactions
    .map((t) => t.entryReference)
    .filter((ref): ref is string => !!ref);

  let existingRefs = new Set<string>();
  if (incomingRefs.length > 0) {
    const existing = await db
      .select({ ref: bankTransactions.entryReference })
      .from(bankTransactions)
      .where(
        and(
          eq(bankTransactions.bankAccountId, bankAccountId),
          sql`${bankTransactions.entryReference} IS NOT NULL`,
        ),
      );
    existingRefs = new Set(existing.map((r) => r.ref!));
  }

  let skippedDuplicates = 0;
  const values = transactions
    .filter((t) => {
      if (t.entryReference && existingRefs.has(t.entryReference)) {
        skippedDuplicates++;
        return false;
      }
      return true;
    })
    .map((t) => ({
      bankAccountId,
      date: new Date(t.date),
      description: t.description || null,
      reference: t.reference || null,
      amount: t.amount,
      balance: t.balance || null,
      entryReference: t.entryReference || null,
      valueDate: t.valueDate ? new Date(t.valueDate) : null,
      debtorName: t.debtorName || null,
      creditorName: t.creditorName || null,
      remittanceInfo: t.remittanceInfo || null,
    }));

  if (values.length > 0) {
    await db.insert(bankTransactions).values(values);
  }

  // Update bank account balance
  const balanceToSet =
    options?.closingBalance || transactions[transactions.length - 1].balance;
  if (balanceToSet) {
    await db
      .update(bankAccounts)
      .set({ balance: balanceToSet, lastSyncAt: new Date() })
      .where(
        and(
          eq(bankAccounts.id, bankAccountId),
          eq(bankAccounts.companyId, companyId),
        ),
      );
  }

  return { imported: values.length, skippedDuplicates };
}

/**
 * Import a CAMT.053/054 XML statement into bank transactions.
 * Parses XML, validates IBAN, maps entries, and calls importTransactions().
 */
export async function importCamtStatement(
  db: Database,
  companyId: string,
  bankAccountId: string,
  xml: string,
): Promise<{
  imported: number;
  skippedDuplicates: number;
  totalEntries: number;
}> {
  const statement = parseCamtXml(xml);

  // Validate IBAN match
  const bankAccount = await getBankAccount(db, companyId, bankAccountId);
  if (!bankAccount) throw new Error("Bank account not found");

  if (statement.accountIban && bankAccount.iban) {
    const stmtIban = normalizeIban(statement.accountIban);
    const acctIban = normalizeIban(bankAccount.iban);
    if (stmtIban !== acctIban) {
      throw new Error(
        `IBAN mismatch: statement has ${stmtIban}, account has ${acctIban}`,
      );
    }
  }

  // Map CAMT entries to import schema
  const transactions: z.infer<typeof importTransactionSchema>[] =
    statement.entries.map((entry) => ({
      date: entry.bookingDate,
      description: entry.description || null,
      reference: entry.reference || null,
      amount: entry.amount,
      balance: null,
      entryReference: entry.entryReference || null,
      valueDate: entry.valueDate || null,
      debtorName: entry.debtorName || null,
      creditorName: entry.creditorName || null,
      remittanceInfo: entry.remittanceInfo || null,
    }));

  const closingBalance = statement.closingBalance?.amount;

  const result = await importTransactions(
    db,
    companyId,
    bankAccountId,
    transactions,
    {
      closingBalance,
    },
  );

  return {
    imported: result.imported,
    skippedDuplicates: result.skippedDuplicates,
    totalEntries: statement.entries.length,
  };
}

/**
 * Reconcile a bank transaction with a document (invoice, purchase invoice, etc.)
 */
export async function reconcileTransaction(
  db: Database,
  companyId: string,
  transactionId: string,
  documentId: string,
): Promise<BankTransaction> {
  // Verify transaction belongs to company's bank account
  const [txn] = await db
    .select({ transaction: bankTransactions, bankAccount: bankAccounts })
    .from(bankTransactions)
    .innerJoin(
      bankAccounts,
      eq(bankTransactions.bankAccountId, bankAccounts.id),
    )
    .where(
      and(
        eq(bankTransactions.id, transactionId),
        eq(bankAccounts.companyId, companyId),
      ),
    );

  if (!txn) throw new Error("Transaction not found");
  if (txn.transaction.isReconciled)
    throw new Error("Transaction is already reconciled");

  // Verify document belongs to company
  const [doc] = await db
    .select()
    .from(documents)
    .where(
      and(eq(documents.id, documentId), eq(documents.companyId, companyId)),
    );

  if (!doc) throw new Error("Document not found");

  // Reconciliation + payment must be atomic: if payment fails, roll back reconciliation
  const updated = await db.transaction(async (tx) => {
    const [reconciled] = await tx
      .update(bankTransactions)
      .set({
        isReconciled: true,
        reconciledDocumentId: documentId,
        reconciledAt: new Date(),
      })
      .where(eq(bankTransactions.id, transactionId))
      .returning();

    // Auto-record payment (idempotent — skips if bankTransactionId already used)
    const txnAmount = new Decimal(txn.transaction.amount).abs();
    await recordPayment(tx, companyId, documentId, {
      amount: txnAmount.toFixed(2),
      date: txn.transaction.date.toISOString().split("T")[0],
      method: "bank_transfer",
      reference: txn.transaction.reference || `Bank tx ${transactionId}`,
      bankTransactionId: transactionId,
    });

    return reconciled;
  });

  return updated;
}

/**
 * Auto-match a bank transaction to an invoice by QR reference or exact amount.
 * Returns the matched document, or null if no match found.
 * Does NOT reconcile — caller should call reconcileTransaction() on match.
 */
export async function matchTransactionToDocument(
  db: Database,
  companyId: string,
  transactionId: string,
): Promise<{ documentId: string; documentNumber: string } | null> {
  const txn = await db.query.bankTransactions.findFirst({
    where: (bankTransactions, { eq }) => eq(bankTransactions.id, transactionId),
    with: { bankAccount: true },
  });

  if (!txn) throw new Error("Transaction not found");
  if (txn.bankAccount.companyId !== companyId) throw new Error("Unauthorized");
  if (txn.isReconciled) throw new Error("Transaction already reconciled");

  const PAYABLE_STATUSES = sql`${documents.status} IN ('sent', 'confirmed', 'delivered', 'partially_paid', 'overdue', 'dunning_1', 'dunning_2', 'dunning_3')`;

  // 1. QR reference match (check both reference and remittanceInfo fields)
  let matchedDoc = null;
  const refFields = [txn.reference, txn.remittanceInfo].filter(
    Boolean,
  ) as string[];
  for (const ref of refFields) {
    matchedDoc = await db.query.documents.findFirst({
      where: (documents, { eq, and, sql: sqlFn }) =>
        and(
          eq(documents.companyId, companyId),
          eq(documents.type, "invoice"),
          sqlFn`${documents.qrReference} IS NOT NULL AND ${ref} LIKE '%' || ${documents.qrReference} || '%'`,
          PAYABLE_STATUSES,
        ),
    });
    if (matchedDoc) break;
  }

  // 2. Exact amount match (within 0.01 CHF tolerance)
  if (!matchedDoc) {
    const txnAmountAbs = new Decimal(txn.amount).abs().toString();
    matchedDoc = await db.query.documents.findFirst({
      where: (documents, { eq, and, sql: sqlFn }) =>
        and(
          eq(documents.companyId, companyId),
          eq(documents.type, "invoice"),
          sqlFn`ABS(CAST(${documents.total} AS DECIMAL) - CAST(${txnAmountAbs} AS DECIMAL)) < 0.01`,
          PAYABLE_STATUSES,
        ),
    });
  }

  if (!matchedDoc) return null;
  return { documentId: matchedDoc.id, documentNumber: matchedDoc.number };
}

/**
 * Un-reconcile a transaction.
 */
export async function unreconcileTransaction(
  db: Database,
  companyId: string,
  transactionId: string,
): Promise<BankTransaction> {
  const [txn] = await db
    .select({ transaction: bankTransactions, bankAccount: bankAccounts })
    .from(bankTransactions)
    .innerJoin(
      bankAccounts,
      eq(bankTransactions.bankAccountId, bankAccounts.id),
    )
    .where(
      and(
        eq(bankTransactions.id, transactionId),
        eq(bankAccounts.companyId, companyId),
      ),
    );

  if (!txn) throw new Error("Transaction not found");

  const [updated] = await db
    .update(bankTransactions)
    .set({
      isReconciled: false,
      reconciledDocumentId: null,
      reconciledAt: null,
    })
    .where(eq(bankTransactions.id, transactionId))
    .returning();

  return updated;
}

/**
 * Auto-match unreconciled transactions to open invoices by QR reference or amount.
 *
 * Matching priority:
 * 1. QR reference — checks transaction `reference` and `remittanceInfo` against
 *    invoice `qrReference`. This is the most reliable match (unique per invoice).
 * 2. Exact amount — only when a single open invoice matches the transaction amount
 *    (within CHF 0.01 tolerance) to avoid ambiguous matches.
 *
 * Each successful match atomically:
 * - Marks the bank transaction as reconciled
 * - Records a payment on the document (via `reconcileTransaction`)
 */
export async function autoMatchTransactions(
  db: Database,
  companyId: string,
  bankAccountId: string,
): Promise<{ matched: number; total: number }> {
  const bankAccount = await getBankAccount(db, companyId, bankAccountId);
  if (!bankAccount) throw new Error("Bank account not found");

  // Get unreconciled incoming transactions (positive amounts = payments received)
  const unreconciledTxns = await db
    .select()
    .from(bankTransactions)
    .where(
      and(
        eq(bankTransactions.bankAccountId, bankAccountId),
        eq(bankTransactions.isReconciled, false),
        sql`CAST(${bankTransactions.amount} AS DECIMAL) > 0`,
      ),
    );

  // Get open invoices that can receive payments
  const PAYABLE_STATUSES = [
    "sent",
    "confirmed",
    "delivered",
    "partially_paid",
    "overdue",
    "dunning_1",
    "dunning_2",
    "dunning_3",
  ];
  const openInvoices = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.companyId, companyId),
        eq(documents.type, "invoice"),
        sql`${documents.status} IN (${sql.join(
          PAYABLE_STATUSES.map((s) => sql`${s}`),
          sql`, `,
        )})`,
      ),
    );

  // Track which invoices have been matched so we don't double-match
  const matchedInvoiceIds = new Set<string>();
  let matched = 0;

  for (const txn of unreconciledTxns) {
    // 1. Try matching by QR reference (check both reference and remittanceInfo)
    const refFields = [txn.reference, txn.remittanceInfo].filter(
      Boolean,
    ) as string[];

    if (refFields.length > 0) {
      const matchByRef = openInvoices.find(
        (inv) =>
          !matchedInvoiceIds.has(inv.id) &&
          inv.qrReference &&
          refFields.some((ref) => ref.includes(inv.qrReference!)),
      );
      if (matchByRef) {
        try {
          await reconcileTransaction(db, companyId, txn.id, matchByRef.id);
          matchedInvoiceIds.add(matchByRef.id);
          matched++;
        } catch (error) {
          // Log but continue — one failed reconciliation shouldn't abort the batch
          logger.warn("Auto-match QR reconciliation failed", {
            transactionId: txn.id,
            documentId: matchByRef.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
        continue;
      }
    }

    // 2. Try matching by exact amount — only if exactly ONE invoice matches
    //    to avoid ambiguous matches (multiple invoices with same total)
    const txnAmount = new Decimal(txn.amount);
    const amountCandidates = openInvoices.filter(
      (inv) =>
        !matchedInvoiceIds.has(inv.id) &&
        inv.total &&
        new Decimal(inv.total).minus(txnAmount).abs().lt("0.01"),
    );

    if (amountCandidates.length === 1) {
      const matchByAmount = amountCandidates[0];
      try {
        await reconcileTransaction(db, companyId, txn.id, matchByAmount.id);
        matchedInvoiceIds.add(matchByAmount.id);
        matched++;
      } catch (error) {
        logger.warn("Auto-match amount reconciliation failed", {
          transactionId: txn.id,
          documentId: matchByAmount.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  return { matched, total: unreconciledTxns.length };
}

/**
 * Get bank reconciliation summary.
 */
export async function getReconciliationSummary(
  db: Database,
  companyId: string,
  bankAccountId: string,
): Promise<{
  totalTransactions: number;
  reconciled: number;
  unreconciled: number;
  totalUnreconciledAmount: number;
}> {
  const bankAccount = await getBankAccount(db, companyId, bankAccountId);
  if (!bankAccount) throw new Error("Bank account not found");

  const [stats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      reconciled: sql<number>`count(*) FILTER (WHERE ${bankTransactions.isReconciled} = true)::int`,
      unreconciled: sql<number>`count(*) FILTER (WHERE ${bankTransactions.isReconciled} = false)::int`,
      unreconciledAmount: sql<number>`COALESCE(SUM(CAST(${bankTransactions.amount} AS DECIMAL)) FILTER (WHERE ${bankTransactions.isReconciled} = false), 0)`,
    })
    .from(bankTransactions)
    .where(eq(bankTransactions.bankAccountId, bankAccountId));

  return {
    totalTransactions: stats.total,
    reconciled: stats.reconciled,
    unreconciled: stats.unreconciled,
    totalUnreconciledAmount: Number(stats.unreconciledAmount),
  };
}

/**
 * Get company-wide bank transaction summary (across all accounts).
 * Used by banking hub and money overview pages.
 */
export async function getBankTransactionsSummary(
  db: Database,
  companyId: string,
): Promise<{
  unreconciledCount: number;
  lastTransactionDate: Date | null;
}> {
  const [row] = await db
    .select({
      unreconciledCount: sql<number>`count(*) filter (where ${bankTransactions.isReconciled} = false)::int`,
      lastTransactionDate: sql<Date | null>`max(${bankTransactions.date})`,
    })
    .from(bankTransactions)
    .innerJoin(
      bankAccounts,
      eq(bankTransactions.bankAccountId, bankAccounts.id),
    )
    .where(eq(bankAccounts.companyId, companyId));

  return {
    unreconciledCount: row?.unreconciledCount ?? 0,
    lastTransactionDate: row?.lastTransactionDate ?? null,
  };
}
