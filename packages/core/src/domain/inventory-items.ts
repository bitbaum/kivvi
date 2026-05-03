import { z } from "zod";
import Decimal from "decimal.js";
import { eq, and, ilike, desc, asc, sql, count, inArray } from "drizzle-orm";
import {
  inventoryItems,
  repairParts,
  products,
  warehouses,
  contacts,
  users,
} from "@kivvi/database";
import type { Database, InventoryItem, RepairPart } from "@kivvi/database";
import type {
  ItemStatusValue,
  ItemConditionValue,
} from "@kivvi/database/src/enums";
import {
  ITEM_CONDITION_VALUES,
  ITEM_STATUS_VALUES,
} from "@kivvi/database/src/enums";
import { ITEM_STATUS_TRANSITIONS } from "../config/item-transitions";
import { SELLABLE_ITEM_STATUSES } from "../config/item-status-sets";
import {
  getChecklistTemplate,
  areBlockingChecksPassed,
  type ChecklistData,
  type ChecklistItemCompletion,
  DATA_ERASURE_METHODS,
} from "../config/checklist-templates";
import { getNextNumber } from "./number-sequences";
import { logger } from "../logger";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export const createInventoryItemSchema = z.object({
  description: z.string().min(1, "Description is required").max(500),
  productId: z.string().uuid().optional().nullable(),
  warehouseId: z.string().uuid().optional().nullable(),
  category: z.string().max(50).optional().nullable(),
  condition: z.enum(ITEM_CONDITION_VALUES).default("untested"),
  intakeDocumentId: z.string().uuid().optional().nullable(),
  donorContactId: z.string().uuid().optional().nullable(),
  assignedToUserId: z.string().uuid().optional().nullable(),
  estimatedValue: z.string().optional().nullable(),
  askingPrice: z.string().optional().nullable(),
  minPrice: z.string().optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  specs: z.record(z.string()).optional().nullable(),
  serialNumber: z.string().max(200).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  photoBase64: z.string().optional().nullable(),
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
  assignedToName?: string | null;
  /** Sum of all repair parts costs. Populated by listInventoryItems; null in getInventoryItem. */
  partsTotal?: string | null;
  /** Derived: acquisition cost + labour repairs + parts. The true cost basis for margin. */
  effectiveCost?: string | null;
}

/** Calculate effective cost: acquisition + labour repairs + parts. Used for true margin. */
export function calculateEffectiveCost(
  item: {
    estimatedValue: string | null;
    repairCost: string | null;
  },
  partsCost?: string | null,
): string | null {
  if (!item.estimatedValue && !item.repairCost && !partsCost) return null;
  const base = new Decimal(item.estimatedValue ?? "0");
  const labour = new Decimal(item.repairCost ?? "0");
  const parts = new Decimal(partsCost ?? "0");
  return base.plus(labour).plus(parts).toDecimalPlaces(2).toString();
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
      photoBase64: input.photoBase64,
      category: input.category,
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
  userId?: string,
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

  // ── Quality gates for ready_for_sale ────────────────────────────────────
  // These prevent selling items that haven't been properly assessed.
  let signedOffChecklistData: ChecklistData | null = null;
  if (newStatus === "ready_for_sale") {
    // Gate 1: condition must be assessed
    if (current.condition === "untested") {
      throw new Error(
        "Cannot approve for sale: condition not assessed. Set condition grade first.",
      );
    }

    // Gate 2: price must be set
    if (!current.askingPrice) {
      throw new Error("Cannot approve for sale: asking price not set.");
    }

    // Gate 3: blocking checklist items must all pass (if checklist was done)
    const checklistData = current.checklistData as ChecklistData | null;
    if (current.category && checklistData?.completions?.length) {
      const template = getChecklistTemplate(current.category);
      const { passed, missing } = areBlockingChecksPassed(
        template,
        checklistData.completions,
      );
      if (!passed) {
        throw new Error(
          `Cannot approve for sale: blocking checks incomplete or failed (${missing.join(", ")})`,
        );
      }
      // Stamp QC sign-off on the checklist data
      signedOffChecklistData = {
        ...checklistData,
        signedOffAt: new Date().toISOString(),
        ...(userId ? { signedOffBy: userId } : {}),
      };
    }
  }
  // ────────────────────────────────────────────────────────────────────────

  const now = new Date();
  const [updated] = await db
    .update(inventoryItems)
    .set({
      status: newStatus,
      ...(signedOffChecklistData
        ? { checklistData: signedOffChecklistData }
        : {}),
      updatedAt: now,
      statusUpdatedAt: now,
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
  if (!(SELLABLE_ITEM_STATUSES as readonly string[]).includes(current.status)) {
    throw new Error(
      `Cannot sell item in status "${current.status}". Must be ready_for_sale, listed, or reserved.`,
    );
  }

  const now = new Date();
  const [updated] = await db
    .update(inventoryItems)
    .set({
      status: "sold",
      saleDocumentId: input.saleDocumentId,
      soldPrice: input.soldPrice,
      updatedAt: now,
      statusUpdatedAt: now,
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
  const currentCost = new Decimal(current.repairCost ?? "0");
  const addedCost = new Decimal(input.cost);
  const newCost = currentCost.plus(addedCost).toDecimalPlaces(2).toString();

  // Accumulate hours
  const currentHours = new Decimal(current.repairHours ?? "0");
  const addedHours = new Decimal(input.hours ?? "0");
  const newHours = currentHours.plus(addedHours).toDecimalPlaces(2).toString();

  // Append to log with timestamp
  const date = new Date().toISOString().split("T")[0];
  const entry = `${date} — CHF ${addedCost.toDecimalPlaces(2).toString()}${
    addedHours.greaterThan(0) ? ` / ${addedHours}h` : ""
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

// ============================================================================
// REPAIR PARTS
// ============================================================================

export const addRepairPartSchema = z.object({
  description: z.string().min(1, "Description is required").max(200),
  quantity: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "Invalid quantity")
    .default("1"),
  unitCost: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid cost"),
  productId: z.string().uuid().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export type AddRepairPartInput = z.infer<typeof addRepairPartSchema>;

export type RepairPartWithProduct = RepairPart & {
  product: { id: string; name: string; articleNumber: string | null } | null;
};

/**
 * Add a part consumed during repair of an inventory item.
 * Returns the created part record (with product name if linked).
 */
export async function addRepairPart(
  db: Database,
  companyId: string,
  itemId: string,
  input: AddRepairPartInput,
  recordedByUserId?: string,
): Promise<RepairPartWithProduct> {
  // Verify the item belongs to this company
  const [item] = await db
    .select({ id: inventoryItems.id })
    .from(inventoryItems)
    .where(
      and(
        eq(inventoryItems.id, itemId),
        eq(inventoryItems.companyId, companyId),
      ),
    )
    .limit(1);
  if (!item) throw new Error("Inventory item not found");

  const [part] = await db
    .insert(repairParts)
    .values({
      companyId,
      inventoryItemId: itemId,
      productId: input.productId ?? null,
      description: input.description,
      quantity: input.quantity,
      unitCost: input.unitCost,
      notes: input.notes ?? null,
      recordedByUserId: recordedByUserId ?? null,
    })
    .returning();

  // Fetch with product name if linked
  if (part.productId) {
    const [prod] = await db
      .select({
        id: products.id,
        name: products.name,
        articleNumber: products.articleNumber,
      })
      .from(products)
      .where(eq(products.id, part.productId))
      .limit(1);
    return { ...part, product: prod ?? null };
  }

  return { ...part, product: null };
}

/**
 * Remove a repair part record. Validates tenant ownership.
 */
export async function removeRepairPart(
  db: Database,
  companyId: string,
  partId: string,
): Promise<void> {
  const [part] = await db
    .select({ id: repairParts.id })
    .from(repairParts)
    .where(
      and(eq(repairParts.id, partId), eq(repairParts.companyId, companyId)),
    )
    .limit(1);
  if (!part) throw new Error("Repair part not found");

  await db.delete(repairParts).where(eq(repairParts.id, partId));
}

/**
 * List all repair parts for an inventory item, newest first.
 */
export async function listRepairParts(
  db: Database,
  companyId: string,
  itemId: string,
): Promise<RepairPartWithProduct[]> {
  const rows = await db
    .select({
      part: repairParts,
      product: {
        id: products.id,
        name: products.name,
        articleNumber: products.articleNumber,
      },
    })
    .from(repairParts)
    .leftJoin(products, eq(repairParts.productId, products.id))
    .where(
      and(
        eq(repairParts.inventoryItemId, itemId),
        eq(repairParts.companyId, companyId),
      ),
    )
    .orderBy(desc(repairParts.createdAt));

  return rows.map((r) => ({ ...r.part, product: r.product ?? null }));
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

/**
 * Record checklist completions for an item.
 * Merges new completions with any existing ones (later completion for same id wins).
 * When a "data_erasure" check is passed, also stamps the erasure timestamp fields.
 */
export async function recordChecklist(
  db: Database,
  companyId: string,
  itemId: string,
  input: {
    category: string;
    completions: ChecklistItemCompletion[];
    userId: string;
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

  // Merge: existing completions + new ones (new wins on same id)
  const existing =
    (current.checklistData as ChecklistData | null)?.completions ?? [];
  const existingMap = new Map(existing.map((c) => [c.id, c]));
  for (const c of input.completions) {
    existingMap.set(c.id, c);
  }
  const merged = Array.from(existingMap.values());

  const checklistData: ChecklistData = {
    category: input.category,
    completions: merged,
  };

  // If data_erasure check was just passed, stamp the erasure fields
  const erasureCompletion = input.completions.find(
    (c) => c.id === "data_erasure" && c.result === "pass",
  );
  const erasureUpdate = erasureCompletion
    ? {
        dataErasuredAt: new Date(),
        dataErasuredByUserId: input.userId,
      }
    : {};

  const [updated] = await db
    .update(inventoryItems)
    .set({
      category: input.category,
      checklistData,
      ...erasureUpdate,
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
 * Record a manual data erasure event (outside of the checklist flow).
 * Used when erasure is done by an external certified service.
 */
export async function recordDataErasure(
  db: Database,
  companyId: string,
  itemId: string,
  input: {
    method: string;
    userId: string;
    notes?: string;
  },
): Promise<InventoryItem> {
  if (!DATA_ERASURE_METHODS[input.method]) {
    throw new Error(`Unknown erasure method: ${input.method}`);
  }

  const [updated] = await db
    .update(inventoryItems)
    .set({
      dataErasureMethod: input.method,
      dataErasuredAt: new Date(),
      dataErasuredByUserId: input.userId,
      notes: input.notes,
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
  const assignedUsers = users;
  const result = await db
    .select({
      item: inventoryItems,
      productName: products.name,
      warehouseName: warehouses.name,
      donorName: contacts.name,
      assignedToName: assignedUsers.name,
    })
    .from(inventoryItems)
    .leftJoin(products, eq(inventoryItems.productId, products.id))
    .leftJoin(warehouses, eq(inventoryItems.warehouseId, warehouses.id))
    .leftJoin(contacts, eq(inventoryItems.donorContactId, contacts.id))
    .leftJoin(
      assignedUsers,
      eq(inventoryItems.assignedToUserId, assignedUsers.id),
    )
    .where(
      and(
        eq(inventoryItems.id, itemId),
        eq(inventoryItems.companyId, companyId),
      ),
    )
    .limit(1);

  if (!result[0]) return null;

  // Aggregate parts cost for accurate effectiveCost (labour + parts)
  const [partsAgg] = await db
    .select({
      total: sql<string>`coalesce(sum(${repairParts.quantity} * ${repairParts.unitCost}), '0')`,
    })
    .from(repairParts)
    .where(
      and(
        eq(repairParts.inventoryItemId, itemId),
        eq(repairParts.companyId, companyId),
      ),
    );

  return {
    ...result[0].item,
    productName: result[0].productName,
    warehouseName: result[0].warehouseName,
    donorName: result[0].donorName,
    assignedToName: result[0].assignedToName,
    effectiveCost: calculateEffectiveCost(result[0].item, partsAgg?.total),
  };
}

export async function listInventoryItems(
  db: Database,
  companyId: string,
  options: {
    status?: string;
    statuses?: string[];
    condition?: string;
    search?: string;
    warehouseId?: string;
    intakeDocumentId?: string;
    assignedToUserId?: string | null;
    donorContactId?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  } = {},
): Promise<PaginatedInventoryItems> {
  const {
    status,
    statuses,
    condition,
    search,
    warehouseId,
    intakeDocumentId,
    assignedToUserId,
    donorContactId,
    page = 1,
    pageSize = 25,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = options;

  const conditions = [eq(inventoryItems.companyId, companyId)];

  if (statuses && statuses.length > 0) {
    conditions.push(
      inArray(inventoryItems.status, statuses as ItemStatusValue[]),
    );
  } else if (status) {
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
  if (assignedToUserId === null) {
    conditions.push(sql`${inventoryItems.assignedToUserId} is null`);
  } else if (assignedToUserId) {
    conditions.push(eq(inventoryItems.assignedToUserId, assignedToUserId));
  }
  if (donorContactId) {
    conditions.push(eq(inventoryItems.donorContactId, donorContactId));
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

  const assignedUsers = users;
  const data = await db
    .select({
      item: inventoryItems,
      productName: products.name,
      warehouseName: warehouses.name,
      donorName: contacts.name,
      assignedToName: assignedUsers.name,
      // Single-query parts aggregation — avoids N+1 while keeping the list fast
      partsTotal: sql<string>`(
        SELECT coalesce(sum(rp.quantity * rp.unit_cost), '0')::text
        FROM repair_parts rp
        WHERE rp.inventory_item_id = ${inventoryItems.id}
          AND rp.company_id = ${inventoryItems.companyId}
      )`,
    })
    .from(inventoryItems)
    .leftJoin(products, eq(inventoryItems.productId, products.id))
    .leftJoin(warehouses, eq(inventoryItems.warehouseId, warehouses.id))
    .leftJoin(contacts, eq(inventoryItems.donorContactId, contacts.id))
    .leftJoin(
      assignedUsers,
      eq(inventoryItems.assignedToUserId, assignedUsers.id),
    )
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
      assignedToName: row.assignedToName,
      partsTotal: row.partsTotal,
      effectiveCost: calculateEffectiveCost(row.item, row.partsTotal),
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

export async function getInventoryItemConditionCounts(
  db: Database,
  companyId: string,
  statusFilter?: string,
  warehouseId?: string,
): Promise<Record<string, number>> {
  const conditions = [eq(inventoryItems.companyId, companyId)];
  if (statusFilter) {
    conditions.push(eq(inventoryItems.status, statusFilter as ItemStatusValue));
  }
  if (warehouseId) {
    conditions.push(eq(inventoryItems.warehouseId, warehouseId));
  }

  const result = await db
    .select({
      condition: inventoryItems.condition,
      count: count(),
    })
    .from(inventoryItems)
    .where(and(...conditions))
    .groupBy(inventoryItems.condition);

  return Object.fromEntries(result.map((r) => [r.condition, r.count]));
}
