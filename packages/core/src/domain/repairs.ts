/**
 * Repair intake & Reparaturbonus — Kivvi domain (spec: REPAIR_INTAKE_AND_SUBSIDY_SPEC).
 *
 * A repair is a pure SERVICE on a customer-owned device. Three invariants (§5):
 *  1. The device is a bailment, NEVER inventory — a repair_order produces no
 *     stock movement and no inventoryItems row (GT #5).
 *  2. An advance/deposit taken at intake is a LIABILITY (2030), not revenue.
 *  3. A subsidy (Reparaturbonus) splits WHO pays: the customer's reduced share
 *     stays on the bill; the reimbursed portion is a receivable from the settling
 *     party (ERZ), cleared out-of-band monthly.
 *
 * The VAT treatment of the subsidy (taxable third-party consideration vs.
 * non-taxable Subvention) is a per-program CONFIG choice (subsidy-programs.ts),
 * NOT a code fork — buildRepairFinalizeLines implements both branches and picks
 * by program.vatTreatment. So the fiduciary's answer is a config flip, and the
 * project moves without waiting on it.
 *
 * Money math lives in pure helpers (unit-tested with exact values, GT #6); the
 * exported functions are thin, atomic, DB orchestration.
 */

import { z } from "zod";
import Decimal from "decimal.js";
import { and, eq } from "drizzle-orm";
import {
  documents,
  documentItems,
  subsidyClaims,
  accounts,
} from "@kivvi/database";
import type { Database } from "@kivvi/database";
import { PAYMENT_METHOD_VALUES } from "@kivvi/database";
import { createDocument } from "./documents";
import { createAutoJournalEntry } from "./accounting";
import { resolveOrCreateContact } from "./contacts";
import { rappenRound } from "../utils/swiss-currency";
import { DEFAULT_CURRENCY } from "../config/locale";
import { DEFAULT_VAT_RATE } from "../config/vat-rates";
import { AMOUNT_REGEX } from "../utils/validation-patterns";
import {
  getSubsidyProgram,
  isCategoryEligible,
  type SubsidyProgram,
  type SubsidyVatTreatment,
} from "../config/subsidy-programs";

// Advance/deposit accounting (§5.2). No VAT split on the advance line — under
// vereinbarte Entgelte the VAT arises at final invoice, so it is recognized
// once, at finalize, on the full total (the advance is a pure liability here).
const ADVANCE_LIABILITY_ACCOUNT = "2030"; // Erhaltene Anzahlungen
const BANK_ACCOUNT = "1020"; // Bank / Kasse
const CUSTOMER_AR_ACCOUNT = "1100"; // Debitoren
const SERVICE_REVENUE_ACCOUNT = "3200"; // Dienstleistungserlöse
const VAT_ACCOUNT = "2200"; // Geschuldete MWST

// ============================================================================
// PURE MONEY MATH (no DB — unit-tested with exact values)
// ============================================================================

export interface JournalLineSpec {
  accountCode: string;
  debit?: string;
  credit?: string;
  description?: string;
}

/** Split a VAT-inclusive (gross) amount into { net, vat } that sum EXACTLY to it. */
export function netVatFromGross(
  gross: Decimal,
  vatRatePct: string,
): { net: string; vat: string } {
  const rate = new Decimal(vatRatePct || "0");
  const net = gross.div(new Decimal(1).plus(rate.div(100))).toDecimalPlaces(2);
  const vat = gross.minus(net); // exact remainder → net + vat === gross
  return { net: net.toFixed(2), vat: vat.toFixed(2) };
}

/**
 * Applied subsidy = min(faceAmount, cap% × repairTotal), Rappen-rounded, ≥ 0 and
 * never more than the repair itself. `repairTotalGross` is the VAT-inclusive
 * repair price.
 */
export function computeAppliedSubsidy(
  program: SubsidyProgram,
  repairTotalGross: string,
): string {
  const total = new Decimal(repairTotalGross);
  if (total.lte(0)) return "0.00";
  const cap = total.times(program.maxPct).div(100);
  const face = new Decimal(program.faceAmount);
  const applied = rappenRound(Decimal.min(face, cap));
  const bounded = Decimal.max(new Decimal(0), Decimal.min(applied, total));
  return bounded.toFixed(2);
}

