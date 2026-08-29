/**
 * Inventory Integration — Auto stock movements from document status transitions.
 *
 * Ground Truth #1: "Document creation + journal entries + stock movements = one transaction"
 *
 * Rules:
 * - delivery_note → "delivered": stock decreases (sale)
 * - invoice → "sent" (if no linked delivery note): stock decreases (sale)
 * - purchase_invoice → "confirmed": stock increases (purchase)
 * - credit_note → "sent": stock returns (return)
 * - cancelled: reverses previous stock movements for that document
 *
 * Only products (not services) with a productId on the line item create movements.
 * Uses the company's default warehouse.
 */

import Decimal from "decimal.js";
import { eq, and, sql } from "drizzle-orm";
import {
  documents,
  documentItems,
  warehouses,
  stockLevels,
  stockMovements,
  products,
} from "@kivvi/database";
import type { Database, DocumentStatus } from "@kivvi/database";

// ============================================================================
// STOCK MOVEMENTS FROM DOCUMENTS
// ============================================================================

/**
 * Create stock movements for a document status transition.
 * Called within the same transaction as the status update — atomic.
 */
export async function createStockMovementsForDocument(
  tx: Database,
  companyId: string,
  doc: {
    id: string;
    type: string;
    number: string;
    status: string;
    convertedFromId?: string | null;
  },
  newStatus: DocumentStatus,
): Promise<void> {
  // Handle cancellations: reverse any existing movements for this document
  if (newStatus === "cancelled") {
    await reverseStockMovements(tx, companyId, doc);
    return;
  }

  // Determine movement type based on document type + new status
  const movementConfig = getMovementConfig(doc.type, newStatus);
  if (!movementConfig) return;

  // Get the default warehouse
  const defaultWarehouse = await getDefaultWarehouse(tx, companyId);
  if (!defaultWarehouse) return;

  // For invoices: check if stock was already deducted via a delivery note
  if (doc.type === "invoice" && newStatus === "sent") {
    const alreadyDeducted = await hasDeliveryNoteDeduction(tx, companyId, doc);
    if (alreadyDeducted) return;
  }

  // Get product line items (skip services and freeform items)
  const productItems = await getProductLineItems(tx, doc.id);
  if (productItems.length === 0) return;

  // Create movements
  for (const item of productItems) {
    const absQty = new Decimal(item.quantity);
    const signedQty = movementConfig.direction === "out" ? absQty.neg() : absQty;

    await insertMovementAndUpdateStock(tx, companyId, {
      productId: item.productId,
      warehouseId: defaultWarehouse.id,
      type: movementConfig.movementType,
      quantity: signedQty,
      reference: doc.number,
      documentId: doc.id,
    });
  }
}

// ============================================================================
// CANCELLATION REVERSAL
// ============================================================================

/**
 * Reverse all stock movements created for a document.
 * Finds existing movements by documentId and creates opposite movements.
 */
async function reverseStockMovements(
  tx: Database,
  companyId: string,
  doc: { id: string; number: string },
): Promise<void> {
  // Find all movements linked to this document
  const existingMovements = await tx
    .select({
      productId: stockMovements.productId,
      warehouseId: stockMovements.warehouseId,
      quantity: stockMovements.quantity,
      type: stockMovements.type,
    })
    .from(stockMovements)
    .where(eq(stockMovements.documentId, doc.id));

  if (existingMovements.length === 0) return;

  for (const movement of existingMovements) {
    // Create reverse movement (negate the original quantity)
    const originalQty = new Decimal(movement.quantity);
    const reversalQty = originalQty.neg();

    await insertMovementAndUpdateStock(tx, companyId, {
      productId: movement.productId,
      warehouseId: movement.warehouseId,
      type: "adjustment", // Reversals are adjustments
      quantity: reversalQty,
      reference: `Cancellation: ${doc.number}`,
      documentId: doc.id,
    });
  }
}

// ============================================================================
// DELIVERY NOTE DETECTION (prevents double-deduction)
// ============================================================================

/**
 * Check if stock was already deducted for this invoice's goods via a delivery note.
 * Covers two cases:
 * 1. A delivery note was created directly FROM this invoice
 * 2. This invoice was converted from an order that has a delivered delivery note
 */
async function hasDeliveryNoteDeduction(
  tx: Database,
  companyId: string,
  doc: { id: string; convertedFromId?: string | null },
): Promise<boolean> {
  // Case 1: Delivery note created from this invoice (unlikely but possible)
  const [directDelivery] = await tx
    .select({ id: documents.id })
    .from(documents)
    .where(
      and(
        eq(documents.companyId, companyId),
        eq(documents.convertedFromId, doc.id),
        eq(documents.type, "delivery_note"),
      ),
    )
    .limit(1);

  if (directDelivery) return true;

  // Case 2: Invoice was converted from an order — check if that order has a delivered delivery note
  if (doc.convertedFromId) {
    const [deliveryFromSource] = await tx
      .select({ id: documents.id })
      .from(documents)
      .where(
        and(
          eq(documents.companyId, companyId),
          eq(documents.convertedFromId, doc.convertedFromId),
          eq(documents.type, "delivery_note"),
          eq(documents.status, "delivered"),
        ),
      )
      .limit(1);

    if (deliveryFromSource) return true;
  }

  return false;
}

