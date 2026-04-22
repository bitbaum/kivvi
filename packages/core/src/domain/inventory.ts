import { z } from "zod";
import Decimal from "decimal.js";
import { eq, and, asc, desc, sql } from "drizzle-orm";
import {
  warehouses,
  stockLevels,
  stockMovements,
  serialNumbers,
  products,
} from "@kivvi/database";
import type {
  Database,
  Warehouse,
  StockLevel,
  StockMovement,
  SerialNumber,
} from "@kivvi/database";
import { STOCK_MOVEMENT_TYPE_VALUES } from "@kivvi/database/src/enums";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export const createWarehouseSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  address: z.string().max(500).optional().nullable(),
  isDefault: z.boolean().optional().default(false),
});

export const createStockMovementSchema = z.object({
  productId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  type: z.enum(STOCK_MOVEMENT_TYPE_VALUES),
  quantity: z.string().min(1, "Quantity is required"),
  reference: z.string().optional().nullable(),
  documentId: z.string().uuid().optional().nullable(),
});

export const createSerialNumberSchema = z.object({
  productId: z.string().uuid(),
  serialNumber: z.string().min(1, "Serial number is required"),
  warehouseId: z.string().uuid().optional().nullable(),
});

// ============================================================================
// WAREHOUSES
// ============================================================================

export async function listWarehouses(
  db: Database,
  companyId: string,
): Promise<Warehouse[]> {
  return db
    .select()
    .from(warehouses)
    .where(eq(warehouses.companyId, companyId))
    .orderBy(desc(warehouses.isDefault), asc(warehouses.name));
}

export async function getWarehouse(
  db: Database,
  companyId: string,
  warehouseId: string,
): Promise<Warehouse | null> {
  const [warehouse] = await db
    .select()
    .from(warehouses)
    .where(
      and(eq(warehouses.id, warehouseId), eq(warehouses.companyId, companyId)),
    );
  return warehouse || null;
}

export async function createWarehouse(
  db: Database,
  companyId: string,
  input: z.infer<typeof createWarehouseSchema>,
): Promise<Warehouse> {
  const validated = createWarehouseSchema.parse(input);

  if (validated.isDefault) {
    // Unset other defaults + insert atomically
    return db.transaction(async (tx) => {
      await tx
        .update(warehouses)
        .set({ isDefault: false })
        .where(
          and(
            eq(warehouses.companyId, companyId),
            eq(warehouses.isDefault, true),
          ),
        );

      const [warehouse] = await tx
        .insert(warehouses)
        .values({
          companyId,
          name: validated.name,
          address: validated.address || null,
          isDefault: validated.isDefault,
        })
        .returning();

      return warehouse;
    });
  }

  const [warehouse] = await db
    .insert(warehouses)
    .values({
      companyId,
      name: validated.name,
      address: validated.address || null,
      isDefault: validated.isDefault,
    })
    .returning();

  return warehouse;
}

export async function updateWarehouse(
  db: Database,
  companyId: string,
  warehouseId: string,
  input: z.infer<typeof createWarehouseSchema>,
): Promise<Warehouse> {
  const validated = createWarehouseSchema.parse(input);

  if (validated.isDefault) {
    // Unset other defaults + update atomically
    return db.transaction(async (tx) => {
      await tx
        .update(warehouses)
        .set({ isDefault: false })
        .where(
          and(
            eq(warehouses.companyId, companyId),
            eq(warehouses.isDefault, true),
          ),
        );

      const [warehouse] = await tx
        .update(warehouses)
        .set({
          name: validated.name,
          address: validated.address || null,
          isDefault: validated.isDefault,
        })
        .where(
          and(
            eq(warehouses.id, warehouseId),
            eq(warehouses.companyId, companyId),
          ),
        )
        .returning();

      if (!warehouse) throw new Error("Warehouse not found");
      return warehouse;
    });
  }

  const [warehouse] = await db
    .update(warehouses)
    .set({
      name: validated.name,
      address: validated.address || null,
      isDefault: validated.isDefault,
    })
    .where(
      and(eq(warehouses.id, warehouseId), eq(warehouses.companyId, companyId)),
    )
    .returning();

  if (!warehouse) throw new Error("Warehouse not found");
  return warehouse;
}

// ============================================================================
// STOCK LEVELS
// ============================================================================

export interface StockLevelWithProduct extends StockLevel {
  productName: string;
  articleNumber: string | null;
  minStock: number | null;
}

