"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  listPriceLists,
  getPriceList,
  createPriceList,
  updatePriceList,
  deletePriceList,
  createPriceRule,
  updatePriceRule,
  deletePriceRule,
  createPriceListSchema,
  updatePriceListSchema,
  createPriceRuleSchema,
  updatePriceRuleSchema,
} from "@kivvi/core";
import {
  type ActionResult,
  requireRole,
  safeErrorMessage,
  formatZodError,
} from "./utils";
import { getTranslations } from "next-intl/server";
import type { PriceList, PriceRule } from "@kivvi/database";
import type { PriceListWithRules } from "@kivvi/core/src/domain/pricing";

// ============================================================================
// PRICE LISTS
// ============================================================================

export async function listPriceListsAction(): Promise<
  ActionResult<PriceList[]>
> {
  const t = await getTranslations("priceLists");
  try {
    const { companyId } = await requireRole("member");
    const lists = await listPriceLists(db, companyId);
    return { success: true, data: lists };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorFailedToLoad")),
    };
  }
}

export async function getPriceListAction(
  id: string,
): Promise<ActionResult<PriceListWithRules>> {
  const t = await getTranslations("priceLists");
  try {
    const { companyId } = await requireRole("member");
    const list = await getPriceList(db, companyId, id);
    if (!list) return { success: false, error: t("errorNotFound") };
    return { success: true, data: list };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorFailedToLoad")),
    };
  }
}

export async function createPriceListAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const t = await getTranslations("priceLists");
  try {
    const { companyId } = await requireRole("member");
    const parsed = createPriceListSchema.safeParse(input);
    if (!parsed.success)
      return { success: false, ...formatZodError(parsed.error) };

    const list = await createPriceList(db, companyId, parsed.data);
    revalidatePath("/settings/price-lists");
    return { success: true, data: { id: list.id } };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorFailedToCreate")),
    };
  }
}

export async function updatePriceListAction(
  id: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const t = await getTranslations("priceLists");
  try {
    const { companyId } = await requireRole("member");
    const parsed = updatePriceListSchema.safeParse(input);
    if (!parsed.success)
      return { success: false, ...formatZodError(parsed.error) };

    const list = await updatePriceList(db, companyId, id, parsed.data);
    revalidatePath("/settings/price-lists");
    revalidatePath(`/settings/price-lists/${id}`);
    return { success: true, data: { id: list.id } };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorFailedToUpdate")),
    };
  }
}

export async function deletePriceListAction(
  id: string,
): Promise<ActionResult<void>> {
  const t = await getTranslations("priceLists");
  try {
    const { companyId } = await requireRole("member");
    await deletePriceList(db, companyId, id);
    revalidatePath("/settings/price-lists");
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorFailedToDelete")),
    };
  }
}

// ============================================================================
// PRICE RULES
// ============================================================================

export async function createPriceRuleAction(
  priceListId: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const t = await getTranslations("priceLists");
  try {
    const { companyId } = await requireRole("member");
    const parsed = createPriceRuleSchema.safeParse(input);
    if (!parsed.success)
      return { success: false, ...formatZodError(parsed.error) };

    const rule = await createPriceRule(db, companyId, priceListId, parsed.data);
    revalidatePath(`/settings/price-lists/${priceListId}`);
    return { success: true, data: { id: rule.id } };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorFailedToCreateRule")),
    };
  }
}

export async function updatePriceRuleAction(
  ruleId: string,
  priceListId: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const t = await getTranslations("priceLists");
  try {
    const { companyId } = await requireRole("member");
    const parsed = updatePriceRuleSchema.safeParse(input);
    if (!parsed.success)
      return { success: false, ...formatZodError(parsed.error) };

    const rule = await updatePriceRule(db, companyId, ruleId, parsed.data);
    revalidatePath(`/settings/price-lists/${priceListId}`);
    return { success: true, data: { id: rule.id } };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorFailedToUpdateRule")),
    };
  }
}

export async function deletePriceRuleAction(
  ruleId: string,
  priceListId: string,
): Promise<ActionResult<void>> {
  const t = await getTranslations("priceLists");
  try {
    const { companyId } = await requireRole("member");
    await deletePriceRule(db, companyId, ruleId);
    revalidatePath(`/settings/price-lists/${priceListId}`);
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorFailedToDeleteRule")),
    };
  }
}
