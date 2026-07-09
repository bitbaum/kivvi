import Decimal from "decimal.js";
import { eq, and, sql, lt, inArray, isNull } from "drizzle-orm";
import {
  documents,
  documentItems,
  journalEntries,
  numberSequences,
  contacts,
  products,
} from "@kivvi/database";
import type { Database } from "@kivvi/database";
import {
  PAYABLE_DOCUMENT_TYPES,
  ISSUED_STATUSES,
  IMPORTABLE_DOCUMENT_TYPES,
} from "../config/document-constants";
import { updateSequencesAfterImport } from "./import-bulk";
import {
  createInvoiceSentJournalEntry,
  createPurchaseInvoiceJournalEntry,
} from "./accounting-integration";

export interface DataRepairStatus {
  sequences: { type: string; prefix: string; nextNumber: number }[];
  sentInvoicesBefore2026: number;
  sentPurchaseInvoicesBefore2026: number;
  documentsWithoutItems: number;
  documentsWithoutJournalEntries: number;
  totalJournalEntries: number;
  paidInvoicesWithoutPaidDate: number;
}

/** Force-update number sequences to MAX(existing)+1 after migration. */
export async function repairNumberSequences(
  db: Database,
  companyId: string,
): Promise<Record<string, number>> {
  const updated: Record<string, number> = {};

  await updateSequencesAfterImport(db, companyId);

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

  const docTypes = [...IMPORTABLE_DOCUMENT_TYPES, "dunning"] as const;

  for (const docType of docTypes) {
    const seqType = docType;
    const [countResult] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(documents)
      .where(
        and(eq(documents.companyId, companyId), eq(documents.type, docType)),
      );

    const count = Number(countResult?.count || 0);
    const currentSeq = seqs.find((s) => s.type === seqType);

    if (count > 0 && currentSeq && currentSeq.nextNumber <= count) {
      const allDocs = await db
        .select({ number: documents.number })
        .from(documents)
        .where(
          and(eq(documents.companyId, companyId), eq(documents.type, docType)),
        );

      let maxNum = 0;
      for (const doc of allDocs) {
        if (!doc.number) continue;
        const dashMatch = doc.number.match(/-(\d+)$/);
        if (dashMatch) {
          const num = parseInt(dashMatch[1], 10);
          if (num > maxNum) maxNum = num;
        } else {
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

  return updated;
}

export async function repairHistoricalInvoiceStatuses(
  db: Database,
  companyId: string,
  cutoffDate?: string,
): Promise<{ updatedInvoices: number; updatedPurchaseInvoices: number }> {
  const cutoff = cutoffDate ? new Date(cutoffDate) : new Date("2026-01-01");

  const invoiceResult = await db
    .update(documents)
    .set({ status: "paid", updatedAt: new Date() })
    .where(
      and(
        eq(documents.companyId, companyId),
        eq(documents.type, "invoice"),
        eq(documents.status, "sent"),
        lt(documents.issueDate, cutoff),
      ),
    )
    .returning({ id: documents.id });

  const purchaseResult = await db
    .update(documents)
    .set({ status: "paid", updatedAt: new Date() })
    .where(
      and(
        eq(documents.companyId, companyId),
        eq(documents.type, "purchase_invoice"),
        eq(documents.status, "sent"),
        lt(documents.issueDate, cutoff),
      ),
    )
    .returning({ id: documents.id });

  return {
    updatedInvoices: invoiceResult.length,
    updatedPurchaseInvoices: purchaseResult.length,
  };
}

export async function generateMissingJournalEntries(
  db: Database,
  companyId: string,
): Promise<{
  invoiceEntries: number;
  purchaseEntries: number;
  skipped: number;
  errors: string[];
}> {
  let invoiceEntries = 0;
  let purchaseEntries = 0;
  let skipped = 0;
  const errors: string[] = [];

  const existingEntries = await db
    .select({ sourceId: journalEntries.sourceId })
    .from(journalEntries)
    .where(eq(journalEntries.companyId, companyId));

  const existingSourceIds = new Set(
    existingEntries.map((e) => e.sourceId).filter(Boolean),
  );

  const invoices = await db
    .select({
      id: documents.id,
      number: documents.number,
      total: documents.total,
      vatAmount: documents.vatAmount,
      subtotal: documents.subtotal,
      issueDate: documents.issueDate,
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
      if (new Decimal(total).isZero()) {
        skipped++;
        continue;
      }
      await createInvoiceSentJournalEntry(db, companyId, {
        id: inv.id,
        number: inv.number || "UNKNOWN",
        total,
        vatAmount: inv.vatAmount || "0",
        subtotal: inv.subtotal || "0",
        issueDate: inv.issueDate || new Date(),
      });
      invoiceEntries++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      if (errors.length < 10) errors.push(`Invoice ${inv.number}: ${msg}`);
    }
  }

  const purchaseInvoices = await db
    .select({
      id: documents.id,
      number: documents.number,
      total: documents.total,
      vatAmount: documents.vatAmount,
      subtotal: documents.subtotal,
      issueDate: documents.issueDate,
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
      if (new Decimal(total).isZero()) {
        skipped++;
        continue;
      }
      await createPurchaseInvoiceJournalEntry(db, companyId, {
        id: pi.id,
        number: pi.number || "UNKNOWN",
        total,
        vatAmount: pi.vatAmount || "0",
        subtotal: pi.subtotal || "0",
        issueDate: pi.issueDate || new Date(),
      });
      purchaseEntries++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      if (errors.length < 10) errors.push(`Purchase ${pi.number}: ${msg}`);
    }
  }

  return { invoiceEntries, purchaseEntries, skipped, errors };
}

export async function repairPaidDates(
  db: Database,
  companyId: string,
): Promise<number> {
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

  return result.length;
}

export async function getDataRepairStatus(
  db: Database,
  companyId: string,
): Promise<DataRepairStatus> {
  const sequences = await db
    .select({
      type: numberSequences.type,
      prefix: numberSequences.prefix,
      nextNumber: numberSequences.nextNumber,
    })
    .from(numberSequences)
    .where(eq(numberSequences.companyId, companyId));

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

  const [journalCount] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(journalEntries)
    .where(eq(journalEntries.companyId, companyId));

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
    sequences,
    sentInvoicesBefore2026: Number(sentInvoices?.count || 0),
    sentPurchaseInvoicesBefore2026: Number(sentPurchaseInvoices?.count || 0),
    documentsWithoutItems: Number(docsWithoutItems?.count || 0),
    documentsWithoutJournalEntries:
      Number(shouldHaveEntries?.count || 0) - Number(journalCount?.count || 0),
    totalJournalEntries: Number(journalCount?.count || 0),
    paidInvoicesWithoutPaidDate: Number(paidNoPaidDate?.count || 0),
  };
}
