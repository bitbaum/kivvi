"use server";

import { db } from "@/lib/db";
import { listInventoryItems, searchProducts } from "@kivvi/core";
import { type ActionResult, requireRole, safeErrorMessage } from "./utils";
import { getTranslations } from "next-intl/server";
import { DEFAULT_VAT_RATE } from "@/lib/config/vat-rates";
import { SELLABLE_ITEM_STATUSES } from "@/lib/config/inventory-items";

/**
 * A "sellable" is either a catalog product or a specific tracked inventory item.
 * Secondhand businesses need to find both when creating an invoice:
 * - Catalog products for commodities (cables, accessories sold by quantity)
 * - Inventory items for individually tracked goods (this specific laptop)
 */
export interface SellableResult {
  kind: "product" | "inventory_item";
  id: string;
  /** For product: articleNumber. For inventory item: itemNumber. */
  number: string | null;
  name: string;
  /** Price: unitPrice for products, askingPrice (or estimatedValue) for items */
  price: string | null;
  vatRate: string | null;
  unit: string | null;
  stockQuantity: string | null;
  /** Inventory item specifics */
  condition?: string;
  productId?: string | null;
  /** Flexible pricing (Richtpreis) — catalog products only */
  isPriceFlexible?: boolean;
  minPrice?: string | null;
  maxPrice?: string | null;
}

/**
 * Combined search for catalog products and tracked inventory items.
 * Used by the document form's product search when creating invoices.
 */
export async function searchSellablesAction(
  query: string,
): Promise<ActionResult<SellableResult[]>> {
  const t = await getTranslations("sellables");
  try {
    const { companyId } = await requireRole("member");

    if (!query || query.length < 2) {
      return { success: true, data: [] };
    }

    const [readyForSale, listed, reserved] = SELLABLE_ITEM_STATUSES;
    const [products, items] = await Promise.all([
      searchProducts(db, companyId, query),
      listInventoryItems(db, companyId, {
        search: query,
        status: readyForSale,
        pageSize: 8,
      }),
    ]);

    const results: SellableResult[] = [];

    // Inventory items first (they're specific, more relevant for secondhand)
    for (const item of items.data) {
      results.push({
        kind: "inventory_item",
        id: item.id,
        number: item.itemNumber,
        name: item.description,
        price: item.askingPrice || item.estimatedValue || null,
        vatRate: DEFAULT_VAT_RATE,
        unit: "piece",
        stockQuantity: "1",
        condition: item.condition,
        productId: item.productId,
      });
    }

    // Also include listed and reserved items
    const [listedItems, reservedItems] = await Promise.all([
      listInventoryItems(db, companyId, {
        search: query,
        status: listed,
        pageSize: 4,
      }),
      listInventoryItems(db, companyId, {
        search: query,
        status: reserved,
        pageSize: 4,
      }),
    ]);
    for (const item of [...listedItems.data, ...reservedItems.data]) {
      results.push({
        kind: "inventory_item",
        id: item.id,
        number: item.itemNumber,
        name: item.description,
        price: item.askingPrice || item.estimatedValue || null,
        vatRate: DEFAULT_VAT_RATE,
        unit: "piece",
        stockQuantity: "1",
        condition: item.condition,
        productId: item.productId,
      });
    }

    // Then catalog products (limit to 8)
    for (const p of products.slice(0, 8)) {
      results.push({
        kind: "product",
        id: p.id,
        number: p.articleNumber,
        name: p.name,
        price: p.unitPrice,
        vatRate: p.vatRate,
        unit: p.unit,
        stockQuantity: p.stockQuantity,
        isPriceFlexible: p.isPriceFlexible ?? false,
        minPrice: p.minPrice,
        maxPrice: p.maxPrice,
      });
    }

    return { success: true, data: results.slice(0, 12) };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorSearchFailed")),
    };
  }
}
