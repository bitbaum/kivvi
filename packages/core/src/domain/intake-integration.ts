/**
 * Intake Integration — Auto-create inventory items when intake is confirmed.
 *
 * Ground Truth #1: "A business transaction either happened or it didn't."
 * When an intake is confirmed, each line item becomes a tracked inventory item.
 * This happens in the same transaction as the status update — atomic.
 *
 * Ground Truth #6: "Humans shouldn't do what machines can do."
 * No manual inventory item creation after confirming an intake.
 */

import { eq, and } from "drizzle-orm";
import { documentItems, inventoryItems } from "@kivvi/database";
import type { Database } from "@kivvi/database";
import { getNextNumber } from "./number-sequences";

/**
 * Create inventory items from intake document line items.
 * Called within the same transaction as the intake confirmation.
 */
export async function createInventoryItemsFromIntake(
  tx: Database,
  companyId: string,
  doc: {
    id: string;
    contactId: string | null;
    donorId?: string | null;
  },
): Promise<{ created: number }> {
  // Fetch line items for this intake document
  const items = await tx
    .select()
    .from(documentItems)
    .where(eq(documentItems.documentId, doc.id));

  if (items.length === 0) return { created: 0 };

  let created = 0;

  // Max individual items per line item. Above this, create a single bulk item.
  const MAX_INDIVIDUAL_ITEMS = 100;

  for (const item of items) {
    const qty = Math.max(1, Math.floor(parseFloat(item.quantity || "1")));
    const unitCost =
      item.unitPrice && item.unitPrice !== "0" ? item.unitPrice : null;

    if (qty <= MAX_INDIVIDUAL_ITEMS) {
      // Create one inventory item per unit (individually tracked)
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
          donorContactId: doc.donorId ?? doc.contactId ?? null,
          estimatedValue: unitCost,
        });
        created++;
      }
    } else {
      // Bulk: create a single item representing the lot
      const itemNumber = await getNextNumber(tx, companyId, "inventory_item");
      await tx.insert(inventoryItems).values({
        companyId,
        itemNumber,
        description: `${item.description || "Unnamed item"} (${qty} Stk.)`,
        productId: item.productId,
        condition: "untested",
        status: "intake",
        intakeDocumentId: doc.id,
        donorContactId: doc.donorId ?? doc.contactId ?? null,
        estimatedValue: unitCost,
        notes: `Bulk lot: ${qty} units`,
      });
      created++;
    }
  }

  return { created };
}
