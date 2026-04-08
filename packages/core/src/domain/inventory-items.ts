import { z } from "zod";
import { eq, and, ilike, desc, asc, sql, count, inArray } from "drizzle-orm";
import {
  inventoryItems,
  products,
  warehouses,
  contacts,
} from "@kivvi/database";
import type { Database, InventoryItem } from "@kivvi/database";
import type {
  ItemStatusValue,
  ItemConditionValue,
} from "@kivvi/database/src/enums";
import {
  ITEM_CONDITION_VALUES,
  ITEM_STATUS_VALUES,
} from "@kivvi/database/src/enums";
import { ITEM_STATUS_TRANSITIONS } from "../config/item-transitions";
import { getNextNumber } from "./number-sequences";
import { logger } from "../logger";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export const createInventoryItemSchema = z.object({
  description: z.string().min(1, "Description is required").max(500),
  productId: z.string().uuid().optional().nullable(),
  warehouseId: z.string().uuid().optional().nullable(),
  condition: z.enum(ITEM_CONDITION_VALUES).default("untested"),
  intakeDocumentId: z.string().uuid().optional().nullable(),
  donorContactId: z.string().uuid().optional().nullable(),
  estimatedValue: z.string().optional().nullable(),
  askingPrice: z.string().optional().nullable(),
  minPrice: z.string().optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  specs: z.record(z.string()).optional().nullable(),
  serialNumber: z.string().max(200).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
});

export const updateInventoryItemSchema = createInventoryItemSchema.partial();

export type CreateInventoryItemInput = z.infer<
  typeof createInventoryItemSchema
>;
export type UpdateInventoryItemInput = z.infer<
  typeof updateInventoryItemSchema
>;

// ============================================================================
// STATUS TRANSITIONS
// ============================================================================

// Status transitions imported from SSOT: packages/core/src/config/item-transitions.ts
const VALID_TRANSITIONS = ITEM_STATUS_TRANSITIONS;

// ============================================================================
// TYPES
// ============================================================================

export interface InventoryItemWithDetails extends InventoryItem {
  productName?: string | null;
  warehouseName?: string | null;
  donorName?: string | null;
  /** Derived: acquisition cost + total repair cost. The true cost basis for margin. */
  effectiveCost?: string | null;
}

/** Calculate effective cost: acquisition + repairs. Used for true margin. */
export function calculateEffectiveCost(item: {
  estimatedValue: string | null;
  repairCost: string | null;
}): string | null {
  if (!item.estimatedValue && !item.repairCost) return null;
  const base = item.estimatedValue ? parseFloat(item.estimatedValue) : 0;
  const repairs = item.repairCost ? parseFloat(item.repairCost) : 0;
  return (base + repairs).toFixed(2);
}

export interface PaginatedInventoryItems {
  data: InventoryItemWithDetails[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================================================
// CRUD
// ============================================================================

export async function createInventoryItem(
  db: Database,
  companyId: string,
  input: CreateInventoryItemInput,
): Promise<InventoryItem> {
  const itemNumber = await getNextNumber(db, companyId, "inventory_item");

  const [item] = await db
    .insert(inventoryItems)
    .values({
      companyId,
      itemNumber,
      description: input.description,
      productId: input.productId,
      warehouseId: input.warehouseId,
      condition: input.condition || "untested",
      status: "intake",
      intakeDocumentId: input.intakeDocumentId,
      donorContactId: input.donorContactId,
      estimatedValue: input.estimatedValue,
      askingPrice: input.askingPrice,
      minPrice: input.minPrice,
      notes: input.notes,
      specs: input.specs,
      serialNumber: input.serialNumber,
      location: input.location,
    })
    .returning();

  return item;
}

export async function updateInventoryItem(
  db: Database,
  companyId: string,
  itemId: string,
  input: UpdateInventoryItemInput,
): Promise<InventoryItem> {
  const [updated] = await db
    .update(inventoryItems)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(inventoryItems.id, itemId),
        eq(inventoryItems.companyId, companyId),
      ),
    )
    .returning();

  if (!updated) throw new Error("Inventory item not found");
  return updated;
}

export async function updateItemStatus(
  db: Database,
  companyId: string,
  itemId: string,
  newStatus: (typeof ITEM_STATUS_VALUES)[number],
): Promise<InventoryItem> {
  // Fetch current item
  const [current] = await db
    .select()
    .from(inventoryItems)
    .where(
      and(
        eq(inventoryItems.id, itemId),
        eq(inventoryItems.companyId, companyId),
      ),
    )
    .limit(1);

  if (!current) throw new Error("Inventory item not found");

  const allowed = VALID_TRANSITIONS[current.status] || [];
  if (!allowed.includes(newStatus)) {
    throw new Error(
      `Cannot transition from "${current.status}" to "${newStatus}"`,
    );
  }

  const [updated] = await db
    .update(inventoryItems)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(
      and(
        eq(inventoryItems.id, itemId),
        eq(inventoryItems.companyId, companyId),
      ),
    )
    .returning();

  return updated;
}

