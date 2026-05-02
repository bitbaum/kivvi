"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  documents,
  documentItems,
  journalEntries,
  numberSequences,
  contacts,
  products,
} from "@kivvi/database";
import { eq, and, sql, lt, inArray, isNull } from "drizzle-orm";
import Decimal from "decimal.js";
import {
  type ActionResult,
  getSession,
  requireRole,
  safeErrorMessage,
} from "./utils";
import {
  PAYABLE_DOCUMENT_TYPES,
  ISSUED_STATUSES,
  IMPORTABLE_DOCUMENT_TYPES,
} from "@kivvi/core/src/config/document-constants";
import { updateSequencesAfterImport } from "@kivvi/core";
import {
  createInvoiceSentJournalEntry,
  createPurchaseInvoiceJournalEntry,
} from "@kivvi/core";
import { getTranslations } from "next-intl/server";

// ============================================================================
// TASK #16: REPAIR NUMBER SEQUENCES
// ============================================================================

/**
 * Force-update all number sequences to MAX(existing)+1.
 * Fixes the post-import bug where sequences stayed at 1.
 */
export async function repairNumberSequencesAction(): Promise<
  ActionResult<{ updated: Record<string, number> }>
> {
  const t = await getTranslations("settings.dataRepair");
  try {
    const { companyId } = await requireRole("admin");
    const updated: Record<string, number> = {};

    // Call the existing function first
    await updateSequencesAfterImport(db, companyId);

    // Verify what the sequences are now set to
    const seqs = await db
      .select({
        type: numberSequences.type,
        prefix: numberSequences.prefix,
        nextNumber: numberSequences.nextNumber,
      })
      .from(numberSequences)
      .where(eq(numberSequences.companyId, companyId));

    for (const seq of seqs) {
      updated[`${seq.prefix} (${seq.type})`] = seq.nextNumber;
    }

    // Double-check: also do a raw numeric extraction for any formats
    // that the standard function might miss (e.g., kivitendo R2026082 format)
    const docTypes = [...IMPORTABLE_DOCUMENT_TYPES, "dunning"] as const;

    for (const docType of docTypes) {
      const seqType = docType;
      // Count existing docs to see if we need a higher sequence
      const [countResult] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(documents)
        .where(
          and(eq(documents.companyId, companyId), eq(documents.type, docType)),
        );

      const count = Number(countResult?.count || 0);
      const currentSeq = seqs.find((s) => s.type === seqType);

      // If count is high but sequence is low, something went wrong
      if (count > 0 && currentSeq && currentSeq.nextNumber <= count) {
        // Extract all numeric parts and find the true max
        const allDocs = await db
          .select({ number: documents.number })
          .from(documents)
          .where(
            and(
              eq(documents.companyId, companyId),
              eq(documents.type, docType),
            ),
          );

        let maxNum = 0;
        for (const doc of allDocs) {
          if (!doc.number) continue;
          // Try extracting number after last dash (Kivvi format: RE-2026-00082)
          const dashMatch = doc.number.match(/-(\d+)$/);
          if (dashMatch) {
            const num = parseInt(dashMatch[1], 10);
            if (num > maxNum) maxNum = num;
          } else {
            // Try extracting trailing digits (kivitendo format: R2026082)
            const trailMatch = doc.number.match(/(\d+)$/);
            if (trailMatch) {
              const num = parseInt(trailMatch[1], 10);
              if (num > maxNum) maxNum = num;
            }
          }
        }

        if (maxNum > 0) {
          const newNext = maxNum + 1;
          if (newNext > (currentSeq?.nextNumber || 0)) {
            await db
              .update(numberSequences)
              .set({ nextNumber: newNext })
              .where(
                and(
                  eq(numberSequences.companyId, companyId),
                  eq(numberSequences.type, seqType),
                ),
              );
            updated[`${currentSeq?.prefix} (${seqType})`] = newNext;
          }
        }
      }
    }

    // Same for contacts
    const allContacts = await db
      .select({ contactNumber: contacts.contactNumber })
      .from(contacts)
      .where(eq(contacts.companyId, companyId));

    let maxContactNum = 0;
    for (const c of allContacts) {
      if (!c.contactNumber) continue;
      const match = c.contactNumber.match(/(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxContactNum) maxContactNum = num;
      }
    }
    if (maxContactNum > 0) {
      const contactSeq = seqs.find((s) => s.type === "contact");
      if (!contactSeq || contactSeq.nextNumber <= maxContactNum) {
        await db
          .update(numberSequences)
          .set({ nextNumber: maxContactNum + 1 })
          .where(
            and(
              eq(numberSequences.companyId, companyId),
              eq(numberSequences.type, "contact"),
            ),
          );
        updated["K (contact)"] = maxContactNum + 1;
      }
    }

    // Same for products
    const allProducts = await db
      .select({ articleNumber: products.articleNumber })
      .from(products)
      .where(eq(products.companyId, companyId));

    let maxProductNum = 0;
    for (const p of allProducts) {
      if (!p.articleNumber) continue;
      const match = p.articleNumber.match(/(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxProductNum) maxProductNum = num;
      }
    }
    if (maxProductNum > 0) {
      const productSeq = seqs.find((s) => s.type === "product");
      if (!productSeq || productSeq.nextNumber <= maxProductNum) {
        await db
          .update(numberSequences)
          .set({ nextNumber: maxProductNum + 1 })
          .where(
            and(
              eq(numberSequences.companyId, companyId),
              eq(numberSequences.type, "product"),
            ),
          );
        updated["ART (product)"] = maxProductNum + 1;
      }
    }

    revalidatePath("/");
    return { success: true, data: { updated } };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorRepairSequences")),
    };
  }
}

