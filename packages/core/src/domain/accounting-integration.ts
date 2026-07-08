import { z } from "zod";
import Decimal from "decimal.js";
import { eq } from "drizzle-orm";
import type { Database } from "@kivvi/database";
import { documentItems, products } from "@kivvi/database";
import { createAutoJournalEntry } from "./accounting";
import { ACCOUNT_MAPPINGS } from "../config/account-mappings";

/** Validation for recording a consignor payout (Dr 2140 / Cr 1020). */
export const recordConsignorPayoutSchema = z.object({
  // Positive decimal string, e.g. "70.00" — never a float (Ground Truth #2).
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Amount must be a decimal like 70.00")
    .refine((v) => new Decimal(v).gt(0), "Amount must be greater than 0"),
  date: z.string().min(1, "Date is required"),
  reference: z.string().min(1, "Reference is required"),
  description: z.string().optional(),
});

export type RecordConsignorPayoutInput = z.infer<
  typeof recordConsignorPayoutSchema
>;

/**
 * Domain wrapper: validate input and post a consignor payout journal entry.
 * Thin boundary over createConsignorPayoutJournalEntry so the Server Action
 * stays free of business logic.
 */
export async function recordConsignorPayout(
  db: Database,
  companyId: string,
  input: unknown,
) {
  const validated = recordConsignorPayoutSchema.parse(input);
  return createConsignorPayoutJournalEntry(db, companyId, {
    reference: validated.reference,
    date: new Date(validated.date),
    amount: validated.amount,
    description: validated.description,
  });
}

export function buildInvoiceRevenueLines(
  items: Array<{ total: string; productType: "product" | "service" | null }>,
  fallbackSubtotal: string,
): Array<{ accountCode: string; credit: string; description?: string }> {
  const { revenueAccount, serviceRevenueAccount } =
    ACCOUNT_MAPPINGS.invoiceSent;
  const totalsByAccount = new Map<string, Decimal>();

  if (items.length === 0) {
    totalsByAccount.set(revenueAccount, new Decimal(fallbackSubtotal || "0"));
  } else {
    for (const item of items) {
      const accountCode =
        item.productType === "service" ? serviceRevenueAccount : revenueAccount;
      totalsByAccount.set(
        accountCode,
        (totalsByAccount.get(accountCode) ?? new Decimal(0)).plus(
          item.total || "0",
        ),
      );
    }
  }

  return Array.from(totalsByAccount.entries())
    .filter(([, amount]) => amount.gt(0))
    .map(([accountCode, amount]) => ({
      accountCode,
      credit: amount.toFixed(2),
      description:
        accountCode === serviceRevenueAccount ? "Service revenue" : "Revenue",
    }));
}
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
  const { debitAccount, vatAccount } = ACCOUNT_MAPPINGS.invoiceSent;

  const itemRows = await db
    .select({
      total: documentItems.total,
      productType: products.type,
    })
    .from(documentItems)
    .leftJoin(products, eq(documentItems.productId, products.id))
    .where(eq(documentItems.documentId, doc.id));

  const revenueLines = buildInvoiceRevenueLines(itemRows, doc.subtotal).map(
    (line) => ({
      ...line,
      description: `${line.description} ${doc.number}`,
    }),
  );

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
    ...revenueLines,
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
 * Create journal entry recognizing a consignor's share when consigned goods
 * are sold (principal model — tenant sells in its own name).
 *
 * This is ADDITIVE to the invoice-sent entry. Revenue and VAT are untouched;
 * this only splits out the portion of the net sale owed to the consignor as
 * cost-of-goods (Dr 4200) and a payable liability (Cr 2140).
 *
 * No-op when consignorShare <= 0 (normal, non-consigned sales).
 */
export async function createConsignmentSettlementJournalEntry(
  db: Database,
  companyId: string,
  input: {
    saleDocId: string;
    reference: string;
    date: Date;
    consignorShare: string;
    itemNumbers: string[];
  },
) {
  // Skip when there is nothing owed to a consignor.
  if (new Decimal(input.consignorShare || "0").lte(0)) {
    return undefined;
  }

  const { expenseAccount, liabilityAccount } =
    ACCOUNT_MAPPINGS.consignmentSettlement;

  const itemLabel =
    input.itemNumbers.length > 0 ? ` (${input.itemNumbers.join(", ")})` : "";

  return createAutoJournalEntry(db, companyId, {
    date: input.date,
    reference: input.reference,
    description: `Consignment settlement: ${input.reference}${itemLabel}`,
    sourceType: "consignment_settlement",
    sourceId: input.saleDocId,
    lines: [
      {
        accountCode: expenseAccount,
        debit: input.consignorShare,
        description: `Consignor share ${input.reference}`,
      },
      {
        accountCode: liabilityAccount,
        credit: input.consignorShare,
        description: `Payable to consignor ${input.reference}`,
      },
    ],
  });
}

/**
 * Create journal entry settling a consignor payable from the bank.
 * Debit: 2140 Übrige kurzfristige Verbindlichkeiten, Credit: 1020 Bank
 */
export async function createConsignorPayoutJournalEntry(
  db: Database,
  companyId: string,
  input: {
    reference: string;
    date: Date;
    amount: string;
    description?: string;
  },
) {
  const { debitAccount, creditAccount } = ACCOUNT_MAPPINGS.consignorPayout;

  return createAutoJournalEntry(db, companyId, {
    date: input.date,
    reference: input.reference,
    description: input.description || `Consignor payout: ${input.reference}`,
    sourceType: "consignor_payout",
    sourceId: input.reference,
    lines: [
      {
        accountCode: debitAccount,
        debit: input.amount,
        description: `Consignor payout ${input.reference}`,
      },
      {
        accountCode: creditAccount,
        credit: input.amount,
        description: `Consignor payout ${input.reference}`,
      },
    ],
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