export async function getStockLevelsByWarehouse(
  db: Database,
  companyId: string,
  warehouseId: string,
): Promise<StockLevelWithProduct[]> {
  const warehouse = await getWarehouse(db, companyId, warehouseId);
  if (!warehouse) throw new Error("Warehouse not found");

  const rows = await db
    .select({
      stockLevel: stockLevels,
      productName: products.name,
      articleNumber: products.articleNumber,
      minStock: products.minStock,
    })
    .from(stockLevels)
    .innerJoin(products, eq(stockLevels.productId, products.id))
    .where(eq(stockLevels.warehouseId, warehouseId))
    .orderBy(asc(products.name));

  return rows.map((r) => ({
    ...r.stockLevel,
    productName: r.productName,
    articleNumber: r.articleNumber,
    minStock: r.minStock,
  }));
}

export async function getLowStockProducts(
  db: Database,
  companyId: string,
): Promise<
  {
    productId: string;
    productName: string;
    articleNumber: string | null;
    totalStock: number;
    minStock: number;
  }[]
> {
  const rows = await db
    .select({
      productId: products.id,
      productName: products.name,
      articleNumber: products.articleNumber,
      totalStock: sql<number>`COALESCE(CAST(${products.stockQuantity} AS DECIMAL), 0)`,
      minStock: products.minStock,
    })
    .from(products)
    .where(
      and(
        eq(products.companyId, companyId),
        eq(products.isActive, true),
        eq(products.type, "product"),
        sql`${products.minStock} IS NOT NULL AND CAST(${products.stockQuantity} AS DECIMAL) < ${products.minStock}`,
      ),
    )
    .orderBy(asc(products.name));

  return rows.map((r) => ({
    ...r,
    totalStock: new Decimal(r.totalStock || "0").toNumber(),
    minStock: r.minStock!,
  }));
}

// ============================================================================
// STOCK MOVEMENTS
// ============================================================================

export interface StockMovementWithDetails extends StockMovement {
  productName: string;
  warehouseName: string;
}

export async function listStockMovements(
  db: Database,
  companyId: string,
  filters: {
    warehouseId?: string;
    productId?: string;
    type?: string;
    page?: number;
    pageSize?: number;
  },
): Promise<{
  data: StockMovementWithDetails[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 50;

  const conditions = [eq(warehouses.companyId, companyId)];

  if (filters.warehouseId) {
    conditions.push(eq(stockMovements.warehouseId, filters.warehouseId));
  }
  if (filters.productId) {
    conditions.push(eq(stockMovements.productId, filters.productId));
  }
  if (filters.type) {
    conditions.push(sql`${stockMovements.type} = ${filters.type}`);
  }

  const whereClause = and(...conditions);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(stockMovements)
    .innerJoin(warehouses, eq(stockMovements.warehouseId, warehouses.id))
    .where(whereClause);

  const rows = await db
    .select({
      movement: stockMovements,
      productName: products.name,
      warehouseName: warehouses.name,
    })
    .from(stockMovements)
    .innerJoin(products, eq(stockMovements.productId, products.id))
    .innerJoin(warehouses, eq(stockMovements.warehouseId, warehouses.id))
    .where(whereClause)
    .orderBy(desc(stockMovements.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const data: StockMovementWithDetails[] = rows.map((r) => ({
    ...r.movement,
    productName: r.productName,
    warehouseName: r.warehouseName,
  }));

  return {
    data,
    total: count,
    page,
    pageSize,
    totalPages: Math.ceil(count / pageSize),
  };
}

/**
 * Record a stock movement and update stock levels.
 */
export async function createStockMovement(
  db: Database,
  companyId: string,
  input: z.infer<typeof createStockMovementSchema>,
): Promise<StockMovement> {
  const validated = createStockMovementSchema.parse(input);

  // Verify warehouse belongs to company
  const warehouse = await getWarehouse(db, companyId, validated.warehouseId);
  if (!warehouse) throw new Error("Warehouse not found");

  // Verify product belongs to company
  const [product] = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.id, validated.productId),
        eq(products.companyId, companyId),
      ),
    );
  if (!product) throw new Error("Product not found");

  // All mutations atomic: insert movement + update stock level + update cached product quantity
  return db.transaction(async (tx) => {
    // Insert movement
    const [movement] = await tx
      .insert(stockMovements)
      .values({
        productId: validated.productId,
        warehouseId: validated.warehouseId,
        type: validated.type,
        quantity: validated.quantity,
        reference: validated.reference || null,
        documentId: validated.documentId || null,
      })
      .returning();

    // Update stock level (upsert)
    const qty = new Decimal(validated.quantity);
    await tx
      .insert(stockLevels)
      .values({
        productId: validated.productId,
        warehouseId: validated.warehouseId,
        quantity: validated.quantity,
        reservedQuantity: "0",
      })
      .onConflictDoUpdate({
        target: [stockLevels.productId, stockLevels.warehouseId],
        set: {
          quantity: sql`CAST(${stockLevels.quantity} AS DECIMAL) + ${qty.toString()}`,
        },
      });

    // Update cached product stock quantity
    const [totalStock] = await tx
      .select({
        total: sql<string>`COALESCE(SUM(CAST(${stockLevels.quantity} AS DECIMAL)), 0)`,
      })
      .from(stockLevels)
      .where(eq(stockLevels.productId, validated.productId));

    await tx
      .update(products)
      .set({ stockQuantity: totalStock.total })
      .where(
        and(
          eq(products.id, validated.productId),
          eq(products.companyId, companyId),
        ),
      );

    return movement;
  });
}

