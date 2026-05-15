import { z } from "zod";
import { eq, and, or, isNull, lte, gte } from "drizzle-orm";
import { priceLists, priceRules, products } from "@kivvi/database";
import type { Database } from "@kivvi/database";
import type { PriceList, PriceRule } from "@kivvi/database";
import { PRICE_RULE_TYPE_VALUES } from "@kivvi/database";
import Decimal from "decimal.js";
import { DEFAULT_CURRENCY } from "../config/locale";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export const createPriceListSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  currency: z.string().default(DEFAULT_CURRENCY),
  isDefault: z.boolean().default(false),
});

export const updatePriceListSchema = createPriceListSchema.partial();

export const createPriceRuleSchema = z.object({
  productId: z.string().uuid().optional().nullable(),
  productGroupId: z.string().uuid().optional().nullable(),
  type: z.enum(PRICE_RULE_TYPE_VALUES),
  value: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid value format"),
  minQuantity: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "Invalid quantity")
    .optional()
    .nullable(),
  validFrom: z.string().date().optional().nullable(),
  validTo: z.string().date().optional().nullable(),
});

export const updatePriceRuleSchema = createPriceRuleSchema.partial();

export type CreatePriceListInput = z.infer<typeof createPriceListSchema>;
export type UpdatePriceListInput = z.infer<typeof updatePriceListSchema>;
export type CreatePriceRuleInput = z.infer<typeof createPriceRuleSchema>;
export type UpdatePriceRuleInput = z.infer<typeof updatePriceRuleSchema>;

// ============================================================================
// PRICE LIST WITH RULES (enriched type)
// ============================================================================

export interface PriceListWithRules extends PriceList {
  rules: PriceRuleWithProduct[];
}

export interface PriceRuleWithProduct extends PriceRule {
  productName?: string | null;
  productSku?: string | null;
}

// ============================================================================
// CRUD — PRICE LISTS
// ============================================================================

export async function listPriceLists(
  db: Database,
  companyId: string,
): Promise<PriceList[]> {
  return db
    .select()
    .from(priceLists)
    .where(eq(priceLists.companyId, companyId))
    .orderBy(priceLists.name);
}

export async function getPriceList(
  db: Database,
  companyId: string,
  id: string,
): Promise<PriceListWithRules | null> {
  const [list] = await db
    .select()
    .from(priceLists)
    .where(and(eq(priceLists.id, id), eq(priceLists.companyId, companyId)));

  if (!list) return null;

  const rules = await db
    .select({
      id: priceRules.id,
      priceListId: priceRules.priceListId,
      productId: priceRules.productId,
      productGroupId: priceRules.productGroupId,
      type: priceRules.type,
      value: priceRules.value,
      minQuantity: priceRules.minQuantity,
      validFrom: priceRules.validFrom,
      validTo: priceRules.validTo,
      productName: products.name,
      productSku: products.sku,
    })
    .from(priceRules)
    .leftJoin(products, eq(priceRules.productId, products.id))
    .where(eq(priceRules.priceListId, id));

  return { ...list, rules };
}

export async function createPriceList(
  db: Database,
  companyId: string,
  input: CreatePriceListInput,
): Promise<PriceList> {
  if (input.isDefault) {
    await db
      .update(priceLists)
      .set({ isDefault: false })
      .where(eq(priceLists.companyId, companyId));
  }

  const [created] = await db
    .insert(priceLists)
    .values({ ...input, companyId })
    .returning();

  return created;
}

export async function updatePriceList(
  db: Database,
  companyId: string,
  id: string,
  input: UpdatePriceListInput,
): Promise<PriceList> {
  if (input.isDefault) {
    await db
      .update(priceLists)
      .set({ isDefault: false })
      .where(and(eq(priceLists.companyId, companyId)));
  }

  const [updated] = await db
    .update(priceLists)
    .set(input)
    .where(and(eq(priceLists.id, id), eq(priceLists.companyId, companyId)))
    .returning();

  if (!updated) throw new Error("Price list not found");
  return updated;
}

export async function deletePriceList(
  db: Database,
  companyId: string,
  id: string,
): Promise<void> {
  const [deleted] = await db
    .delete(priceLists)
    .where(and(eq(priceLists.id, id), eq(priceLists.companyId, companyId)))
    .returning({ id: priceLists.id });

  if (!deleted) throw new Error("Price list not found");
}

// ============================================================================
// CRUD — PRICE RULES
// ============================================================================

