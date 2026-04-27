"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { documents, contacts, contactAddresses } from "@kivvi/database";
import { eq, and } from "drizzle-orm";
import { type ActionResult, requireRole, safeErrorMessage } from "./utils";
import { getTranslations } from "next-intl/server";
import {
  getDataQualityReport,
  type DataQualityReport,
} from "@kivvi/core/src/domain/data-quality";

// ============================================================================
// READ
// ============================================================================

export async function getDataQualityReportAction(): Promise<
  ActionResult<DataQualityReport>
> {
  try {
    const { companyId } = await requireRole("member");
    const report = await getDataQualityReport(db, companyId);
    return { success: true, data: report };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, "Failed to run data quality checks"),
    };
  }
}

// ============================================================================
// CONTACT MERGE
// Reassigns all documents from `duplicateId` to `primaryId`, then deletes
// the duplicate. The primary contact is the one that survives.
// ============================================================================

export async function mergeContactsAction(
  primaryId: string,
  duplicateId: string,
): Promise<ActionResult<{ documentsReassigned: number }>> {
  try {
    const { companyId } = await requireRole("admin");
    const t = await getTranslations("dataQuality");

    if (primaryId === duplicateId) {
      return { success: false, error: t("errorCannotMergeSelf") };
    }

    // Verify both contacts belong to this company
    const [primary] = await db
      .select({ id: contacts.id })
      .from(contacts)
      .where(
        and(eq(contacts.id, primaryId), eq(contacts.companyId, companyId)),
      );

    const [duplicate] = await db
      .select({ id: contacts.id })
      .from(contacts)
      .where(
        and(eq(contacts.id, duplicateId), eq(contacts.companyId, companyId)),
      );

    if (!primary) return { success: false, error: t("errorPrimaryNotFound") };
    if (!duplicate)
      return { success: false, error: t("errorDuplicateNotFound") };

    const result = await db.transaction(async (tx) => {
      // Reassign all documents
      const reassigned = await tx
        .update(documents)
        .set({ contactId: primaryId, updatedAt: new Date() })
        .where(
          and(
            eq(documents.contactId, duplicateId),
            eq(documents.companyId, companyId),
          ),
        )
        .returning({ id: documents.id });

      // Transfer any addresses that don't clash
      await tx
        .update(contactAddresses)
        .set({ contactId: primaryId })
        .where(eq(contactAddresses.contactId, duplicateId));

      // Soft-delete the duplicate
      await tx
        .update(contacts)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(contacts.id, duplicateId));

      return reassigned.length;
    });

    revalidatePath("/contacts");
    revalidatePath("/settings/data-repair");
    return { success: true, data: { documentsReassigned: result } };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, "Failed to merge contacts"),
    };
  }
}

// ============================================================================
// CANCEL ZERO-TOTAL DOCUMENTS
// Bulk-cancels non-draft documents with a zero total. These are bad migration
// artifacts — they can't be invoiced and clutter every list.
// ============================================================================

export async function cancelZeroTotalDocumentsAction(
  ids: string[],
): Promise<ActionResult<{ cancelled: number }>> {
  try {
    const { companyId } = await requireRole("admin");

    if (ids.length === 0) return { success: true, data: { cancelled: 0 } };

    const cancelled = await db.transaction(async (tx) => {
      const results = [];
      for (const id of ids) {
        const r = await tx
          .update(documents)
          .set({ status: "cancelled", updatedAt: new Date() })
          .where(and(eq(documents.id, id), eq(documents.companyId, companyId)))
          .returning({ id: documents.id });
        results.push(...r);
      }
      return results.length;
    });

    revalidatePath("/");
    return { success: true, data: { cancelled } };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, "Failed to cancel documents"),
    };
  }
}

// ============================================================================
// CANCEL STALE DRAFTS
// ============================================================================

export async function cancelStaleDraftsAction(
  ids: string[],
): Promise<ActionResult<{ cancelled: number }>> {
  try {
    const { companyId } = await requireRole("admin");

    if (ids.length === 0) return { success: true, data: { cancelled: 0 } };

    const cancelled = await db.transaction(async (tx) => {
      const results = [];
      for (const id of ids) {
        const r = await tx
          .update(documents)
          .set({ status: "cancelled", updatedAt: new Date() })
          .where(
            and(
              eq(documents.id, id),
              eq(documents.companyId, companyId),
              eq(documents.status, "draft"),
            ),
          )
          .returning({ id: documents.id });
        results.push(...r);
      }
      return results.length;
    });

    revalidatePath("/");
    return { success: true, data: { cancelled } };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, "Failed to cancel stale drafts"),
    };
  }
}

// ============================================================================
// REACTIVATE INACTIVE CONTACT
// ============================================================================

export async function reactivateContactAction(
  contactId: string,
): Promise<ActionResult<void>> {
  try {
    const { companyId } = await requireRole("admin");

    await db
      .update(contacts)
      .set({ isActive: true, updatedAt: new Date() })
      .where(
        and(eq(contacts.id, contactId), eq(contacts.companyId, companyId)),
      );

    revalidatePath("/contacts");
    revalidatePath("/settings/data-repair");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, "Failed to reactivate contact"),
    };
  }
}
