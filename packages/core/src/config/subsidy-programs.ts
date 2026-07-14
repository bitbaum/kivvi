/**
 * Subsidy programs — config SSOT (Ground Truth #3: a Bern repair café is the
 * next tenant, so never hardcode Zürich). A subsidy is a third-party contribution
 * that reduces what the customer pays for a repair; the difference is reimbursed
 * to us by the settling party (e.g. ERZ Stadt Zürich), out of band, monthly.
 *
 * Client-safe: pure config, zero DB deps.
 *
 * ── The Treuhänder question, encoded as config, not a blocker ──────────────
 * Whether the reimbursed portion is (a) taxable turnover — "Entgelt von dritter
 * Seite", Art. 24 MWSTG — or (b) a non-taxable Subvention (Art. 18/33 MWSTG,
 * causing Vorsteuerkürzung) changes the POSTING, not the schema. It lives here
 * as `vatTreatment` so the fiduciary's answer is a one-line config flip, and the
 * repair domain implements BOTH branches (repairs.ts buildSubsidyPostingLines).
 * Default is `subvention` — the more likely treatment for a public repair bonus
 * paid to a gemeinnütziger Verein — pending written confirmation.
 */

/** How VAT law treats the reimbursed (subsidy) portion of a repair. */
export type SubsidyVatTreatment =
  /** (b) Art. 18/33 — non-taxable public contribution; VAT only on the customer
   *  share; triggers a (separate, periodic) Vorsteuerkürzung. */
  | "subvention"
  /** (a) Art. 24 — third-party consideration; the reimbursed portion is taxable
   *  turnover like the customer share (VAT on the full repair price). */
  | "third_party_consideration";

export interface SubsidyProgram {
  /** Human label (shown in UI / on settlement batches). */
  label: string;
  /** Nominal value of one voucher/code, CHF decimal string. */
  faceAmount: string;
  /** Cap: the applied subsidy may not exceed this % of the repair total. */
  maxPct: number;
  /** Categories the program covers (empty = no category restriction). */
  eligibleCategories: readonly string[];
  /** Who reimburses us (carried onto the subsidyClaims row + settlement batch). */
  settlementParty: string;
  /** How often the settling party reimburses. */
  settlementCadence: "monthly" | "quarterly" | "adhoc";
  /** GL account carrying the reimbursement receivable until settled.
   *  1180 Sonstige kurzfristige Forderungen — a real receivable account
   *  (NB: seed's 1109 is Delkredere, NOT a subsidy receivable). */
  receivableAccountCode: string;
  /** VAT treatment of the reimbursed portion — see SubsidyVatTreatment. */
  vatTreatment: SubsidyVatTreatment;
  /** Under `subvention`: revenue account for the non-taxable contribution.
   *  3400 Übrige Erlöse (a dedicated Subventionsertrag account can be seeded
   *  later without touching this logic). Unused under third_party_consideration. */
  subventionAccountCode: string;
}

export const SUBSIDY_PROGRAMS = {
  reparaturbonus_zh: {
    label: "Reparaturbonus Stadt Zürich",
    faceAmount: "100.00",
    maxPct: 50,
    eligibleCategories: ["electronics", "clothing", "shoes"],
    settlementParty: "ERZ Stadt Zürich",
    settlementCadence: "monthly",
    receivableAccountCode: "1180",
    vatTreatment: "subvention",
    subventionAccountCode: "3400",
  },
} as const satisfies Record<string, SubsidyProgram>;

export type SubsidyProgramKey = keyof typeof SUBSIDY_PROGRAMS;

/** Resolve a program by key, or undefined if unknown. */
export function getSubsidyProgram(key: string): SubsidyProgram | undefined {
  return (SUBSIDY_PROGRAMS as Record<string, SubsidyProgram>)[key];
}

/**
 * Is a repair category eligible for a program? An empty `eligibleCategories`
 * means no restriction. Case-insensitive.
 */
export function isCategoryEligible(
  program: SubsidyProgram,
  category: string | null | undefined,
): boolean {
  if (program.eligibleCategories.length === 0) return true;
  if (!category) return false;
  const c = category.trim().toLowerCase();
  return program.eligibleCategories.some((e) => e.toLowerCase() === c);
}