export async function updateItemCondition(
  db: Database,
  companyId: string,
  itemId: string,
  condition: (typeof ITEM_CONDITION_VALUES)[number],
): Promise<InventoryItem> {
  const [updated] = await db
    .update(inventoryItems)
    .set({ condition, updatedAt: new Date() })
    .where(
      and(
        eq(inventoryItems.id, itemId),
        eq(inventoryItems.companyId, companyId),
      ),
    )
    .returning();

  if (!updated) throw new Error("Inventory item not found");
  return updated;
}

export async function bulkUpdateStatus(
  db: Database,
  companyId: string,
  itemIds: string[],
  newStatus: (typeof ITEM_STATUS_VALUES)[number],
): Promise<{ succeeded: number; failed: number }> {
  let succeeded = 0;
  let failed = 0;

  for (const id of itemIds) {
    try {
      await updateItemStatus(db, companyId, id, newStatus);
      succeeded++;
    } catch (err) {
      logger.warn("Bulk status update failed for item", {
        itemId: id,
        newStatus,
        error: err instanceof Error ? err.message : String(err),
      });
      failed++;
    }
  }

  return { succeeded, failed };
}

/**
 * Mark an inventory item as sold and link it to a sale document.
 * This is the business-critical function that closes the revenue loop.
 * Records the sold price for margin calculation.
 */
export async function sellInventoryItem(
  db: Database,
  companyId: string,
  itemId: string,
  input: {
    saleDocumentId: string;
    soldPrice: string;
  },
): Promise<InventoryItem> {
  const [current] = await db
    .select()
    .from(inventoryItems)
    .where(
      and(
        eq(inventoryItems.id, itemId),
        eq(inventoryItems.companyId, companyId),
      ),
    )
    .limit(1);

  if (!current) throw new Error("Inventory item not found");

  // Item must be in a sellable state
  const sellableStatuses = ["ready_for_sale", "listed", "reserved"];
  if (!sellableStatuses.includes(current.status)) {
    throw new Error(
      `Cannot sell item in status "${current.status}". Must be ready_for_sale, listed, or reserved.`,
    );
  }

  const [updated] = await db
    .update(inventoryItems)
    .set({
      status: "sold",
      saleDocumentId: input.saleDocumentId,
      soldPrice: input.soldPrice,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(inventoryItems.id, itemId),
        eq(inventoryItems.companyId, companyId),
      ),
    )
    .returning();

  return updated;
}

/**
 * Record a repair on an inventory item. Accumulates cost, hours, and log entries.
 * Does NOT change status — staff manage that separately via updateItemStatus.
 */
export async function recordRepair(
  db: Database,
  companyId: string,
  itemId: string,
  input: {
    cost: string;
    hours?: string;
    note?: string;
  },
): Promise<InventoryItem> {
  const [current] = await db
    .select()
    .from(inventoryItems)
    .where(
      and(
        eq(inventoryItems.id, itemId),
        eq(inventoryItems.companyId, companyId),
      ),
    )
    .limit(1);

  if (!current) throw new Error("Inventory item not found");

  // Accumulate cost
  const currentCost = current.repairCost ? parseFloat(current.repairCost) : 0;
  const addedCost = parseFloat(input.cost);
  const newCost = (currentCost + addedCost).toFixed(2);

  // Accumulate hours
  const currentHours = current.repairHours
    ? parseFloat(current.repairHours)
    : 0;
  const addedHours = input.hours ? parseFloat(input.hours) : 0;
  const newHours = (currentHours + addedHours).toFixed(2);

  // Append to log with timestamp
  const date = new Date().toISOString().split("T")[0];
  const entry = `${date} — CHF ${addedCost.toFixed(2)}${
    addedHours > 0 ? ` / ${addedHours}h` : ""
  }${input.note ? `: ${input.note}` : ""}`;
  const newLog = current.repairLog ? `${current.repairLog}\n${entry}` : entry;

  const [updated] = await db
    .update(inventoryItems)
    .set({
      repairCost: newCost,
      repairHours: newHours,
      repairLog: newLog,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(inventoryItems.id, itemId),
        eq(inventoryItems.companyId, companyId),
      ),
    )
    .returning();

  return updated;
}

/**
 * Return a previously sold inventory item. Called when a credit note is sent.
 * Transitions sold → returned. Preserves saleDocumentId and soldPrice for audit history.
 */
