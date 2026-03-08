import { z } from 'zod';
import Decimal from 'decimal.js';
import { eq, and, asc, desc, sql } from 'drizzle-orm';
import {
  warehouses,
  stockLevels,
  stockMovements,
  serialNumbers,
  products,
} from '@kivvi/database';
import type {
  Database,
  Warehouse,
  StockLevel,
  StockMovement,
  SerialNumber,
} from '@kivvi/database';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export const createWarehouseSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  address: z.string().max(500).optional().nullable(),
  isDefault: z.boolean().optional().default(false),
});

export const createStockMovementSchema = z.object({
  productId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  type: z.enum(['purchase', 'sale', 'adjustment', 'transfer', 'return']),
  quantity: z.string().min(1, 'Quantity is required'),
  reference: z.string().optional().nullable(),
  documentId: z.string().uuid().optional().nullable(),
});

export const createSerialNumberSchema = z.object({
  productId: z.string().uuid(),
  serialNumber: z.string().min(1, 'Serial number is required'),
  warehouseId: z.string().uuid().optional().nullable(),
});

// ============================================================================
// WAREHOUSES
// ============================================================================

export async function listWarehouses(
  db: Database,
  companyId: string
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
  warehouseId: string
): Promise<Warehouse | null> {
  const [warehouse] = await db
    .select()
    .from(warehouses)
    .where(and(eq(warehouses.id, warehouseId), eq(warehouses.companyId, companyId)));
  return warehouse || null;
}

export async function createWarehouse(
  db: Database,
  companyId: string,
  input: z.infer<typeof createWarehouseSchema>
): Promise<Warehouse> {
  const validated = createWarehouseSchema.parse(input);

  if (validated.isDefault) {
    // Unset other defaults + insert atomically
    return db.transaction(async (tx) => {
      await tx
        .update(warehouses)
        .set({ isDefault: false })
        .where(and(eq(warehouses.companyId, companyId), eq(warehouses.isDefault, true)));

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
  input: z.infer<typeof createWarehouseSchema>
): Promise<Warehouse> {
  const validated = createWarehouseSchema.parse(input);

  if (validated.isDefault) {
    // Unset other defaults + update atomically
    return db.transaction(async (tx) => {
      await tx
        .update(warehouses)
        .set({ isDefault: false })
        .where(and(eq(warehouses.companyId, companyId), eq(warehouses.isDefault, true)));

      const [warehouse] = await tx
        .update(warehouses)
        .set({
          name: validated.name,
          address: validated.address || null,
          isDefault: validated.isDefault,
        })
        .where(and(eq(warehouses.id, warehouseId), eq(warehouses.companyId, companyId)))
        .returning();

      if (!warehouse) throw new Error('Warehouse not found');
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
    .where(and(eq(warehouses.id, warehouseId), eq(warehouses.companyId, companyId)))
    .returning();

  if (!warehouse) throw new Error('Warehouse not found');
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
  warehouseId: string
): Promise<StockLevelWithProduct[]> {
  const warehouse = await getWarehouse(db, companyId, warehouseId);
  if (!warehouse) throw new Error('Warehouse not found');

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

export async function getStockLevelsByProduct(
  db: Database,
  companyId: string,
  productId: string
): Promise<(StockLevel & { warehouseName: string })[]> {
  const rows = await db
    .select({
      stockLevel: stockLevels,
      warehouseName: warehouses.name,
    })
    .from(stockLevels)
    .innerJoin(warehouses, eq(stockLevels.warehouseId, warehouses.id))
    .where(and(eq(stockLevels.productId, productId), eq(warehouses.companyId, companyId)))
    .orderBy(asc(warehouses.name));

  return rows.map((r) => ({
    ...r.stockLevel,
    warehouseName: r.warehouseName,
  }));
}

export async function getLowStockProducts(
  db: Database,
  companyId: string
): Promise<{ productId: string; productName: string; articleNumber: string | null; totalStock: number; minStock: number }[]> {
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
        eq(products.type, 'product'),
        sql`${products.minStock} IS NOT NULL AND CAST(${products.stockQuantity} AS DECIMAL) < ${products.minStock}`
      )
    )
    .orderBy(asc(products.name));

  return rows.map((r) => ({
    ...r,
    totalStock: Number(r.totalStock),
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
  }
): Promise<{ data: StockMovementWithDetails[]; total: number; page: number; pageSize: number; totalPages: number }> {
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

  return { data, total: count, page, pageSize, totalPages: Math.ceil(count / pageSize) };
}

/**
 * Record a stock movement and update stock levels.
 */
export async function createStockMovement(
  db: Database,
  companyId: string,
  input: z.infer<typeof createStockMovementSchema>
): Promise<StockMovement> {
  const validated = createStockMovementSchema.parse(input);

  // Verify warehouse belongs to company
  const warehouse = await getWarehouse(db, companyId, validated.warehouseId);
  if (!warehouse) throw new Error('Warehouse not found');

  // Verify product belongs to company
  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, validated.productId), eq(products.companyId, companyId)));
  if (!product) throw new Error('Product not found');

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
        reservedQuantity: '0',
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
      .where(and(
        eq(products.id, validated.productId),
        eq(products.companyId, companyId)
      ));

    return movement;
  });
}

// ============================================================================
// SERIAL NUMBERS
// ============================================================================

export async function listSerialNumbers(
  db: Database,
  companyId: string,
  productId: string
): Promise<(SerialNumber & { warehouseName: string | null })[]> {
  // Verify product belongs to company
  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, productId), eq(products.companyId, companyId)));
  if (!product) throw new Error('Product not found');

  const rows = await db
    .select({
      serial: serialNumbers,
      warehouseName: warehouses.name,
    })
    .from(serialNumbers)
    .leftJoin(warehouses, eq(serialNumbers.warehouseId, warehouses.id))
    .where(eq(serialNumbers.productId, productId))
    .orderBy(asc(serialNumbers.serialNumber));

  return rows.map((r) => ({
    ...r.serial,
    warehouseName: r.warehouseName,
  }));
}

export async function createSerialNumber(
  db: Database,
  companyId: string,
  input: z.infer<typeof createSerialNumberSchema>
): Promise<SerialNumber> {
  const validated = createSerialNumberSchema.parse(input);

  // Verify product belongs to company and has serial tracking
  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, validated.productId), eq(products.companyId, companyId)));
  if (!product) throw new Error('Product not found');
  if (!product.serialNumberTracking) throw new Error('Product does not have serial number tracking enabled');

  if (validated.warehouseId) {
    const warehouse = await getWarehouse(db, companyId, validated.warehouseId);
    if (!warehouse) throw new Error('Warehouse not found');
  }

  const [serial] = await db
    .insert(serialNumbers)
    .values({
      productId: validated.productId,
      serialNumber: validated.serialNumber,
      warehouseId: validated.warehouseId || null,
      status: 'available',
    })
    .returning();

  return serial;
}

export async function updateSerialNumberStatus(
  db: Database,
  companyId: string,
  serialNumberId: string,
  status: 'available' | 'sold' | 'reserved' | 'defective',
  soldToContactId?: string
): Promise<SerialNumber> {
  // Verify serial number belongs to company's product
  const [serial] = await db
    .select({ serial: serialNumbers, product: products })
    .from(serialNumbers)
    .innerJoin(products, eq(serialNumbers.productId, products.id))
    .where(and(eq(serialNumbers.id, serialNumberId), eq(products.companyId, companyId)));

  if (!serial) throw new Error('Serial number not found');

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