// ============================================================================
// TASK #17: FIX HISTORICAL INVOICE STATUSES
// ============================================================================

/**
 * Mark old imported invoices as "paid" instead of "sent".
 * These are historical invoices from kivitendo that were already processed.
 * Only affects invoices older than the cutoff date with status "sent".
 */
export async function repairInvoiceStatusesAction(
  cutoffDate?: string, // ISO date string, defaults to 2026-01-01
): Promise<
  ActionResult<{ updatedInvoices: number; updatedPurchaseInvoices: number }>
> {
  const t = await getTranslations("settings.dataRepair");
  try {
    const { companyId } = await requireRole("admin");
    const cutoff = cutoffDate ? new Date(cutoffDate) : new Date("2026-01-01");

    // Update sales invoices: sent → paid (historical)
    const invoiceResult = await db
      .update(documents)
      .set({
        status: "paid",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(documents.companyId, companyId),
          eq(documents.type, "invoice"),
          eq(documents.status, "sent"),
          lt(documents.issueDate, cutoff),
        ),
      )
      .returning({ id: documents.id });

    // Update purchase invoices: sent → paid (historical)
    const purchaseResult = await db
      .update(documents)
      .set({
        status: "paid",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(documents.companyId, companyId),
          eq(documents.type, "purchase_invoice"),
          eq(documents.status, "sent"),
          lt(documents.issueDate, cutoff),
        ),
      )
      .returning({ id: documents.id });

    revalidatePath("/");
    return {
      success: true,
      data: {
        updatedInvoices: invoiceResult.length,
        updatedPurchaseInvoices: purchaseResult.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorRepairStatuses")),
    };
  }
}

// ============================================================================
// TASK #19: GENERATE JOURNAL ENTRIES FROM EXISTING DOCUMENTS
// ============================================================================

/**
 * Retroactively generate journal entries for all documents that should have them.
 * Skips documents that already have entries (idempotent via sourceId check).
 */
export async function generateMissingJournalEntriesAction(): Promise<
  ActionResult<{
    invoiceEntries: number;
    purchaseEntries: number;
    skipped: number;
    errors: string[];
  }>
> {
  const t = await getTranslations("settings.dataRepair");
  try {
    const { companyId } = await requireRole("admin");

    let invoiceEntries = 0;
    let purchaseEntries = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Get all existing journal entry sourceIds to avoid duplicates
    const existingEntries = await db
      .select({ sourceId: journalEntries.sourceId })
      .from(journalEntries)
      .where(eq(journalEntries.companyId, companyId));

    const existingSourceIds = new Set(
      existingEntries.map((e) => e.sourceId).filter(Boolean),
    );

    // Process sales invoices (status: sent, paid, partially_paid, overdue)
    const invoices = await db
      .select({
        id: documents.id,
        number: documents.number,
        total: documents.total,
        vatAmount: documents.vatAmount,
        subtotal: documents.subtotal,
        issueDate: documents.issueDate,
        status: documents.status,
      })
      .from(documents)
      .where(
        and(
          eq(documents.companyId, companyId),
          eq(documents.type, "invoice"),
          inArray(documents.status, [...ISSUED_STATUSES]),
        ),
      );

    for (const inv of invoices) {
      if (existingSourceIds.has(inv.id)) {
        skipped++;
        continue;
      }

      try {
        const total = inv.total || "0";
        const subtotal = inv.subtotal || "0";
        const vatAmount = inv.vatAmount || "0";

        // Skip if total is 0
        if (new Decimal(total).isZero()) {
          skipped++;
          continue;
        }

        await createInvoiceSentJournalEntry(db, companyId, {
          id: inv.id,
          number: inv.number || "UNKNOWN",
          total,
          vatAmount,
          subtotal,
          issueDate: inv.issueDate || new Date(),
        });
        invoiceEntries++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        if (errors.length < 10) {
          errors.push(`Invoice ${inv.number}: ${msg}`);
        }
      }
    }

    // Process purchase invoices (status: sent, paid, confirmed)
    const purchaseInvoices = await db
      .select({
        id: documents.id,
        number: documents.number,
        total: documents.total,
        vatAmount: documents.vatAmount,
        subtotal: documents.subtotal,
        issueDate: documents.issueDate,
        status: documents.status,
      })
      .from(documents)
      .where(
        and(
          eq(documents.companyId, companyId),
          eq(documents.type, "purchase_invoice"),
          inArray(documents.status, [...ISSUED_STATUSES]),
        ),
      );

    for (const pi of purchaseInvoices) {
      if (existingSourceIds.has(pi.id)) {
        skipped++;
        continue;
      }

      try {
        const total = pi.total || "0";
        const subtotal = pi.subtotal || "0";
        const vatAmount = pi.vatAmount || "0";

        if (new Decimal(total).isZero()) {
          skipped++;
          continue;
        }

        await createPurchaseInvoiceJournalEntry(db, companyId, {
          id: pi.id,
          number: pi.number || "UNKNOWN",
          total,
          vatAmount,
          subtotal,
          issueDate: pi.issueDate || new Date(),
        });
        purchaseEntries++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        if (errors.length < 10) {
          errors.push(`Purchase ${pi.number}: ${msg}`);
        }
      }
    }

    revalidatePath("/");
    return {
      success: true,
      data: { invoiceEntries, purchaseEntries, skipped, errors },
    };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorGenerateEntries")),
    };
  }
}