/** Advance received at intake: Dr Bank / Cr Erhaltene Anzahlungen (§5.2). */
export function buildAdvanceReceiptLines(amount: string): JournalLineSpec[] {
  return [
    {
      accountCode: BANK_ACCOUNT,
      debit: amount,
      description: "Anzahlung erhalten",
    },
    {
      accountCode: ADVANCE_LIABILITY_ACCOUNT,
      credit: amount,
      description: "Erhaltene Anzahlung",
    },
  ];
}

/** Monthly settlement: reimbursement received clears the receivable (§5.3). */
export function buildSubsidySettlementLines(
  amount: string,
  receivableAccountCode: string,
): JournalLineSpec[] {
  return [
    {
      accountCode: BANK_ACCOUNT,
      debit: amount,
      description: "Subvention erhalten",
    },
    {
      accountCode: receivableAccountCode,
      credit: amount,
      description: "Forderung Subvention ausgeglichen",
    },
  ];
}

export interface RepairFinalizeInput {
  /** VAT-inclusive repair price. */
  repairTotalGross: string;
  vatRate: string;
  /** Applied subsidy (gross), 0 if none. */
  subsidyGross: string;
  /** Advance already received to 2030 (gross), 0 if none. */
  advanceGross: string;
  vatTreatment: SubsidyVatTreatment;
  receivableAccountCode: string;
  subventionAccountCode: string;
}

/**
 * The single balanced journal entry that finalizes a repair. Handles both VAT
 * treatments of the subsidy, plus advance clearing, in one entry:
 *
 *   Dr 1100 Debitoren        (customer's remaining share = total − subsidy − advance)
 *   Dr <recv> Forderung       (subsidy receivable from ERZ)
 *   Dr 2030 Anzahlungen       (clear the advance liability)
 *      Cr 3200 revenue + Cr 2200 VAT   — base is `total` (a) or `total − subsidy` (b)
 *      Cr <subv> Subventionsertrag     — only under (b): the non-taxable bonus
 *
 * Debits always sum to `total`; credits always sum to `total`. Verified in tests
 * against the spec §5.3 example (total 60, bonus 30) for both treatments.
 */
export function buildRepairFinalizeLines(
  input: RepairFinalizeInput,
): JournalLineSpec[] {
  const total = new Decimal(input.repairTotalGross);
  const subsidy = new Decimal(input.subsidyGross || "0");
  const advance = new Decimal(input.advanceGross || "0");
  const customerRemaining = total.minus(subsidy).minus(advance);

  const lines: JournalLineSpec[] = [];

  if (customerRemaining.gt(0)) {
    lines.push({
      accountCode: CUSTOMER_AR_ACCOUNT,
      debit: customerRemaining.toFixed(2),
      description: "Kundenanteil Reparatur",
    });
  }
  if (subsidy.gt(0)) {
    lines.push({
      accountCode: input.receivableAccountCode,
      debit: subsidy.toFixed(2),
      description: "Forderung Subvention (Reparaturbonus)",
    });
  }
  if (advance.gt(0)) {
    lines.push({
      accountCode: ADVANCE_LIABILITY_ACCOUNT,
      debit: advance.toFixed(2),
      description: "Anzahlung verrechnet",
    });
  }

  if (input.vatTreatment === "subvention" && subsidy.gt(0)) {
    // (b) VAT only on the customer share; the bonus is non-taxable income.
    const taxableGross = total.minus(subsidy);
    const { net, vat } = netVatFromGross(taxableGross, input.vatRate);
    lines.push({
      accountCode: SERVICE_REVENUE_ACCOUNT,
      credit: net,
      description: "Dienstleistungsertrag (Kundenanteil)",
    });
    if (new Decimal(vat).gt(0)) {
      lines.push({
        accountCode: VAT_ACCOUNT,
        credit: vat,
        description: "MWST",
      });
    }
    lines.push({
      accountCode: input.subventionAccountCode,
      credit: subsidy.toFixed(2),
      description: "Subventionsertrag Reparaturbonus (nicht steuerbar)",
    });
  } else {
    // (a) third-party consideration OR no subsidy: VAT on the full total.
    const { net, vat } = netVatFromGross(total, input.vatRate);
    lines.push({
      accountCode: SERVICE_REVENUE_ACCOUNT,
      credit: net,
      description: "Dienstleistungsertrag Reparatur",
    });
    if (new Decimal(vat).gt(0)) {
      lines.push({
        accountCode: VAT_ACCOUNT,
        credit: vat,
        description: "MWST",
      });
    }
  }

  return lines;
}

