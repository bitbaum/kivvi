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
  resolvePriceForProduct,
} from "@kivvi/core";
import { getTranslations } from "next-intl/server";
import type { PriceList } from "@kivvi/database";
import type { PriceListWithRules } from "@kivvi/core/src/domain/pricing";
import { createAction } from "./action-factory";

// ============================================================================
// PRICE LISTS
// ============================================================================

export const listPriceListsAction = createAction<void, PriceList[]>({
  handler: async (_input, { companyId, db }) => listPriceLists(db, companyId),
  errorMessage: () =>
    getTranslations("priceLists").then((t) => t("errorFailedToLoad")),
  minRole: "member",
});

export const getPriceListAction = createAction<string, PriceListWithRules>({
  handler: async (id, { companyId, db }) => {
    const list = await getPriceList(db, companyId, id);
    if (!list) throw new Error("Price list not found");
    return list;
  },
  errorMessage: () =>
    getTranslations("priceLists").then((t) => t("errorFailedToLoad")),
  minRole: "member",
});

export const createPriceListAction = createAction<unknown, { id: string }>({
  handler: async (input, { companyId, db }) => {
    const parsed = createPriceListSchema.safeParse(input);
    if (!parsed.success)
      throw new Error(parsed.error.errors[0]?.message || "Invalid input");
    const list = await createPriceList(db, companyId, parsed.data);
    return { id: list.id };
  },
  revalidate: ["/settings/price-lists"],
  errorMessage: () =>
    getTranslations("priceLists").then((t) => t("errorFailedToCreate")),
  minRole: "member",
});

export const updatePriceListAction = createAction<
  { id: string; input: unknown },
  { id: string }
>({
  handler: async ({ id, input }, { companyId, db }) => {
    const parsed = updatePriceListSchema.safeParse(input);
    if (!parsed.success)
      throw new Error(parsed.error.errors[0]?.message || "Invalid input");
    const list = await updatePriceList(db, companyId, id, parsed.data);
    revalidatePath(`/settings/price-lists/${id}`);
    return { id: list.id };
  },
  revalidate: ["/settings/price-lists"],
  errorMessage: () =>
    getTranslations("priceLists").then((t) => t("errorFailedToUpdate")),
  minRole: "member",
});

export const deletePriceListAction = createAction<string, void>({
  handler: async (id, { companyId, db }) => {
    await deletePriceList(db, companyId, id);
  },
  revalidate: ["/settings/price-lists"],
  errorMessage: () =>
    getTranslations("priceLists").then((t) => t("errorFailedToDelete")),
  minRole: "member",
});

// ============================================================================
// PRICE RULES
// ============================================================================

export const createPriceRuleAction = createAction<
  { priceListId: string; input: unknown },
  { id: string }
>({
  handler: async ({ priceListId, input }, { companyId, db }) => {
    const parsed = createPriceRuleSchema.safeParse(input);
    if (!parsed.success)
      throw new Error(parsed.error.errors[0]?.message || "Invalid input");
    const rule = await createPriceRule(db, companyId, priceListId, parsed.data);
    revalidatePath(`/settings/price-lists/${priceListId}`);
    return { id: rule.id };
  },
  errorMessage: () =>
    getTranslations("priceLists").then((t) => t("errorFailedToCreateRule")),
  minRole: "member",
});

export const updatePriceRuleAction = createAction<
  { ruleId: string; priceListId: string; input: unknown },
  { id: string }
>({
  handler: async ({ ruleId, priceListId, input }, { companyId, db }) => {
    const parsed = updatePriceRuleSchema.safeParse(input);
    if (!parsed.success)
      throw new Error(parsed.error.errors[0]?.message || "Invalid input");
    const rule = await updatePriceRule(db, companyId, ruleId, parsed.data);
    revalidatePath(`/settings/price-lists/${priceListId}`);
    return { id: rule.id };
  },
  errorMessage: () =>
    getTranslations("priceLists").then((t) => t("errorFailedToUpdateRule")),
  minRole: "member",
});

export const deletePriceRuleAction = createAction<
  { ruleId: string; priceListId: string },
  void
>({
  handler: async ({ ruleId, priceListId }, { companyId, db }) => {
    await deletePriceRule(db, companyId, ruleId);
    revalidatePath(`/settings/price-lists/${priceListId}`);
  },
  errorMessage: () =>
    getTranslations("priceLists").then((t) => t("errorFailedToDeleteRule")),
  minRole: "member",
});

// ============================================================================
// PRICE RESOLUTION (used by document creation form)
// ============================================================================

/**
 * Resolve the effective price for a set of (productId, quantity) pairs
 * against a price list. Returns a map of productId → resolved price string.
 * Items without a matching rule are omitted from the result.
 */
export const resolvePricesAction = createAction<
  {
    priceListId: string;
    items: Array<{ productId: string; quantity?: number }>;
  },
  Record<string, string>
>({
  handler: async ({ priceListId, items }, { companyId, db }) => {
    const results: Record<string, string> = {};
    await Promise.all(
      items.map(async ({ productId, quantity }) => {
        const resolved = await resolvePriceForProduct(
          db,
          companyId,
          productId,
          priceListId,
          quantity,
        );
        if (resolved) {
          results[productId] = resolved.price;
        }
      }),
    );
    return results;
  },
  errorMessage: () =>
    getTranslations("priceLists").then((t) => t("errorFailedToLoad")),
  minRole: "member",
});