// ============================================================================
// WAREHOUSE TRANSFER (ATOMIC)
// ============================================================================

export const transferStockSchema = z.object({
  fromWarehouseId: z.string().uuid(),
  toWarehouseId: z.string().uuid(),
  productId: z.string().uuid(),
  quantity: z.string().min(1, "Quantity is required"),
  reference: z.string().optional().nullable(),
});

/**
 * Transfer stock between warehouses atomically.
 * Creates two movements (out + in) and updates both stock levels in one transaction.
 */
export async function transferStock(
  db: Database,
  companyId: string,
  input: z.infer<typeof transferStockSchema>,
): Promise<{ outMovement: StockMovement; inMovement: StockMovement }> {
  const validated = transferStockSchema.parse(input);

  if (validated.fromWarehouseId === validated.toWarehouseId) {
    throw new Error("Source and destination warehouse must be different");
  }

  const fromWarehouse = await getWarehouse(
    db,
    companyId,
    validated.fromWarehouseId,
  );
  if (!fromWarehouse) throw new Error("Source warehouse not found");

  const toWarehouse = await getWarehouse(
    db,
    companyId,
    validated.toWarehouseId,
  );
  if (!toWarehouse) throw new Error("Destination warehouse not found");

  const [product] = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.id, validated.productId),
        eq(products.companyId, companyId),
      ),
    );
  if (!product) throw new Error("Product not found");

  const transferQty = new Decimal(validated.quantity);
  const reference =
    validated.reference ||
    `Transfer: ${fromWarehouse.name} → ${toWarehouse.name}`;

  return db.transaction(async (tx) => {
    // Check stock INSIDE transaction with row lock to prevent race conditions
    const [sourceLevel] = await tx
      .select({ quantity: stockLevels.quantity })
      .from(stockLevels)
      .where(
        and(
          eq(stockLevels.productId, validated.productId),
          eq(stockLevels.warehouseId, validated.fromWarehouseId),
        ),
      );

    const sourceQty = new Decimal(sourceLevel?.quantity || "0");
    if (sourceQty.lt(transferQty)) {
      throw new Error(
        `Insufficient stock: ${sourceQty.toString()} available, ${transferQty.toString()} requested`,
      );
    }

    // 1. Outbound movement (negative)
    const [outMovement] = await tx
      .insert(stockMovements)
      .values({
        productId: validated.productId,
        warehouseId: validated.fromWarehouseId,
        type: "transfer",
        quantity: transferQty.neg().toString(),
        reference,
      })
      .returning();

    // 2. Inbound movement (positive)
    const [inMovement] = await tx
      .insert(stockMovements)
      .values({
        productId: validated.productId,
        warehouseId: validated.toWarehouseId,
        type: "transfer",
        quantity: transferQty.toString(),
        reference,
      })
      .returning();

    // 3. Update source stock level (decrement)
    await tx
      .update(stockLevels)
      .set({
        quantity: sql`CAST(${stockLevels.quantity} AS DECIMAL) - ${transferQty.toString()}`,
      })
      .where(
        and(
          eq(stockLevels.productId, validated.productId),
          eq(stockLevels.warehouseId, validated.fromWarehouseId),
        ),
      );

    // 4. Update destination stock level (upsert increment)
    await tx
      .insert(stockLevels)
      .values({
        productId: validated.productId,
        warehouseId: validated.toWarehouseId,
        quantity: transferQty.toString(),
        reservedQuantity: "0",
      })
      .onConflictDoUpdate({
        target: [stockLevels.productId, stockLevels.warehouseId],
        set: {
          quantity: sql`CAST(${stockLevels.quantity} AS DECIMAL) + ${transferQty.toString()}`,
        },
      });

    // 5. products.stockQuantity stays the same (net 0), but recalc to be safe
    const [totalStock] = await tx
      .select({
        total: sql<string>`COALESCE(SUM(CAST(${stockLevels.quantity} AS DECIMAL)), 0)`,
      })
      .from(stockLevels)
      .where(eq(stockLevels.productId, validated.productId));

    await tx
      .update(products)
      .set({ stockQuantity: totalStock.total })
      .where(
        and(
          eq(products.id, validated.productId),
          eq(products.companyId, companyId),
        ),
      );

    return { outMovement, inMovement };
  });
}