// ============================================================================
// DB ORCHESTRATION (atomic, tenant-isolated)
// ============================================================================

/** Durable idempotency marker for a repair started via an external system. */
export function repairSourceKey(source: string, sourceId: string): string {
  return `repair:${source}:${sourceId}`;
}

export const createRepairOrderSchema = z
  .object({
    contactId: z.string().uuid().optional(),
    contactName: z.string().min(1).max(200).optional(),
    contactEmail: z.string().email().optional(),
    deviceInfo: z.string().max(500).optional(),
    faultDescription: z.string().max(1000).optional(),
    /** NET quoted base price (VAT added on top), consistent with the doc model. */
    quotedAmount: z
      .string()
      .regex(AMOUNT_REGEX, "Amount must be a decimal like 30.00")
      .optional(),
    vatRate: z.string().regex(AMOUNT_REGEX).default(DEFAULT_VAT_RATE),
    /** External system + id (revamp-it appointment) — enables idempotent replay. */
    source: z.string().max(60).optional(),
    sourceId: z.string().max(200).optional(),
    issueDate: z.string().optional(),
  })
  .refine((d) => Boolean(d.contactId || d.contactName), {
    message: "Either contactId or contactName is required",
    path: ["contactId"],
  });

export type CreateRepairOrderInput = z.input<typeof createRepairOrderSchema>;

export interface RepairOrderResult {
  id: string;
  number: string;
  replayed: boolean;
}

/**
 * Record a repair job as a `repair_order` document. No stock movement, no
 * inventory item — the device stays the customer's property (§5.1). Idempotent
 * on `repair:{source}:{sourceId}` when a source is given.
 */
export async function createRepairOrder(
  db: Database,
  companyId: string,
  userId: string,
  input: CreateRepairOrderInput,
): Promise<RepairOrderResult> {
  const v = createRepairOrderSchema.parse(input);
  const key =
    v.source && v.sourceId ? repairSourceKey(v.source, v.sourceId) : null;

  if (key) {
    const [existing] = await db
      .select({ id: documents.id, number: documents.number })
      .from(documents)
      .where(
        and(
          eq(documents.companyId, companyId),
          eq(documents.type, "repair_order"),
          eq(documents.internalNotes, key),
        ),
      )
      .limit(1);
    if (existing)
      return { id: existing.id, number: existing.number, replayed: true };
  }

  const issueDate = v.issueDate ?? new Date().toISOString().split("T")[0];

  return db.transaction(async (tx) => {
    const contactId =
      v.contactId ??
      (await resolveOrCreateContact(
        tx,
        companyId,
        v.contactName!,
        v.contactEmail,
      ));

    const created = await createDocument(tx, companyId, userId, {
      type: "repair_order",
      contactId,
      issueDate,
      currency: DEFAULT_CURRENCY,
      internalNotes: key ?? undefined,
      items: v.quotedAmount
        ? [
            {
              position: 0,
              description: v.deviceInfo
                ? `Reparatur: ${v.deviceInfo}`
                : "Reparatur",
              quantity: "1",
              unitPrice: v.quotedAmount,
              vatRate: v.vatRate,
              discount: "0",
            },
          ]
        : [],
    });

    // Repair-specific snapshots (bailment, not inventory).
    await tx
      .update(documents)
      .set({
        deviceInfo: v.deviceInfo ?? null,
        faultDescription: v.faultDescription ?? null,
        externalJobRef: v.sourceId ?? null,
      })
      .where(eq(documents.id, created.id));

    return { id: created.id, number: created.number, replayed: false };
  });
}

export const recordRepairAdvanceSchema = z.object({
  documentId: z.string().uuid(),
  amount: z
    .string()
    .regex(AMOUNT_REGEX)
    .refine((v) => new Decimal(v).gt(0), "Advance must be greater than 0"),
  method: z.enum(PAYMENT_METHOD_VALUES).default("cash"),
  date: z.string().optional(),
});

