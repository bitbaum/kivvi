"use server";

import {
  createRepairOrder,
  recordRepairAdvance,
  applySubsidy,
  finalizeRepairInvoice,
} from "@kivvi/core";
import { calcDocumentTotals } from "@kivvi/core/src/utils/document-totals";
import { createAction } from "./action-factory";

/**
 * Walk-in repair intake (the primary entry path — real customers live in Kivvi,
 * spec §2.1/§7). One action composes the granular domain steps so the counter
 * form is a single submit: create the repair_order (device is a bailment — no
 * stock), optionally book the advance to 2030, optionally apply a subsidy.
 *
 * revamp-it drives the SAME steps individually via /api/v1/repair-orders/* at
 * different lifecycle points — the domain functions are the shared SSOT.
 */
export const createRepairIntakeAction = createAction<
  {
    contactId?: string;
    contactName?: string;
    contactEmail?: string;
    deviceInfo?: string;
    faultDescription?: string;
    quotedAmount?: string;
    vatRate?: string;
    advanceAmount?: string;
    advanceMethod?: "bank_transfer" | "cash" | "card" | "other";
    subsidyProgramKey?: string;
    subsidyCode?: string;
    category?: string;
  },
  { id: string; number: string; subsidyApplied?: string }
>({
  handler: async (input, { companyId, userId, db }) => {
    const order = await createRepairOrder(db, companyId, userId, {
      contactId: input.contactId,
      contactName: input.contactName,
      contactEmail: input.contactEmail,
      deviceInfo: input.deviceInfo,
      faultDescription: input.faultDescription,
      quotedAmount: input.quotedAmount,
      vatRate: input.vatRate,
    });

    if (input.advanceAmount) {
      await recordRepairAdvance(db, companyId, userId, {
        documentId: order.id,
        amount: input.advanceAmount,
        method: input.advanceMethod ?? "cash",
      });
    }

    let subsidyApplied: string | undefined;
    if (input.subsidyProgramKey && input.quotedAmount) {
      // Cap is computed against the gross repair total (spec §5.3).
      const { total } = calcDocumentTotals([
        {
          quantity: "1",
          unitPrice: input.quotedAmount,
          discount: "0",
          vatRate: input.vatRate ?? "8.1",
        },
      ]);
      const claim = await applySubsidy(db, companyId, {
        documentId: order.id,
        programKey: input.subsidyProgramKey,
        code: input.subsidyCode,
        repairTotal: total.toFixed(2),
        category: input.category,
      });
      subsidyApplied = claim.appliedAmount;
    }

    return { id: order.id, number: order.number, subsidyApplied };
  },
  revalidate: ["/repairs", "/contacts"],
  errorMessage: "Failed to create repair order",
  minRole: "member",
  translateDomainErrors: true,
});

/** Finalize a repair: recognize revenue, clear advance, book subsidy receivable. */
export const finalizeRepairInvoiceAction = createAction<
  { documentId: string },
  {
    documentId: string;
    number: string;
    repairTotal: string;
    subsidyApplied: string;
    advanceApplied: string;
    customerDue: string;
  }
>({
  handler: async (input, { companyId, db }) =>
    finalizeRepairInvoice(db, companyId, { documentId: input.documentId }),
  revalidate: ["/repairs"],
  errorMessage: "Failed to finalize repair",
  minRole: "member",
  translateDomainErrors: true,
});