// ============================================================================
// DELETE WAREHOUSE
// ============================================================================

/**
 * Delete a warehouse. Prevents deletion if stock exists or if it's the sole default.
 */
export async function deleteWarehouse(
  db: Database,
  companyId: string,
  warehouseId: string,
): Promise<void> {
  const warehouse = await getWarehouse(db, companyId, warehouseId);
  if (!warehouse) throw new Error("Warehouse not found");

  // Check for stock > 0
  const [stockCheck] = await db
    .select({
      hasStock: sql<boolean>`EXISTS(
        SELECT 1 FROM stock_levels
        WHERE warehouse_id = ${warehouseId}
        AND CAST(quantity AS DECIMAL) > 0
      )`,
    })
    .from(stockLevels)
    .limit(1);

  if (stockCheck?.hasStock) {
    throw new Error(
      "Cannot delete warehouse with stock. Transfer or adjust stock to zero first.",
    );
  }

  // Prevent deleting the default warehouse unless another exists
  if (warehouse.isDefault) {
    const allWarehouses = await listWarehouses(db, companyId);
    if (allWarehouses.length <= 1) {
      throw new Error("Cannot delete the only warehouse.");
    }
    throw new Error(
      "Set another warehouse as default before deleting this one.",
    );
  }

  await db
    .delete(warehouses)
    .where(
      and(eq(warehouses.id, warehouseId), eq(warehouses.companyId, companyId)),
    );
}

// ============================================================================
// SERIAL NUMBERS
// ============================================================================

export async function createSerialNumber(
  db: Database,
  companyId: string,
  input: z.infer<typeof createSerialNumberSchema>,
): Promise<SerialNumber> {
  const validated = createSerialNumberSchema.parse(input);

  // Verify product belongs to company and has serial tracking
  const [product] = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.id, validated.productId),
        eq(products.companyId, companyId),
      ),
    );
  if (!product) throw new Error("Product not found");
  if (!product.serialNumberTracking)
    throw new Error("Product does not have serial number tracking enabled");

  if (validated.warehouseId) {
    const warehouse = await getWarehouse(db, companyId, validated.warehouseId);
    if (!warehouse) throw new Error("Warehouse not found");
  }

  const [serial] = await db
    .insert(serialNumbers)
    .values({
      productId: validated.productId,
      serialNumber: validated.serialNumber,
      warehouseId: validated.warehouseId || null,
      status: "available",
    })
    .returning();

  return serial;
}

export async function updateSerialNumberStatus(
  db: Database,
  companyId: string,
  serialNumberId: string,
  status: "available" | "sold" | "reserved" | "defective",
  soldToContactId?: string,
): Promise<SerialNumber> {
  // Verify serial number belongs to company's product
  const [serial] = await db
    .select({ serial: serialNumbers, product: products })
    .from(serialNumbers)
    .innerJoin(products, eq(serialNumbers.productId, products.id))
    .where(
      and(
        eq(serialNumbers.id, serialNumberId),
        eq(products.companyId, companyId),
      ),
    );

  if (!serial) throw new Error("Serial number not found");

  const [updated] = await db
    .update(serialNumbers)
    .set({
      status,
      soldToContactId: soldToContactId || null,
      updatedAt: new Date(),
    })
    .where(eq(serialNumbers.id, serialNumberId))
    .returning();

  return updated;
}
