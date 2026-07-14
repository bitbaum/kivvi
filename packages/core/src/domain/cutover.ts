/**
 * Cutover mechanics — bring a company live on Kivvi from a prior system by
 * importing opening balances (trial balance → one balanced opening entry) and
 * reconciling open items against the ledger. See CUTOVER_MECHANICS_SPEC.md.
 *
 * NOTE: the open-AR/AP carried-forward *document* import (documents with
 * `isCarriedForward = true` and NO journal entry) is a follow-on that builds on
 * the documents domain; the opening-balance entry + reconciliation gate below
 * are the load-bearing correctness pieces.
 */
import { z } from "zod";
import Decimal from "decimal.js";
import { documents } from "@kivvi/database";
import type { Database } from "@kivvi/database";
import { createAutoJournalEntry } from "./accounting";
import { resolveOrCreateContact } from "./contacts";
import { DomainError } from "../domain-error";

export const openingBalanceLineSchema = z.object({
  accountCode: z.string().trim().min(1),
  debit: z.string().optional().nullable(),
  credit: z.string().optional().nullable(),
});

export const importOpeningBalancesSchema = z.object({
  /** Cutover date (start of the first open period in Kivvi). */
  date: z.string().min(1),
  /** One entry per account from the source trial balance. */
  lines: z.array(openingBalanceLineSchema).min(1),
});

/**
 * Import a trial-balance snapshot as ONE balanced opening journal entry
 * (sourceType `opening_balance`), posted immutably (A1). Fails loudly if the
 * source doesn't balance — never creates unbalanced opening books.
 */
export async function importOpeningBalances(
  db: Database,
  companyId: string,
  input: z.infer<typeof importOpeningBalancesSchema>,
) {
  const data = importOpeningBalancesSchema.parse(input);

  let totalDebit = new Decimal(0);
  let totalCredit = new Decimal(0);
  const lines: Array<{ accountCode: string; debit?: string; credit?: string }> =
    [];

  for (const l of data.lines) {
    const d = new Decimal(l.debit || "0");
    const c = new Decimal(l.credit || "0");
    if (d.eq(0) && c.eq(0)) continue; // skip zero-balance accounts
    totalDebit = totalDebit.plus(d);
    totalCredit = totalCredit.plus(c);
    lines.push({
      accountCode: l.accountCode,
      debit: d.gt(0) ? d.toFixed(2) : undefined,
      credit: c.gt(0) ? c.toFixed(2) : undefined,
    });
  }

  if (!totalDebit.equals(totalCredit)) {
    throw new DomainError(
      "openingBalanceUnbalanced",
      { debits: totalDebit.toFixed(2), credits: totalCredit.toFixed(2) },
      `Opening balances must balance. Debits ${totalDebit.toFixed(2)} ≠ Credits ${totalCredit.toFixed(2)}.`,
    );
  }
  if (lines.length === 0) {
    throw new DomainError(
      "openingBalanceEmpty",
      undefined,
      "No non-zero opening balances to import.",
    );
  }

  // createAutoJournalEntry validates that every accountCode exists and that the
  // entry balances, then posts it immutably as sequence 1's genesis-anchored
  // opening entry.
  return createAutoJournalEntry(db, companyId, {
    date: new Date(data.date),
    reference: "Eröffnungsbilanz",
    description: "Opening balances (cutover import)",
    sourceType: "opening_balance",
    sourceId: companyId,
    lines,
  });
}

export const openItemSchema = z.object({
  number: z.string().trim().min(1),
  contactName: z.string().trim().min(1),
  contactEmail: z.string().email().optional().nullable(),
  issueDate: z.string().min(1),
  dueDate: z.string().optional().nullable(),
  /** Outstanding amount (what's still open), decimal string. */
  openAmount: z.string(),
});

export const importOpenItemsSchema = z.object({
  type: z.enum(["invoice", "purchase_invoice"]),
  items: z.array(openItemSchema).min(1),
  /** Cutover moment used to derive overdue status. Defaults to issue-based. */
  asOf: z.string().optional(),
});

/**
 * Import open AR/AP as carried-forward documents (header-level, original
 * numbers preserved), each with `isCarriedForward = true` and **NO journal
 * entry** — the 1100/2000 aggregate is already in the opening-balance entry, so
 * booking these would double-count. They exist so dunning + CAMT matching work
 * post-cutover. Reconcile the returned totalOpen against the control balance
 * with reconcileOpenItems before going live.
 */
export async function importOpenItems(
  db: Database,
  companyId: string,
  input: z.infer<typeof importOpenItemsSchema>,
): Promise<{ imported: number; totalOpen: string }> {
  const data = importOpenItemsSchema.parse(input);
  const asOf = data.asOf ? new Date(data.asOf) : new Date();

  return db.transaction(async (tx) => {
    let total = new Decimal(0);
    let imported = 0;
    for (const it of data.items) {
      const open = new Decimal(it.openAmount || "0");
      if (open.lte(0)) continue;
      const contactId = await resolveOrCreateContact(
        tx,
        companyId,
        it.contactName,
        it.contactEmail ?? undefined,
      );
      const due = it.dueDate ? new Date(it.dueDate) : null;
      const status = due && due < asOf ? "overdue" : "sent";
      await tx.insert(documents).values({
        companyId,
        type: data.type,
        number: it.number,
        contactId,
        issueDate: new Date(it.issueDate),
        dueDate: due,
        subtotal: open.toFixed(2),
        vatAmount: "0",
        total: open.toFixed(2),
        status,
        isCarriedForward: true,
        internalNotes: "Carried forward (cutover import)",
      });
      total = total.plus(open);
      imported += 1;
    }
    return { imported, totalOpen: total.toFixed(2) };
  });
}

export interface ReconciliationResult {
  matches: boolean;
  sum: string;
  control: string;
  delta: string;
}

/**
 * Pure reconciliation gate: the sum of imported open items (AR or AP) must equal
 * the corresponding control account's opening balance (1100 / 2000). A non-zero
 * delta means the opening-balance and open-items imports disagree — block go-live.
 */
export function reconcileOpenItems(
  sumOpenItems: string,
  controlBalance: string,
  tolerance = "0.005",
): ReconciliationResult {
  const sum = new Decimal(sumOpenItems || "0");
  const control = new Decimal(controlBalance || "0");
  const delta = sum.minus(control);
  return {
    matches: delta.abs().lte(tolerance),
    sum: sum.toFixed(2),
    control: control.toFixed(2),
    delta: delta.toFixed(2),
  };
}