// ============================================================================
// FIX PAID DATES ON REPAIRED INVOICES
// ============================================================================

/**
 * Fix invoices that have status='paid' but no paidDate.
 * Sets paidDate = issueDate as best approximation for historical data.
 */
export async function repairPaidDatesAction(): Promise<
  ActionResult<{ updated: number }>
> {
  const t = await getTranslations("settings.dataRepair");
  try {
    const { companyId } = await requireRole("admin");

    const result = await db
      .update(documents)
      .set({
        paidDate: sql`${documents.issueDate}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(documents.companyId, companyId),
          eq(documents.status, "paid"),
          isNull(documents.paidDate),
        ),
      )
      .returning({ id: documents.id });

    revalidatePath("/");
    return { success: true, data: { updated: result.length } };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorRepairPaidDates")),
    };
  }
}

// ============================================================================
// DATA REPAIR STATUS
// ============================================================================

/**
 * Get data repair status — shows what needs fixing.
 */
export async function getDataRepairStatusAction(): Promise<
  ActionResult<{
    sequences: { type: string; prefix: string; nextNumber: number }[];
    sentInvoicesBefore2026: number;
    sentPurchaseInvoicesBefore2026: number;
    documentsWithoutItems: number;
    documentsWithoutJournalEntries: number;
    totalJournalEntries: number;
    paidInvoicesWithoutPaidDate: number;
  }>
> {
  const t = await getTranslations("settings.dataRepair");
  try {
    const { companyId } = await getSession();

    // Get current sequences
    const sequences = await db
      .select({
        type: numberSequences.type,
        prefix: numberSequences.prefix,
        nextNumber: numberSequences.nextNumber,
      })
      .from(numberSequences)
      .where(eq(numberSequences.companyId, companyId));

    // Count sent invoices before 2026
    const [sentInvoices] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(documents)
      .where(
        and(
          eq(documents.companyId, companyId),
          eq(documents.type, "invoice"),
          eq(documents.status, "sent"),
          lt(documents.issueDate, new Date("2026-01-01")),
        ),
      );

    // Count sent purchase invoices before 2026
    const [sentPurchaseInvoices] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(documents)
      .where(
        and(
          eq(documents.companyId, companyId),
          eq(documents.type, "purchase_invoice"),
          eq(documents.status, "sent"),
          lt(documents.issueDate, new Date("2026-01-01")),
        ),
      );

    // Count documents without items
    const [docsWithoutItems] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(documents)
      .where(
        and(
          eq(documents.companyId, companyId),
          isNull(
            db
              .select({ id: documentItems.id })
              .from(documentItems)
              .where(eq(documentItems.documentId, documents.id))
              .limit(1),
          ),
        ),
      );

    // Count paid invoices without paidDate
    const [paidNoPaidDate] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(documents)
      .where(
        and(
          eq(documents.companyId, companyId),
          eq(documents.status, "paid"),
          isNull(documents.paidDate),
        ),
      );

    // Count total journal entries
    const [journalCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(journalEntries)
      .where(eq(journalEntries.companyId, companyId));

    // Count non-draft invoices + purchase invoices (should have entries)
    const [shouldHaveEntries] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(documents)
      .where(
        and(
          eq(documents.companyId, companyId),
          inArray(documents.type, [...PAYABLE_DOCUMENT_TYPES]),
          inArray(documents.status, [...ISSUED_STATUSES]),
        ),
      );

    return {
      success: true,
      data: {
        sequences,
        sentInvoicesBefore2026: Number(sentInvoices?.count || 0),
        sentPurchaseInvoicesBefore2026: Number(
          sentPurchaseInvoices?.count || 0,
        ),
        documentsWithoutItems: Number(docsWithoutItems?.count || 0),
        documentsWithoutJournalEntries:
          Number(shouldHaveEntries?.count || 0) -
          Number(journalCount?.count || 0),
        totalJournalEntries: Number(journalCount?.count || 0),
        paidInvoicesWithoutPaidDate: Number(paidNoPaidDate?.count || 0),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorGetStatus")),
    };
  }
}
