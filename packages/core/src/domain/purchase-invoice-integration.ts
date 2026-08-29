/**
 * Purchase Invoice Integration — Auto-create inventory items when a purchase
 * invoice is confirmed AND the line items reference products with
 * `serialNumberTracking: true`.
 *
 * Ground Truth #2: One source of truth for every piece of data.
 * Previously, buying 30 laptops via purchase_invoice created a stock movement
 * (quantity increase) but ZERO tracked items — users had to manually create
 * an intake document afterward. Double entry.
 *
 * This bridge closes that gap: the purchase invoice IS the acquisition event
 * for individually tracked goods. Products flagged as `serialNumberTracking`
 * generate individual inventory items; others remain quantity-only.
 */

import { eq, inArray } from "drizzle-orm";
import { documentItems, inventoryItems, products } from "@kivvi/database";
import type { Database } from "@kivvi/database";
import { getNextNumber } from "./number-sequences";

/**
 * Create inventory items from a purchase invoice's line items.
 * Only creates items for products with serialNumberTracking enabled.
 * Called within the same transaction as the status confirmation.
 */
export async function createInventoryItemsFromPurchaseInvoice(
  tx: Database,
  companyId: string,
  doc: {
    id: string;
    contactId: string | null;
  },
): Promise<{ created: number }> {
  // Fetch line items with their linked products
  const items = await tx
    .select({
      item: documentItems,
      productId: documentItems.productId,
      unitPrice: documentItems.unitPrice,
      quantity: documentItems.quantity,
      description: documentItems.description,
    })
    .from(documentItems)
    .where(eq(documentItems.documentId, doc.id));

  if (items.length === 0) return { created: 0 };

  // Get products that have serialNumberTracking enabled
  const productIds = items.map((i) => i.productId).filter((id): id is string => !!id);

  if (productIds.length === 0) return { created: 0 };

  const trackedProducts = await tx
    .select({
      id: products.id,
      serialNumberTracking: products.serialNumberTracking,
    })
    .from(products)
    .where(inArray(products.id, productIds));

  const trackedSet = new Set(
    trackedProducts.filter((p) => p.serialNumberTracking === true).map((p) => p.id),
  );

  if (trackedSet.size === 0) return { created: 0 };

  let created = 0;
  const MAX_INDIVIDUAL_ITEMS = 100;

  for (const item of items) {
    if (!item.productId || !trackedSet.has(item.productId)) continue;

    const qty = Math.max(1, Math.floor(parseFloat(item.quantity || "1")));
    const unitCost = item.unitPrice && item.unitPrice !== "0" ? item.unitPrice : null;

    if (qty <= MAX_INDIVIDUAL_ITEMS) {
      for (let i = 0; i < qty; i++) {
        const itemNumber = await getNextNumber(tx, companyId, "inventory_item");
        await tx.insert(inventoryItems).values({
          companyId,
          itemNumber,
          description: item.description || "Unnamed item",
          productId: item.productId,
          condition: "untested",
          status: "intake",
          intakeDocumentId: doc.id,
          donorContactId: doc.contactId ?? null,
          estimatedValue: unitCost,
        });
        created++;
      }
    } else {
      // Bulk lot
      const itemNumber = await getNextNumber(tx, companyId, "inventory_item");
      await tx.insert(inventoryItems).values({
        companyId,
        itemNumber,
        description: `${item.description || "Unnamed item"} (${qty} Stk.)`,
        productId: item.productId,
        condition: "untested",
        status: "intake",
        intakeDocumentId: doc.id,
        donorContactId: doc.contactId ?? null,
        estimatedValue: unitCost,
        notes: `Bulk lot: ${qty} units`,
      });
      created++;
    }
  }

  return { created };
}