export type RecordRepairAdvanceInput = z.input<
  typeof recordRepairAdvanceSchema
>;

/** Book an intake deposit as a liability: Dr Bank / Cr Erhaltene Anzahlungen. */
export async function recordRepairAdvance(
  db: Database,
  companyId: string,
  userId: string,
  input: RecordRepairAdvanceInput,
): Promise<{ documentId: string; advanceAmount: string }> {
  const v = recordRepairAdvanceSchema.parse(input);
  const date = v.date ?? new Date().toISOString().split("T")[0];

  return db.transaction(async (tx) => {
    const [doc] = await tx
      .select({ id: documents.id, number: documents.number })
      .from(documents)
      .where(
        and(
          eq(documents.id, v.documentId),
          eq(documents.companyId, companyId),
          eq(documents.type, "repair_order"),
        ),
      )
      .limit(1);
    if (!doc) throw new Error("Repair order not found");

    await createAutoJournalEntry(tx, companyId, {
      date: new Date(date),
      reference: doc.number,
      description: `Anzahlung Reparatur ${doc.number}`,
      sourceType: "repair_advance",
      sourceId: doc.id,
      lines: buildAdvanceReceiptLines(v.amount),
    });

    await tx
      .update(documents)
      .set({ advanceAmount: v.amount })
      .where(eq(documents.id, doc.id));

    return { documentId: doc.id, advanceAmount: v.amount };
  });
}

export const applySubsidySchema = z.object({
  documentId: z.string().uuid(),
  programKey: z.string().min(1).max(60),
  code: z.string().max(120).optional(),
  /** VAT-inclusive repair total the cap is computed against. */
  repairTotal: z.string().regex(AMOUNT_REGEX),
  /** Repair category, for eligibility (electronics/clothing/shoes). */
  category: z.string().max(60).optional(),
});

export type ApplySubsidyInput = z.input<typeof applySubsidySchema>;

export interface SubsidyClaimResult {
  id: string;
  status: "applied" | "rejected";
  appliedAmount: string;
  faceAmount: string;
}

/**
 * Validate a subsidy code against config (program exists, category eligible,
 * cap) and record a `subsidyClaims` row. An ineligible code is recorded as
 * `rejected` (appliedAmount 0) — the repair still bills at full customer price
 * (acceptance §9.6). The GL receivable is posted later, at finalize.
 */
export async function applySubsidy(
  db: Database,
  companyId: string,
  input: ApplySubsidyInput,
): Promise<SubsidyClaimResult> {
  const v = applySubsidySchema.parse(input);
  const program = getSubsidyProgram(v.programKey);
  if (!program) throw new Error(`Unknown subsidy program: ${v.programKey}`);

  const eligible = isCategoryEligible(program, v.category);
  const appliedAmount = eligible
    ? computeAppliedSubsidy(program, v.repairTotal)
    : "0.00";
  const status: "applied" | "rejected" =
    eligible && new Decimal(appliedAmount).gt(0) ? "applied" : "rejected";

  return db.transaction(async (tx) => {
    const [doc] = await tx
      .select({ id: documents.id })
      .from(documents)
      .where(
        and(
          eq(documents.id, v.documentId),
          eq(documents.companyId, companyId),
          eq(documents.type, "repair_order"),
        ),
      )
      .limit(1);
    if (!doc) throw new Error("Repair order not found");

    // Resolve the receivable account id from the program's code (tenant-scoped).
    const [recv] = await tx
      .select({ id: accounts.id })
      .from(accounts)
      .where(
        and(
          eq(accounts.companyId, companyId),
          eq(accounts.code, program.receivableAccountCode),
        ),
      )
      .limit(1);

    const [claim] = await tx
      .insert(subsidyClaims)
      .values({
        companyId,
        documentId: doc.id,
        programKey: v.programKey,
        code: v.code ?? null,
        faceAmount: program.faceAmount,
        appliedAmount,
        status,
        settlementParty: program.settlementParty,
        receivableAccountId: recv?.id ?? null,
      })
      .returning({ id: subsidyClaims.id });

    return {
      id: claim.id,
      status,
      appliedAmount,
      faceAmount: program.faceAmount,
    };
  });
}