// ============================================================================
// SHARED HELPERS
// ============================================================================

async function getDefaultWarehouse(
  tx: Database,
  companyId: string,
): Promise<{ id: string } | null> {
  const [warehouse] = await tx
    .select({ id: warehouses.id })
    .from(warehouses)
    .where(and(eq(warehouses.companyId, companyId), eq(warehouses.isDefault, true)))
    .limit(1);

  return warehouse ?? null;
}

async function getProductLineItems(
  tx: Database,
  documentId: string,
): Promise<Array<{ productId: string; quantity: string }>> {
  const items = await tx
    .select({
      productId: documentItems.productId,
      quantity: documentItems.quantity,
      productType: products.type,
    })
    .from(documentItems)
    .leftJoin(products, eq(documentItems.productId, products.id))
    .where(eq(documentItems.documentId, documentId));

  return items
    .filter((item) => item.productId && item.productType === "product")
    .map((item) => ({ productId: item.productId!, quantity: item.quantity }));
}

/**
 * Insert a stock movement and update the stock level + product cache atomically.
 */
async function insertMovementAndUpdateStock(
  tx: Database,
  companyId: string,
  params: {
    productId: string;
    warehouseId: string;
    type: string;
    quantity: Decimal;
    reference: string;
    documentId: string;
  },
): Promise<void> {
  // Insert movement
  await tx.insert(stockMovements).values({
    productId: params.productId,
    warehouseId: params.warehouseId,
    type: params.type as "sale" | "purchase" | "adjustment" | "transfer" | "return",
    quantity: params.quantity.toString(),
    reference: params.reference,
    documentId: params.documentId,
  });

  // Update stock level (upsert)
  await tx
    .insert(stockLevels)
    .values({
      productId: params.productId,
      warehouseId: params.warehouseId,
      quantity: params.quantity.toString(),
      reservedQuantity: "0",
    })
    .onConflictDoUpdate({
      target: [stockLevels.productId, stockLevels.warehouseId],
      set: {
        quantity: sql`CAST(${stockLevels.quantity} AS DECIMAL) + ${params.quantity.toString()}`,
      },
    });

  // Update cached product stock quantity
  const [totalStock] = await tx
    .select({
      total: sql<string>`COALESCE(SUM(CAST(${stockLevels.quantity} AS DECIMAL)), 0)`,
    })
    .from(stockLevels)
    .where(eq(stockLevels.productId, params.productId));

  await tx
    .update(products)
    .set({ stockQuantity: totalStock.total })
    .where(and(eq(products.id, params.productId), eq(products.companyId, companyId)));
}

interface MovementConfig {
  movementType: "sale" | "purchase" | "return";
  direction: "out" | "in";
}

function getMovementConfig(docType: string, newStatus: string): MovementConfig | null {
  if (docType === "delivery_note" && newStatus === "delivered") {
    return { movementType: "sale", direction: "out" };
  }
  if (docType === "invoice" && newStatus === "sent") {
    return { movementType: "sale", direction: "out" };
  }
  if (docType === "purchase_order" && newStatus === "delivered") {
    return { movementType: "purchase", direction: "in" };
  }
  if (docType === "purchase_invoice" && newStatus === "confirmed") {
    return { movementType: "purchase", direction: "in" };
  }
  if (docType === "credit_note" && newStatus === "sent") {
    return { movementType: "return", direction: "in" };
  }
  return null;
}

// ============================================================================
// STOCK RESERVATIONS
// ============================================================================

/**
 * Update stock reservations when order status changes.
 * - order → confirmed: reserve stock (reservedQuantity += item qty)
 * - order → delivered/cancelled: release reservation (reservedQuantity -= item qty)
 *
 * Called within the same transaction as the status update.
 */
export async function updateStockReservationsForDocument(
  tx: Database,
  companyId: string,
  doc: { id: string; type: string; status: string },
  newStatus: DocumentStatus,
): Promise<void> {
  if (doc.type !== "order") return;

  let reservationDelta: "increase" | "decrease" | null = null;

  if (newStatus === "confirmed" && (doc.status === "draft" || doc.status === "sent")) {
    reservationDelta = "increase";
  } else if (
    (newStatus === "delivered" || newStatus === "cancelled") &&
    doc.status === "confirmed"
  ) {
    reservationDelta = "decrease";
  }

  if (!reservationDelta) return;

  const defaultWarehouse = await getDefaultWarehouse(tx, companyId);
  if (!defaultWarehouse) return;

  const productItems = await getProductLineItems(tx, doc.id);
  if (productItems.length === 0) return;

  for (const item of productItems) {
    const qty = new Decimal(item.quantity);
    const delta = reservationDelta === "increase" ? qty : qty.neg();

    await tx
      .insert(stockLevels)
      .values({
        productId: item.productId,
        warehouseId: defaultWarehouse.id,
        quantity: "0",
        reservedQuantity: reservationDelta === "increase" ? qty.toString() : "0",
      })
      .onConflictDoUpdate({
        target: [stockLevels.productId, stockLevels.warehouseId],
        set: {
          reservedQuantity: sql`GREATEST(0, CAST(${stockLevels.reservedQuantity} AS DECIMAL) + ${delta.toString()})`,
        },
      });
  }
}
