import { z } from 'zod';
import Decimal from 'decimal.js';
import { eq, and, asc, desc, sql } from 'drizzle-orm';
import {
  bankAccounts,
  bankTransactions,
  documents,
  contacts,
} from '@kivvi/database';
import type { Database, BankAccount, BankTransaction } from '@kivvi/database';
import { recordPayment } from './documents';
import { logger } from '../logger';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export const createBankAccountSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  iban: z.string().max(34).optional().nullable(),
  bankName: z.string().max(200).optional().nullable(),
  currency: z.string().max(3).default('CHF'),
  accountId: z.string().uuid().optional().nullable(),
});

export const importTransactionSchema = z.object({
  date: z.string().min(1),
  description: z.string().optional().nullable(),
  reference: z.string().optional().nullable(),
  amount: z.string().min(1),
  balance: z.string().optional().nullable(),
});

// ============================================================================
// BANK ACCOUNTS
// ============================================================================

export async function listBankAccounts(
  db: Database,
  companyId: string
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
  bankAccountId: string
): Promise<BankAccount | null> {
  const [account] = await db
    .select()
    .from(bankAccounts)
    .where(and(eq(bankAccounts.id, bankAccountId), eq(bankAccounts.companyId, companyId)));
  return account || null;
}

export async function createBankAccount(
  db: Database,
  companyId: string,
  input: z.infer<typeof createBankAccountSchema>
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
  input: z.infer<typeof createBankAccountSchema>
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
    .where(and(eq(bankAccounts.id, bankAccountId), eq(bankAccounts.companyId, companyId)))
    .returning();

  if (!account) throw new Error('Bank account not found');
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
  filters: TransactionFilters
): Promise<{ data: TransactionWithMatch[]; total: number; page: number; pageSize: number; totalPages: number }> {
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 50;

  // Verify bank account belongs to company
  const bankAccount = await getBankAccount(db, companyId, filters.bankAccountId);
  if (!bankAccount) throw new Error('Bank account not found');

  const conditions = [eq(bankTransactions.bankAccountId, filters.bankAccountId)];

  if (filters.isReconciled !== undefined) {
    conditions.push(eq(bankTransactions.isReconciled, filters.isReconciled));
  }
  if (filters.search) {
    conditions.push(
      sql`(${bankTransactions.description} ILIKE ${`%${filters.search}%`} OR ${bankTransactions.reference} ILIKE ${`%${filters.search}%`})`
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
    .leftJoin(documents, eq(bankTransactions.reconciledDocumentId, documents.id))
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

  return { data, total: count, page, pageSize, totalPages: Math.ceil(count / pageSize) };
}

/**
 * Import bank transactions from parsed CSV data.
 */
export async function importTransactions(
  db: Database,
  companyId: string,
  bankAccountId: string,
  transactions: z.infer<typeof importTransactionSchema>[]
): Promise<{ imported: number }> {
  const bankAccount = await getBankAccount(db, companyId, bankAccountId);
  if (!bankAccount) throw new Error('Bank account not found');

  const values = transactions.map((t) => ({
    bankAccountId,
    date: new Date(t.date),
    description: t.description || null,
    reference: t.reference || null,
    amount: t.amount,
    balance: t.balance || null,
  }));

  if (values.length === 0) return { imported: 0 };

  await db.insert(bankTransactions).values(values);

  // Update bank account balance to the last imported transaction's balance
  const lastBalance = transactions[transactions.length - 1].balance;
  if (lastBalance) {
    await db
      .update(bankAccounts)
      .set({ balance: lastBalance, lastSyncAt: new Date() })
      .where(and(
        eq(bankAccounts.id, bankAccountId),
        eq(bankAccounts.companyId, companyId)
      ));
  }

  return { imported: values.length };
}

/**
 * Reconcile a bank transaction with a document (invoice, purchase invoice, etc.)
 */
export async function reconcileTransaction(
  db: Database,
  companyId: string,
  transactionId: string,
  documentId: string
): Promise<BankTransaction> {
  // Verify transaction belongs to company's bank account
  const [txn] = await db
    .select({ transaction: bankTransactions, bankAccount: bankAccounts })
    .from(bankTransactions)
    .innerJoin(bankAccounts, eq(bankTransactions.bankAccountId, bankAccounts.id))
    .where(and(eq(bankTransactions.id, transactionId), eq(bankAccounts.companyId, companyId)));

  if (!txn) throw new Error('Transaction not found');
  if (txn.transaction.isReconciled) throw new Error('Transaction is already reconciled');

  // Verify document belongs to company
  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, documentId), eq(documents.companyId, companyId)));

  if (!doc) throw new Error('Document not found');

  const [updated] = await db
    .update(bankTransactions)
    .set({
      isReconciled: true,
      reconciledDocumentId: documentId,
      reconciledAt: new Date(),
    })
    .where(eq(bankTransactions.id, transactionId))
    .returning();

  // Auto-record payment (idempotent — skips if bankTransactionId already used)
  try {
    const txnAmount = new Decimal(txn.transaction.amount).abs();
    await recordPayment(db, companyId, documentId, {
      amount: txnAmount.toFixed(2),
      date: txn.transaction.date.toISOString().split('T')[0],
      method: 'bank_transfer',
      reference: txn.transaction.reference || `Bank tx ${transactionId}`,
      bankTransactionId: transactionId,
    });
  } catch (e) {
    // Payment may fail if document is in draft/cancelled — log but don't fail reconciliation
    logger.error('Auto-payment from reconciliation failed', e);
  }

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
  transactionId: string
): Promise<{ documentId: string; documentNumber: string } | null> {
  const txn = await db.query.bankTransactions.findFirst({
    where: (bankTransactions, { eq }) => eq(bankTransactions.id, transactionId),
    with: { bankAccount: true },
  });

  if (!txn) throw new Error('Transaction not found');
  if (txn.bankAccount.companyId !== companyId) throw new Error('Unauthorized');
  if (txn.isReconciled) throw new Error('Transaction already reconciled');

  const PAYABLE_STATUSES = sql`${documents.status} IN ('sent', 'confirmed', 'delivered', 'partially_paid', 'overdue', 'dunning_1', 'dunning_2', 'dunning_3')`;

  // 1. QR reference match
  let matchedDoc = null;
  if (txn.reference) {
    matchedDoc = await db.query.documents.findFirst({
      where: (documents, { eq, and, sql: sqlFn }) =>
        and(
          eq(documents.companyId, companyId),
          eq(documents.type, 'invoice'),
          sqlFn`${documents.qrReference} IS NOT NULL AND ${txn.reference} LIKE '%' || ${documents.qrReference} || '%'`,
          PAYABLE_STATUSES
        ),
    });
  }

  // 2. Exact amount match (within 0.01 CHF tolerance)
  if (!matchedDoc) {
    const txnAmountAbs = new Decimal(txn.amount).abs().toString();
    matchedDoc = await db.query.documents.findFirst({
      where: (documents, { eq, and, sql: sqlFn }) =>
        and(
          eq(documents.companyId, companyId),
          eq(documents.type, 'invoice'),
          sqlFn`ABS(CAST(${documents.total} AS DECIMAL) - CAST(${txnAmountAbs} AS DECIMAL)) < 0.01`,
          PAYABLE_STATUSES
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
  transactionId: string
): Promise<BankTransaction> {
  const [txn] = await db
    .select({ transaction: bankTransactions, bankAccount: bankAccounts })
    .from(bankTransactions)
    .innerJoin(bankAccounts, eq(bankTransactions.bankAccountId, bankAccounts.id))
    .where(and(eq(bankTransactions.id, transactionId), eq(bankAccounts.companyId, companyId)));

  if (!txn) throw new Error('Transaction not found');

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
 */
export async function autoMatchTransactions(
  db: Database,
  companyId: string,
  bankAccountId: string
): Promise<{ matched: number }> {
  const bankAccount = await getBankAccount(db, companyId, bankAccountId);
  if (!bankAccount) throw new Error('Bank account not found');

  // Get unreconciled incoming transactions (positive amounts)
  const unreconciledTxns = await db
    .select()
    .from(bankTransactions)
    .where(
      and(
        eq(bankTransactions.bankAccountId, bankAccountId),
        eq(bankTransactions.isReconciled, false),
        sql`CAST(${bankTransactions.amount} AS DECIMAL) > 0`
      )
    );

  // Get open invoices
  const openInvoices = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.companyId, companyId),
        eq(documents.type, 'invoice'),
        sql`${documents.status} IN ('sent', 'confirmed', 'delivered', 'partially_paid', 'overdue', 'dunning_1', 'dunning_2', 'dunning_3')`
      )
    );

  let matched = 0;

  for (const txn of unreconciledTxns) {
    const txnAmount = new Decimal(txn.amount);

    // Try matching by QR reference
    if (txn.reference) {
      const matchByRef = openInvoices.find(
        (inv) => inv.qrReference && txn.reference!.includes(inv.qrReference)
      );
      if (matchByRef) {
        await reconcileTransaction(db, companyId, txn.id, matchByRef.id);
        matched++;
        continue;
      }
    }

    // Try matching by exact amount
    const matchByAmount = openInvoices.find(
      (inv) => new Decimal(inv.total!).minus(txnAmount).abs().lt('0.01')
    );
    if (matchByAmount) {
      await reconcileTransaction(db, companyId, txn.id, matchByAmount.id);
      // Remove from candidates so we don't double-match
      const idx = openInvoices.indexOf(matchByAmount);
      openInvoices.splice(idx, 1);
      matched++;
    }
  }

  return { matched };
}

/**
 * Get bank reconciliation summary.
 */
export async function getReconciliationSummary(
  db: Database,
  companyId: string,
  bankAccountId: string
): Promise<{
  totalTransactions: number;
  reconciled: number;
  unreconciled: number;
  totalUnreconciledAmount: number;
}> {
  const bankAccount = await getBankAccount(db, companyId, bankAccountId);
  if (!bankAccount) throw new Error('Bank account not found');

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
