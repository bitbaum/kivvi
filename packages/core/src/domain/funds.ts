/**
 * FER-21 fund accounting — the fund dimension, capital classification, and the
 * Fondsrechnung (Rechnung über die Veränderung des Kapitals). See
 * FER21_FUND_ACCOUNTING_SPEC.md.
 *
 * SCOPE: this file implements the fund master + reporting (fully deterministic,
 * "you and me"). The auto-posting of Zuweisung/Verwendung/Transfer is
 * Treuhänder-gated (exact routing/accounts pending) and lives outside this file.
 */
import { z } from "zod";
import Decimal from "decimal.js";
import { and, eq, sql } from "drizzle-orm";
import { funds, journalLines, journalEntries } from "@kivvi/database";
import type { Database, Fund, FundRestriction } from "@kivvi/database";

/** Which balance-sheet capital block a fund rolls into (FER-21). */
export function capitalBlockOf(
  restriction: FundRestriction,
): "fondskapital" | "organisationskapital" {
  return restriction === "extern_zweckgebunden" ? "fondskapital" : "organisationskapital";
}

export interface FundMovement {
  opening: string;
  zuweisungen: string; // additions (credits to the fund)
  verwendung: string; // uses (debits from the fund)
  closing: string;
}

/**
 * Pure Fondsrechnung movement for one fund: closing = opening + Zuweisungen −
 * Verwendung. Fund capital is credit-normal (equity), so credits are additions
 * and debits are uses.
 */
export function computeFundMovement(
  openingBalance: string,
  periodCredits: string,
  periodDebits: string,
): FundMovement {
  const opening = new Decimal(openingBalance || "0");
  const zuweisungen = new Decimal(periodCredits || "0");
  const verwendung = new Decimal(periodDebits || "0");
  const closing = opening.plus(zuweisungen).minus(verwendung);
  return {
    opening: opening.toFixed(2),
    zuweisungen: zuweisungen.toFixed(2),
    verwendung: verwendung.toFixed(2),
    closing: closing.toFixed(2),
  };
}

// ---- CRUD ----

export const createFundSchema = z.object({
  code: z.string().trim().min(1).max(60),
  name: z.string().trim().min(1).max(200),
  restrictionType: z
    .enum(["extern_zweckgebunden", "intern_gebunden", "frei"])
    .default("extern_zweckgebunden"),
  purpose: z.string().trim().max(1000).optional().nullable(),
  restrictedBy: z.string().trim().max(200).optional().nullable(),
  capitalAccountId: z.string().uuid().optional().nullable(),
  openingBalance: z
    .string()
    .regex(/^-?\d+(\.\d{1,2})?$/)
    .optional(),
});

export async function listFunds(db: Database, companyId: string): Promise<Fund[]> {
  return db.select().from(funds).where(eq(funds.companyId, companyId));
}

export async function createFund(
  db: Database,
  companyId: string,
  input: z.infer<typeof createFundSchema>,
): Promise<Fund> {
  const data = createFundSchema.parse(input);
  const [row] = await db
    .insert(funds)
    .values({ companyId, ...data })
    .returning();
  return row;
}

export interface FundStatementRow extends FundMovement {
  fundId: string;
  code: string;
  name: string;
  restrictionType: FundRestriction;
  capitalBlock: "fondskapital" | "organisationskapital";
}

/**
 * Fondsrechnung for a period: per active fund, opening (fund.openingBalance +
 * pre-period net) → Zuweisungen (period credits) → Verwendung (period debits) →
 * closing. Populated once fund-tagged postings exist (policy-gated).
 */
export async function getFundStatement(
  db: Database,
  companyId: string,
  params: { dateFrom: string; dateTo: string },
): Promise<FundStatementRow[]> {
  const fromDate = new Date(params.dateFrom);
  const toDate = new Date(params.dateTo);
  const companyFunds = await db
    .select()
    .from(funds)
    .where(and(eq(funds.companyId, companyId), eq(funds.isActive, true)));

  const rows: FundStatementRow[] = [];
  for (const f of companyFunds) {
    // Pre-period net (credits − debits) before dateFrom → added to opening.
    const [pre] = await db
      .select({
        credit: sql<string>`COALESCE(SUM(${journalLines.credit}::numeric), 0)`,
        debit: sql<string>`COALESCE(SUM(${journalLines.debit}::numeric), 0)`,
      })
      .from(journalLines)
      .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
      .where(
        and(
          eq(journalLines.fundId, f.id),
          eq(journalEntries.companyId, companyId),
          sql`${journalEntries.date} < ${fromDate}`,
        ),
      );
    const [period] = await db
      .select({
        credit: sql<string>`COALESCE(SUM(${journalLines.credit}::numeric), 0)`,
        debit: sql<string>`COALESCE(SUM(${journalLines.debit}::numeric), 0)`,
      })
      .from(journalLines)
      .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
      .where(
        and(
          eq(journalLines.fundId, f.id),
          eq(journalEntries.companyId, companyId),
          sql`${journalEntries.date} >= ${fromDate}`,
          sql`${journalEntries.date} <= ${toDate}`,
        ),
      );

    const opening = new Decimal(f.openingBalance || "0")
      .plus(pre?.credit || "0")
      .minus(pre?.debit || "0")
      .toFixed(2);
    const movement = computeFundMovement(opening, period?.credit || "0", period?.debit || "0");
    rows.push({
      fundId: f.id,
      code: f.code,
      name: f.name,
      restrictionType: f.restrictionType,
      capitalBlock: capitalBlockOf(f.restrictionType),
      ...movement,
    });
  }
  return rows;
}