export async function returnInventoryItem(
  db: Database,
  companyId: string,
  itemId: string,
): Promise<InventoryItem> {
  const [current] = await db
    .select()
    .from(inventoryItems)
    .where(
      and(
        eq(inventoryItems.id, itemId),
        eq(inventoryItems.companyId, companyId),
      ),
    )
    .limit(1);

  if (!current) throw new Error("Inventory item not found");

  // Only sold items can be returned
  if (current.status !== "sold") {
    throw new Error(
      `Cannot return item in status "${current.status}". Must be sold.`,
    );
  }

  const [updated] = await db
    .update(inventoryItems)
    .set({
      status: "returned",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(inventoryItems.id, itemId),
        eq(inventoryItems.companyId, companyId),
      ),
    )
    .returning();

  return updated;
}

export async function deleteInventoryItem(
  db: Database,
  companyId: string,
  itemId: string,
): Promise<void> {
  const result = await db
    .delete(inventoryItems)
    .where(
      and(
        eq(inventoryItems.id, itemId),
        eq(inventoryItems.companyId, companyId),
      ),
    );

  if (!result) throw new Error("Inventory item not found");
}

// ============================================================================
// QUERIES
// ============================================================================

export async function getInventoryItem(
  db: Database,
  companyId: string,
  itemId: string,
): Promise<InventoryItemWithDetails | null> {
  const result = await db
    .select({
      item: inventoryItems,
      productName: products.name,
      warehouseName: warehouses.name,
      donorName: contacts.name,
    })
    .from(inventoryItems)
    .leftJoin(products, eq(inventoryItems.productId, products.id))
    .leftJoin(warehouses, eq(inventoryItems.warehouseId, warehouses.id))
    .leftJoin(contacts, eq(inventoryItems.donorContactId, contacts.id))
    .where(
      and(
        eq(inventoryItems.id, itemId),
        eq(inventoryItems.companyId, companyId),
      ),
    )
    .limit(1);

  if (!result[0]) return null;

  return {
    ...result[0].item,
    productName: result[0].productName,
    warehouseName: result[0].warehouseName,
    donorName: result[0].donorName,
    effectiveCost: calculateEffectiveCost(result[0].item),
  };
}

export async function listInventoryItems(
  db: Database,
  companyId: string,
  options: {
    status?: string;
    condition?: string;
    search?: string;
    warehouseId?: string;
    intakeDocumentId?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  } = {},
): Promise<PaginatedInventoryItems> {
  const {
    status,
    condition,
    search,
    warehouseId,
    intakeDocumentId,
    page = 1,
    pageSize = 25,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = options;

  const conditions = [eq(inventoryItems.companyId, companyId)];

  if (status) {
    conditions.push(eq(inventoryItems.status, status as ItemStatusValue));
  }
  if (condition) {
    conditions.push(
      eq(inventoryItems.condition, condition as ItemConditionValue),
    );
  }
  if (warehouseId) {
    conditions.push(eq(inventoryItems.warehouseId, warehouseId));
  }
  if (intakeDocumentId) {
    conditions.push(eq(inventoryItems.intakeDocumentId, intakeDocumentId));
  }
  if (search) {
    conditions.push(ilike(inventoryItems.description, `%${search}%`));
  }

  const where = and(...conditions);

  // Count total
  const [{ total }] = await db
    .select({ total: count() })
    .from(inventoryItems)
    .where(where);

  // Fetch page
  const sortColumn =
    sortBy === "description"
      ? inventoryItems.description
      : sortBy === "status"
        ? inventoryItems.status
        : sortBy === "condition"
          ? inventoryItems.condition
          : inventoryItems.createdAt;

  const orderFn = sortOrder === "asc" ? asc : desc;

  const data = await db
    .select({
      item: inventoryItems,
      productName: products.name,
      warehouseName: warehouses.name,
      donorName: contacts.name,
    })
    .from(inventoryItems)
    .leftJoin(products, eq(inventoryItems.productId, products.id))
    .leftJoin(warehouses, eq(inventoryItems.warehouseId, warehouses.id))
    .leftJoin(contacts, eq(inventoryItems.donorContactId, contacts.id))
    .where(where)
    .orderBy(orderFn(sortColumn))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return {
    data: data.map((row) => ({
      ...row.item,
      productName: row.productName,
      warehouseName: row.warehouseName,
      donorName: row.donorName,
      effectiveCost: calculateEffectiveCost(row.item),
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/** Get counts per status for the sidebar/dashboard */
export async function getInventoryItemCounts(
  db: Database,
  companyId: string,
): Promise<Record<string, number>> {
  const result = await db
    .select({
      status: inventoryItems.status,
      count: count(),
    })
    .from(inventoryItems)
    .where(eq(inventoryItems.companyId, companyId))
    .groupBy(inventoryItems.status);

  return Object.fromEntries(result.map((r) => [r.status, r.count]));
}
