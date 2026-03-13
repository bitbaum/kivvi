"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  createRecurringConfig,
  updateRecurringConfig,
  deleteRecurringConfig,
  createRecurringConfigSchema,
  updateRecurringConfigSchema,
} from "@kivvi/core";
import {
  type ActionResult,
  getSession,
  requireRole,
  safeErrorMessage,
} from "./utils";
import { createAction } from "./action-factory";

// ============================================================================
// SERVER ACTIONS
// ============================================================================

export const createRecurringConfigAction = createAction<
  unknown,
  { id: string }
>({
  handler: async (input, { companyId, db }) => {
    const parsed = createRecurringConfigSchema.safeParse(input);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      throw new Error(`${firstError.path.join(".")}: ${firstError.message}`);
    }
    const config = await createRecurringConfig(db, companyId, parsed.data);
    return { id: config.id };
  },
  revalidate: ["/settings/recurring-invoices"],
  errorMessage: "Failed to create recurring invoice config",
  minRole: "member",
});

export async function updateRecurringConfigAction(
  configId: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { companyId } = await requireRole("member");

    const parsed = updateRecurringConfigSchema.safeParse(input);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      return {
        success: false,
        error: `${firstError.path.join(".")}: ${firstError.message}`,
      };
    }

    const config = await updateRecurringConfig(
      db,
      companyId,
      configId,
      parsed.data,
    );

    revalidatePath("/settings/recurring-invoices");
    revalidatePath(`/settings/recurring-invoices/${configId}`);
    return { success: true, data: { id: config.id } };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(
        error,
        "Failed to update recurring invoice config",
      ),
    };
  }
}

export const deleteRecurringConfigAction = createAction<string, void>({
  handler: async (configId, { companyId, db }) => {
    await deleteRecurringConfig(db, companyId, configId);
  },
  revalidate: ["/settings/recurring-invoices"],
  errorMessage: "Failed to delete recurring invoice config",
  minRole: "member",
});

export async function toggleRecurringConfigAction(
  configId: string,
  isActive: boolean,
): Promise<ActionResult<void>> {
  try {
    const { companyId } = await requireRole("member");

    await updateRecurringConfig(db, companyId, configId, { isActive });

    revalidatePath("/settings/recurring-invoices");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(
        error,
        "Failed to toggle recurring invoice config",
      ),
    };
  }
}
