"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  createBankAccount,
  updateBankAccount,
  importTransactions,
  reconcileTransaction,
  unreconcileTransaction,
  autoMatchTransactions,
  createBankAccountSchema,
  importTransactionSchema,
  importCamtStatement,
  parseCamtXml,
  normalizeIban,
  getBankAccount,
} from "@kivvi/core";
import { z } from "zod";
import {
  type ActionResult,
  getSession,
  requireRole,
  safeErrorMessage,
} from "./utils";
import { createAction } from "./action-factory";
import { getTranslations } from "next-intl/server";

// ============================================================================
// BANK ACCOUNTS
// ============================================================================

export const createBankAccountAction = createAction<unknown, unknown>({
  handler: async (input, { companyId, db }) => {
    const parsed = createBankAccountSchema.safeParse(input);
    if (!parsed.success)
      throw new Error(parsed.error.errors[0]?.message || "Invalid input");
    return createBankAccount(db, companyId, parsed.data);
  },
  revalidate: ["/banking"],
  errorMessage: "Failed to create bank account",
  minRole: "member",
});

export const updateBankAccountAction = createAction<
  { bankAccountId: string; input: unknown },
  unknown
>({
  handler: async ({ bankAccountId, input }, { companyId, db }) => {
    const parsed = createBankAccountSchema.safeParse(input);
    if (!parsed.success)
      throw new Error(parsed.error.errors[0]?.message || "Invalid input");
    return updateBankAccount(db, companyId, bankAccountId, parsed.data);
  },
  revalidate: ["/banking"],
  errorMessage: "Failed to update bank account",
  minRole: "member",
});

// ============================================================================
// TRANSACTIONS
// ============================================================================

export async function importTransactionsAction(
  bankAccountId: string,
  transactions: unknown[],
): Promise<ActionResult<{ imported: number; skippedDuplicates: number }>> {
  const t = await getTranslations("banking");
  try {
    const { companyId } = await requireRole("member");
    const parsed = z.array(importTransactionSchema).safeParse(transactions);
    if (!parsed.success) {
      return { success: false, error: t("errorInvalidTransactionData") };
    }
    const result = await db.transaction(async (tx) => {
      return importTransactions(tx, companyId, bankAccountId, parsed.data);
    });
    revalidatePath("/banking");
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorImportTransactions")),
    };
  }
}

// ============================================================================
// CAMT IMPORT
// ============================================================================

export interface CamtPreview {
  messageType: "camt.053" | "camt.054";
  accountIban: string | null;
  ibanMatch: boolean;
  openingBalance: { amount: string; currency: string } | null;
  closingBalance: { amount: string; currency: string } | null;
  totalEntries: number;
  entries: {
    bookingDate: string;
    amount: string;
    currency: string;
    description: string;
    reference: string | null;
    debtorName: string | null;
    creditorName: string | null;
  }[];
}

export async function parseCamtAction(
  bankAccountId: string,
  xmlContent: string,
): Promise<ActionResult<CamtPreview>> {
  const t = await getTranslations("banking");
  try {
    const { companyId } = await getSession();
    const statement = parseCamtXml(xmlContent);

    const bankAccount = await getBankAccount(db, companyId, bankAccountId);
    if (!bankAccount)
      return { success: false, error: t("errorAccountNotFound") };

    let ibanMatch = true;
    if (statement.accountIban && bankAccount.iban) {
      ibanMatch =
        normalizeIban(statement.accountIban) ===
        normalizeIban(bankAccount.iban);
    }

    return {
      success: true,
      data: {
        messageType: statement.messageType,
        accountIban: statement.accountIban,
        ibanMatch,
        openingBalance: statement.openingBalance
          ? {
              amount: statement.openingBalance.amount,
              currency: statement.openingBalance.currency,
            }
          : null,
        closingBalance: statement.closingBalance
          ? {
              amount: statement.closingBalance.amount,
              currency: statement.closingBalance.currency,
            }
          : null,
        totalEntries: statement.entries.length,
        entries: statement.entries.map((e) => ({
          bookingDate: e.bookingDate,
          amount: e.amount,
          currency: e.currency,
          description: e.description,
          reference: e.reference,
          debtorName: e.debtorName,
          creditorName: e.creditorName,
        })),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorParseCamt")),
    };
  }
}

export async function importCamtAction(
  bankAccountId: string,
  xmlContent: string,
): Promise<
  ActionResult<{
    imported: number;
    skippedDuplicates: number;
    totalEntries: number;
  }>
> {
  const t = await getTranslations("banking");
  try {
    const { companyId } = await requireRole("member");
    const result = await db.transaction(async (tx) => {
      return importCamtStatement(tx, companyId, bankAccountId, xmlContent);
    });
    revalidatePath("/banking");
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorImportCamt")),
    };
  }
}

export const reconcileTransactionAction = createAction<
  { transactionId: string; documentId: string },
  unknown
>({
  handler: async ({ transactionId, documentId }, { companyId, db }) => {
    return reconcileTransaction(db, companyId, transactionId, documentId);
  },
  revalidate: ["/banking"],
  errorMessage: "Failed to reconcile transaction",
  minRole: "member",
});

export const unreconcileTransactionAction = createAction<string, unknown>({
  handler: async (transactionId, { companyId, db }) => {
    return unreconcileTransaction(db, companyId, transactionId);
  },
  revalidate: ["/banking"],
  errorMessage: "Failed to unreconcile transaction",
  minRole: "member",
});

export const autoMatchTransactionsAction = createAction<
  string,
  { matched: number; total: number }
>({
  handler: async (bankAccountId, { companyId, db }) => {
    return autoMatchTransactions(db, companyId, bankAccountId);
  },
  revalidate: ["/banking"],
  errorMessage: "Failed to auto-match",
  minRole: "member",
});
