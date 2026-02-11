import type { Database } from '@kivvi/database';
import { createAutoJournalEntry } from './accounting';

/**
 * Swiss KMU Kontenrahmen account mappings for automatic journal entries.
 * Config-driven: change account codes here, not in business logic.
 */
const ACCOUNT_MAPPINGS = {
  // Sales invoice sent
  invoiceSent: {
    debitAccount: '1100', // Debitoren (Accounts Receivable)
    revenueAccount: '3000', // Warenertrag (Revenue)
    vatAccount: '2200', // Geschuldete MWSt (VAT Payable)
  },
  // Payment received for sales invoice
  paymentReceived: {
    debitAccount: '1020', // Bank
    creditAccount: '1100', // Debitoren
  },
  // Purchase invoice confirmed
  purchaseInvoiceConfirmed: {
    expenseAccount: '4000', // Warenaufwand (COGS/Expense)
    creditAccount: '2000', // Kreditoren (Accounts Payable)
    vatAccount: '1170', // Vorsteuer (Input VAT)
  },
  // Payment made for purchase invoice
  paymentMade: {
    debitAccount: '2000', // Kreditoren
    creditAccount: '1020', // Bank
  },
} as const;

/**
 * Create journal entry when a sales invoice is sent.
 * Debit: 1100 Debitoren, Credit: 3000 Warenertrag + 2200 MWSt
 */
export async function createInvoiceSentJournalEntry(
  db: Database,
  companyId: string,
  doc: { id: string; number: string; total: string; vatAmount: string; subtotal: string; issueDate: Date }
) {
  const { debitAccount, revenueAccount, vatAccount } = ACCOUNT_MAPPINGS.invoiceSent;
  const vatAmount = parseFloat(doc.vatAmount);

  const lines: Array<{ accountCode: string; debit?: string; credit?: string; description?: string }> = [
    { accountCode: debitAccount, debit: doc.total, description: `Invoice ${doc.number}` },
    { accountCode: revenueAccount, credit: doc.subtotal, description: `Revenue ${doc.number}` },
  ];

  if (vatAmount > 0) {
    lines.push({
      accountCode: vatAccount,
      credit: doc.vatAmount,
      description: `MWSt ${doc.number}`,
    });
  }

  return createAutoJournalEntry(db, companyId, {
    date: doc.issueDate,
    reference: doc.number,
    description: `Invoice sent: ${doc.number}`,
    sourceType: 'invoice_sent',
    sourceId: doc.id,
    lines,
  });
}

/**
 * Create journal entry when a payment is received for a sales invoice.
 * Debit: 1020 Bank, Credit: 1100 Debitoren
 */
export async function createPaymentReceivedJournalEntry(
  db: Database,
  companyId: string,
  doc: { id: string; number: string; type: string },
  payment: { amount: string; date: Date }
) {
  const isSales = !doc.type.startsWith('purchase');
  const mapping = isSales ? ACCOUNT_MAPPINGS.paymentReceived : ACCOUNT_MAPPINGS.paymentMade;

  return createAutoJournalEntry(db, companyId, {
    date: payment.date,
    reference: doc.number,
    description: `Payment ${isSales ? 'received' : 'made'}: ${doc.number}`,
    sourceType: 'payment',
    sourceId: doc.id,
    lines: [
      { accountCode: mapping.debitAccount, debit: payment.amount, description: `Payment ${doc.number}` },
      { accountCode: mapping.creditAccount, credit: payment.amount, description: `Payment ${doc.number}` },
    ],
  });
}

/**
 * Create journal entry when a purchase invoice is confirmed.
 * Debit: 4000 Warenaufwand + 1170 Vorsteuer, Credit: 2000 Kreditoren
 */
export async function createPurchaseInvoiceJournalEntry(
  db: Database,
  companyId: string,
  doc: { id: string; number: string; total: string; vatAmount: string; subtotal: string; issueDate: Date }
) {
  const { expenseAccount, creditAccount, vatAccount } = ACCOUNT_MAPPINGS.purchaseInvoiceConfirmed;
  const vatAmount = parseFloat(doc.vatAmount);

  const lines: Array<{ accountCode: string; debit?: string; credit?: string; description?: string }> = [
    { accountCode: expenseAccount, debit: doc.subtotal, description: `Purchase ${doc.number}` },
    { accountCode: creditAccount, credit: doc.total, description: `Purchase ${doc.number}` },
  ];

  if (vatAmount > 0) {
    lines.push({
      accountCode: vatAccount,
      debit: doc.vatAmount,
      description: `Vorsteuer ${doc.number}`,
    });
  }

  return createAutoJournalEntry(db, companyId, {
    date: doc.issueDate,
    reference: doc.number,
    description: `Purchase invoice confirmed: ${doc.number}`,
    sourceType: 'purchase_invoice_confirmed',
    sourceId: doc.id,
    lines,
  });
}
