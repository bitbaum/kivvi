import Decimal from "decimal.js";
import type { Database } from "@kivvi/database";
import { createAutoJournalEntry } from "./accounting";

/**
 * Swiss KMU Kontenrahmen account mappings for automatic journal entries.
 * Config-driven: change account codes here, not in business logic.
 */
const ACCOUNT_MAPPINGS = {
  // Sales invoice sent
  invoiceSent: {
    debitAccount: "1100", // Debitoren (Accounts Receivable)
    revenueAccount: "3000", // Warenertrag (Revenue)
    vatAccount: "2200", // Geschuldete MWSt (VAT Payable)
  },
  // Sales credit note sent (reversal of invoice)
  creditNoteSent: {
    debitAccount: "3000", // Warenertrag (Revenue reduction)
    creditAccount: "1100", // Debitoren (AR reduction)
    vatAccount: "2200", // Geschuldete MWSt (VAT reversal)
  },
  // Payment received for sales invoice
  paymentReceived: {
    debitAccount: "1020", // Bank
    creditAccount: "1100", // Debitoren
  },
  // Purchase invoice confirmed
  purchaseInvoiceConfirmed: {
    expenseAccount: "4000", // Warenaufwand (COGS/Expense)
    creditAccount: "2000", // Kreditoren (Accounts Payable)
    vatAccount: "1170", // Vorsteuer (Input VAT)
  },
  // Payment made for purchase invoice
  paymentMade: {
    debitAccount: "2000", // Kreditoren
    creditAccount: "1020", // Bank
  },
} as const;

/**
 * Create journal entry when a sales invoice is sent.
 * Debit: 1100 Debitoren, Credit: 3000 Warenertrag + 2200 MWSt
 */
export async function createInvoiceSentJournalEntry(
  db: Database,
  companyId: string,
  doc: {
    id: string;
    number: string;
    total: string;
    vatAmount: string;
    subtotal: string;
    issueDate: Date;
  },
) {
  const { debitAccount, revenueAccount, vatAccount } =
    ACCOUNT_MAPPINGS.invoiceSent;

  const lines: Array<{
    accountCode: string;
    debit?: string;
    credit?: string;
    description?: string;
  }> = [
    {
      accountCode: debitAccount,
      debit: doc.total,
      description: `Invoice ${doc.number}`,
    },
    {
      accountCode: revenueAccount,
      credit: doc.subtotal,
      description: `Revenue ${doc.number}`,
    },
  ];

  if (new Decimal(doc.vatAmount).gt(0)) {
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
    sourceType: "invoice_sent",
    sourceId: doc.id,
    lines,
  });
}

/**
 * Create journal entry when a sales credit note is sent.
 * Reversal of the invoice entry: Debit 3000 Revenue, Credit 1100 Debitoren + 2200 VAT
 */
export async function createCreditNoteSentJournalEntry(
  db: Database,
  companyId: string,
  doc: {
    id: string;
    number: string;
    total: string;
    vatAmount: string;
    subtotal: string;
    issueDate: Date;
  },
) {
  const { debitAccount, creditAccount, vatAccount } =
    ACCOUNT_MAPPINGS.creditNoteSent;

  const lines: Array<{
    accountCode: string;
    debit?: string;
    credit?: string;
    description?: string;
  }> = [
    {
      accountCode: debitAccount,
      debit: doc.subtotal,
      description: `Credit note ${doc.number}`,
    },
    {
      accountCode: creditAccount,
      credit: doc.total,
      description: `Credit note ${doc.number}`,
    },
  ];

  if (new Decimal(doc.vatAmount).gt(0)) {
    lines.push({
      accountCode: vatAccount,
      debit: doc.vatAmount,
      description: `MWSt Korrektur ${doc.number}`,
    });
  }

  return createAutoJournalEntry(db, companyId, {
    date: doc.issueDate,
    reference: doc.number,
    description: `Credit note sent: ${doc.number}`,
    sourceType: "credit_note_sent",
    sourceId: doc.id,
    lines,
  });
}

/**
 * Create reversing journal entry when an invoice or purchase invoice is cancelled.
 * Reverses the original entry by swapping debits and credits.
 */
