"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  repairNumberSequences,
  repairHistoricalInvoiceStatuses,
  generateMissingJournalEntries,
  repairPaidDates,
  getDataRepairStatus,
} from "@kivvi/core/src/domain/data-repair";
import { type ActionResult, getSession, requireRole, safeErrorMessage } from "./utils";
import { getTranslations } from "next-intl/server";

export async function repairNumberSequencesAction(): Promise<
  ActionResult<{ updated: Record<string, number> }>
> {
  const t = await getTranslations("settings.dataRepair");
  try {
    const { companyId } = await requireRole("admin");
    const updated = await repairNumberSequences(db, companyId);
    revalidatePath("/");
    return { success: true, data: { updated } };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorRepairSequences")),
    };
  }
}

export async function repairInvoiceStatusesAction(
  cutoffDate?: string,
): Promise<ActionResult<{ updatedInvoices: number; updatedPurchaseInvoices: number }>> {
  const t = await getTranslations("settings.dataRepair");
  try {
    const { companyId } = await requireRole("admin");
    const data = await repairHistoricalInvoiceStatuses(db, companyId, cutoffDate);
    revalidatePath("/");
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorRepairStatuses")),
    };
  }
}

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
    const data = await generateMissingJournalEntries(db, companyId);
    revalidatePath("/");
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorGenerateEntries")),
    };
  }
}

export async function repairPaidDatesAction(): Promise<ActionResult<{ updated: number }>> {
  const t = await getTranslations("settings.dataRepair");
  try {
    const { companyId } = await requireRole("admin");
    const updated = await repairPaidDates(db, companyId);
    revalidatePath("/");
    return { success: true, data: { updated } };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorRepairPaidDates")),
    };
  }
}

export async function getDataRepairStatusAction(): Promise<
  ActionResult<Awaited<ReturnType<typeof getDataRepairStatus>>>
> {
  const t = await getTranslations("settings.dataRepair");
  try {
    const { companyId } = await getSession();
    const data = await getDataRepairStatus(db, companyId);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorGetStatus")),
    };
  }
}