export interface FinalizeRepairResult {
  documentId: string;
  number: string;
  repairTotal: string;
  subsidyApplied: string;
  advanceApplied: string;
  customerDue: string;
}

/**
 * Finalize a repair: recognize service revenue, clear any advance, and book any
 * subsidy receivable — in ONE balanced journal entry (buildRepairFinalizeLines),
 * config-driven by the subsidy program's vatTreatment. Marks applied subsidy
 * claims `claimed` (awaiting the monthly settlement) and the repair `sent`.
 *
 * The GL entry is Kivvi's authoritative money record (GT #5). Producing the
 * customer-facing invoice PDF / doc-type conversion is a presentational layer on
 * top and does not change these postings.
 */
export async function finalizeRepairInvoice(
  db: Database,
  companyId: string,
  input: { documentId: string; date?: string },
): Promise<FinalizeRepairResult> {
  const documentId = z.string().uuid().parse(input.documentId);
  const date = input.date ?? new Date().toISOString().split("T")[0];

  return db.transaction(async (tx) => {
    const [doc] = await tx
      .select({
        id: documents.id,
        number: documents.number,
        total: documents.total,
        advanceAmount: documents.advanceAmount,
      })
      .from(documents)
      .where(
        and(
          eq(documents.id, documentId),
          eq(documents.companyId, companyId),
          eq(documents.type, "repair_order"),
        ),
      )
      .limit(1);
    if (!doc) throw new Error("Repair order not found");

    const repairTotalGross = doc.total;
    if (new Decimal(repairTotalGross).lte(0)) {
      throw new Error("Repair order has no billable total");
    }

    // Dominant line VAT rate (repairs are single-rate services).
    const [line] = await tx
      .select({ vatRate: documentItems.vatRate })
      .from(documentItems)
      .where(eq(documentItems.documentId, doc.id))
      .limit(1);
    const vatRate = line?.vatRate ?? DEFAULT_VAT_RATE;

    // At most one applied subsidy claim per repair (the common case); its
    // program decides VAT treatment + accounts.
    const [claim] = await tx
      .select({
        id: subsidyClaims.id,
        appliedAmount: subsidyClaims.appliedAmount,
        programKey: subsidyClaims.programKey,
      })
      .from(subsidyClaims)
      .where(
        and(
          eq(subsidyClaims.documentId, doc.id),
          eq(subsidyClaims.companyId, companyId),
          eq(subsidyClaims.status, "applied"),
        ),
      )
      .limit(1);

    const program = claim ? getSubsidyProgram(claim.programKey) : undefined;
    const subsidyGross = claim ? claim.appliedAmount : "0.00";
    const advanceGross = doc.advanceAmount ?? "0.00";

    const lines = buildRepairFinalizeLines({
      repairTotalGross,
      vatRate,
      subsidyGross,
      advanceGross,
      vatTreatment: program?.vatTreatment ?? "third_party_consideration",
      receivableAccountCode:
        program?.receivableAccountCode ?? CUSTOMER_AR_ACCOUNT,
      subventionAccountCode:
        program?.subventionAccountCode ?? SERVICE_REVENUE_ACCOUNT,
    });

    await createAutoJournalEntry(tx, companyId, {
      date: new Date(date),
      reference: doc.number,
      description: `Reparatur abgeschlossen ${doc.number}`,
      sourceType: "repair_finalized",
      sourceId: doc.id,
      lines,
    });

    if (claim) {
      await tx
        .update(subsidyClaims)
        .set({ status: "claimed", updatedAt: new Date() })
        .where(eq(subsidyClaims.id, claim.id));
    }

    await tx
      .update(documents)
      .set({ status: "sent", updatedAt: new Date() })
      .where(eq(documents.id, doc.id));

    const customerDue = new Decimal(repairTotalGross)
      .minus(subsidyGross)
      .minus(advanceGross)
      .toFixed(2);

    return {
      documentId: doc.id,
      number: doc.number,
      repairTotal: repairTotalGross,
      subsidyApplied: subsidyGross,
      advanceApplied: advanceGross,
      customerDue,
    };
  });
}