export async function createCancellationReversalJournalEntry(
  db: Database,
  companyId: string,
  doc: {
    id: string;
    number: string;
    type: string;
    total: string;
    vatAmount: string;
    subtotal: string;
    issueDate: Date;
  },
) {
  if (doc.type === "invoice") {
    // Reverse invoice sent: Debit Revenue + VAT, Credit AR
    const { debitAccount, revenueAccount, vatAccount } =
      ACCOUNT_MAPPINGS.invoiceSent;
    const lines: Array<{
      accountCode: string;
      debit?: string;
      credit?: string;
      description?: string;
    }> = [
      {
        accountCode: debitAccount,
        credit: doc.total,
        description: `Cancel ${doc.number}`,
      },
      {
        accountCode: revenueAccount,
        debit: doc.subtotal,
        description: `Cancel ${doc.number}`,
      },
    ];
    if (new Decimal(doc.vatAmount).gt(0)) {
      lines.push({
        accountCode: vatAccount,
        debit: doc.vatAmount,
        description: `MWSt Storno ${doc.number}`,
      });
    }
    return createAutoJournalEntry(db, companyId, {
      date: new Date(),
      reference: doc.number,
      description: `Invoice cancelled: ${doc.number}`,
      sourceType: "invoice_cancelled",
      sourceId: doc.id,
      lines,
    });
  }

  if (doc.type === "purchase_invoice") {
    // Reverse purchase confirmed: Debit AP, Credit Expense + VAT
    const { expenseAccount, creditAccount, vatAccount } =
      ACCOUNT_MAPPINGS.purchaseInvoiceConfirmed;
    const lines: Array<{
      accountCode: string;
      debit?: string;
      credit?: string;
      description?: string;
    }> = [
      {
        accountCode: expenseAccount,
        credit: doc.subtotal,
        description: `Cancel ${doc.number}`,
      },
      {
        accountCode: creditAccount,
        debit: doc.total,
        description: `Cancel ${doc.number}`,
      },
    ];
    if (new Decimal(doc.vatAmount).gt(0)) {
      lines.push({
        accountCode: vatAccount,
        credit: doc.vatAmount,
        description: `Vorsteuer Storno ${doc.number}`,
      });
    }
    return createAutoJournalEntry(db, companyId, {
      date: new Date(),
      reference: doc.number,
      description: `Purchase invoice cancelled: ${doc.number}`,
      sourceType: "purchase_invoice_cancelled",
      sourceId: doc.id,
      lines,
    });
  }
}

/**
 * Create journal entry when a payment is received for a sales invoice.
 * Debit: 1020 Bank, Credit: 1100 Debitoren
 */
export async function createPaymentReceivedJournalEntry(
  db: Database,
  companyId: string,
  doc: { id: string; number: string; type: string },
  payment: { amount: string; date: Date },
) {
  const isSales = doc.type === "invoice";
  const mapping = isSales
    ? ACCOUNT_MAPPINGS.paymentReceived
    : ACCOUNT_MAPPINGS.paymentMade;

  return createAutoJournalEntry(db, companyId, {
    date: payment.date,
    reference: doc.number,
    description: `Payment ${isSales ? "received" : "made"}: ${doc.number}`,
    sourceType: "payment",
    sourceId: doc.id,
    lines: [
      {
        accountCode: mapping.debitAccount,
        debit: payment.amount,
        description: `Payment ${doc.number}`,
      },
      {
        accountCode: mapping.creditAccount,
        credit: payment.amount,
        description: `Payment ${doc.number}`,
      },
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
  doc: {
    id: string;
    number: string;
    total: string;
    vatAmount: string;
    subtotal: string;
    issueDate: Date;
  },
) {
  const { expenseAccount, creditAccount, vatAccount } =
    ACCOUNT_MAPPINGS.purchaseInvoiceConfirmed;

  const lines: Array<{
    accountCode: string;
    debit?: string;
    credit?: string;
    description?: string;
  }> = [
    {
      accountCode: expenseAccount,
      debit: doc.subtotal,
      description: `Purchase ${doc.number}`,
    },
    {
      accountCode: creditAccount,
      credit: doc.total,
      description: `Purchase ${doc.number}`,
    },
  ];

  if (new Decimal(doc.vatAmount).gt(0)) {
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
    sourceType: "purchase_invoice_confirmed",
    sourceId: doc.id,
    lines,
  });
}