export async function createPriceRule(
  db: Database,
  companyId: string,
  priceListId: string,
  input: CreatePriceRuleInput,
): Promise<PriceRule> {
  const [list] = await db
    .select({ id: priceLists.id })
    .from(priceLists)
    .where(
      and(eq(priceLists.id, priceListId), eq(priceLists.companyId, companyId)),
    );

  if (!list) throw new Error("Price list not found");

  const [created] = await db
    .insert(priceRules)
    .values({ ...input, priceListId })
    .returning();

  return created;
}

export async function updatePriceRule(
  db: Database,
  companyId: string,
  ruleId: string,
  input: UpdatePriceRuleInput,
): Promise<PriceRule> {
  // Verify ownership via join through price list
  const [rule] = await db
    .select({ ruleId: priceRules.id })
    .from(priceRules)
    .innerJoin(priceLists, eq(priceRules.priceListId, priceLists.id))
    .where(and(eq(priceRules.id, ruleId), eq(priceLists.companyId, companyId)));

  if (!rule) throw new Error("Price rule not found");

  const [updated] = await db
    .update(priceRules)
    .set(input)
    .where(eq(priceRules.id, ruleId))
    .returning();

  return updated;
}

export async function deletePriceRule(
  db: Database,
  companyId: string,
  ruleId: string,
): Promise<void> {
  // Verify ownership
  const [rule] = await db
    .select({ ruleId: priceRules.id })
    .from(priceRules)
    .innerJoin(priceLists, eq(priceRules.priceListId, priceLists.id))
    .where(and(eq(priceRules.id, ruleId), eq(priceLists.companyId, companyId)));

  if (!rule) throw new Error("Price rule not found");

  await db.delete(priceRules).where(eq(priceRules.id, ruleId));
}

// ============================================================================
// PRICE RESOLUTION
// ============================================================================

/**
 * Resolve the effective price for a product given a price list.
 *
 * Rule priority (highest wins):
 *   1. Product-specific rule (matches productId)
 *   2. Group rule (matches productGroupId) — not applied here, requires product group context
 *   3. No rule → returns null (caller falls back to product.unitPrice)
 *
 * Rule types:
 *   - "fixed"      → use value directly as new unit price
 *   - "percentage" → apply discount: price * (1 - value/100)
 *   - "tiered"     → same as percentage but only applies at minQuantity threshold
 */

/**
 * Pure calculation: given a matched rule and the product's base price, compute
 * the resolved price. Returns null if the quantity doesn't meet the threshold.
 */
export function applyPriceRule(
  rule: { type: string; value: string; minQuantity?: string | null },
  basePrice: string,
  quantity?: number,
): { price: string; ruleType: string } | null {
  if (rule.type === "tiered" && quantity !== undefined && rule.minQuantity) {
    if (new Decimal(quantity).lt(new Decimal(rule.minQuantity))) {
      return null;
    }
  }

  if (rule.type === "percentage" || rule.type === "tiered") {
    const base = new Decimal(basePrice);
    const discount = new Decimal(rule.value).div(100);
    const price = base.times(new Decimal(1).minus(discount)).toFixed(2);
    return { price, ruleType: rule.type };
  }

  return { price: rule.value, ruleType: "fixed" };
}

export async function resolvePriceForProduct(
  db: Database,
  companyId: string,
  productId: string,
  priceListId: string,
  quantity?: number,
): Promise<{ price: string; ruleType: string } | null> {
  const today = new Date().toISOString().split("T")[0];

  const rules = await db
    .select({
      type: priceRules.type,
      value: priceRules.value,
      productId: priceRules.productId,
      minQuantity: priceRules.minQuantity,
      validFrom: priceRules.validFrom,
      validTo: priceRules.validTo,
    })
    .from(priceRules)
    .innerJoin(priceLists, eq(priceRules.priceListId, priceLists.id))
    .where(
      and(
        eq(priceRules.priceListId, priceListId),
        eq(priceLists.companyId, companyId),
        or(eq(priceRules.productId, productId), isNull(priceRules.productId)),
        or(isNull(priceRules.validFrom), lte(priceRules.validFrom, today)),
        or(isNull(priceRules.validTo), gte(priceRules.validTo, today)),
      ),
    )
    .orderBy(priceRules.productId); // non-null productId rows first (DESC nulls last)

  // Product-specific rule takes priority
  const productRule = rules.find((r) => r.productId === productId) || rules[0];
  if (!productRule) return null;

  // percentage/tiered rules need the product's base price
  if (productRule.type === "percentage" || productRule.type === "tiered") {
    const [product] = await db
      .select({ unitPrice: products.unitPrice })
      .from(products)
      .where(eq(products.id, productId));

    if (!product) return null;

    return applyPriceRule(productRule, product.unitPrice, quantity);
  }

  return applyPriceRule(productRule, productRule.value, quantity);
}
