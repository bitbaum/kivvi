"use server";

import {
  importOpeningBalances,
  importOpenItems,
  reconcileOpenItems,
  getAccountStatement,
} from "@kivvi/core";
import { getTranslations } from "next-intl/server";
import { createAction } from "./action-factory";

/** Swiss number: strip thousands apostrophes/spaces → plain decimal string. */
function cleanNum(v: string | undefined): string | undefined {
  if (!v) return undefined;
  const cleaned = v.replace(/['\s]/g, "").replace(/,/g, ".");
  return cleaned === "" ? undefined : cleaned;
}

/** DD.MM.YYYY → YYYY-MM-DD; pass through anything already ISO-ish. */
function toIsoDate(v: string | undefined): string {
  if (!v) return "";
  const m = v.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) {
    const [, d, mo, y] = m;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return v.trim();
}

/** Split a pasted row on tab / semicolon / comma. */
function cells(line: string): string[] {
  return line.split(/[\t;,]/).map((s) => s.trim());
}

function nonEmptyLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

/**
 * Import opening balances from a pasted trial balance.
 * Format per line: accountCode <sep> debit <sep> credit  (Swiss numbers OK).
 * Header/non-account rows (first cell not starting with a digit) are skipped.
 */
export const importOpeningBalancesAction = createAction<
  { date: string; text: string },
  { lineCount: number }
>({
  handler: async ({ date, text }, { companyId, db }) => {
    const lines = nonEmptyLines(text)
      .map((line) => {
        const [code, debit, credit] = cells(line);
        return {
          accountCode: code,
          debit: cleanNum(debit),
          credit: cleanNum(credit),
        };
      })
      .filter((l) => /^\d/.test(l.accountCode));
    await importOpeningBalances(db, companyId, { date, lines });
    return { lineCount: lines.length };
  },
  revalidate: ["/accounting/journal", "/accounting"],
  errorMessage: () =>
    getTranslations("settings").then((t) => t("cutover.openingError")),
  minRole: "admin",
  translateDomainErrors: true,
});

const CONTROL_ACCOUNT: Record<string, string> = {
  invoice: "1100", // Debitoren
  purchase_invoice: "2000", // Kreditoren
};

/**
 * Import open AR/AP as carried-forward documents (no journal), then reconcile
 * the total against the control account's balance from the opening entry.
 * Format per line: number <sep> contactName <sep> issueDate <sep> dueDate <sep> openAmount
 */
export const importOpenItemsAction = createAction<
  { type: "invoice" | "purchase_invoice"; text: string },
  {
    imported: number;
    totalOpen: string;
    control: string;
    matches: boolean;
    delta: string;
  }
>({
  handler: async ({ type, text }, { companyId, db }) => {
    const items = nonEmptyLines(text)
      .map((line) => {
        const [number, contactName, issueDate, dueDate, openAmount] =
          cells(line);
        return {
          number,
          contactName,
          issueDate: toIsoDate(issueDate),
          dueDate: dueDate ? toIsoDate(dueDate) : null,
          openAmount: cleanNum(openAmount) ?? "0",
        };
      })
      .filter((i) => i.number && i.contactName);

    const result = await importOpenItems(db, companyId, { type, items });

    // Reconcile the imported total against the control account balance.
    const year = new Date().getFullYear();
    let control = "0.00";
    try {
      const stmt = await getAccountStatement(db, companyId, {
        accountCode: CONTROL_ACCOUNT[type],
        dateFrom: "2000-01-01",
        dateTo: `${year}-12-31`,
      });
      control = stmt.closingBalance;
    } catch {
      control = "0.00";
    }
    const rec = reconcileOpenItems(result.totalOpen, control);
    return {
      imported: result.imported,
      totalOpen: result.totalOpen,
      control: rec.control,
      matches: rec.matches,
      delta: rec.delta,
    };
  },
  revalidate: ["/contacts", "/invoices"],
  errorMessage: () =>
    getTranslations("settings").then((t) => t("cutover.openItemsError")),
  minRole: "admin",
  translateDomainErrors: true,
});
