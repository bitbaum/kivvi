import { z } from "zod";
import { eq, and, or, ilike, desc, asc, count } from "drizzle-orm";
import { products, manufacturers, productGroups } from "@kivvi/database";
import type { Database } from "@kivvi/database";
import { DEFAULT_CURRENCY } from "../config/locale";
import {
  PRODUCT_TYPE_VALUES,
  UNIT_TYPE_VALUES,
  DEFAULT_UNIT,
} from "../config/product";
import { getNextNumber } from "./number-sequences";
import type { PaginatedResult } from "./contacts";
import { AMOUNT_REGEX, WEIGHT_REGEX } from "../utils/validation-patterns";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export const createProductSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().max(5000).optional().nullable(),
  type: z.enum(PRODUCT_TYPE_VALUES),
  sku: z.string().max(100).optional().nullable(),
  ean: z.string().max(50).optional().nullable(),
  manufacturerId: z.string().uuid().optional().nullable(),
  productGroupId: z.string().uuid().optional().nullable(),
  unitPrice: z.string().regex(AMOUNT_REGEX, "Invalid price format"),
  purchasePrice: z
    .string()
    .regex(AMOUNT_REGEX, "Invalid price format")
    .optional()
    .nullable(),
  currency: z.string().default(DEFAULT_CURRENCY),
  vatRate: z.string().regex(AMOUNT_REGEX, "Invalid VAT rate"),
  unit: z.enum(UNIT_TYPE_VALUES).default(DEFAULT_UNIT),
  weight: z
    .string()
    .regex(WEIGHT_REGEX, "Invalid weight")
    .optional()
    .nullable(),
  width: z.string().regex(AMOUNT_REGEX, "Invalid width").optional().nullable(),
  height: z
    .string()
    .regex(AMOUNT_REGEX, "Invalid height")
    .optional()
    .nullable(),
  depth: z.string().regex(AMOUNT_REGEX, "Invalid depth").optional().nullable(),
  minStock: z.coerce.number().int().min(0).optional().nullable(),
  serialNumberTracking: z.boolean().default(false),
  shopVisible: z.boolean().default(false),
  // Flexible pricing (Richtpreis)
  isPriceFlexible: z.boolean().default(false),
  minPrice: z
    .string()
    .regex(AMOUNT_REGEX, "Invalid price format")
    .optional()
    .nullable(),
  maxPrice: z
    .string()
    .regex(AMOUNT_REGEX, "Invalid price format")
    .optional()
    .nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

export const updateProductSchema = createProductSchema.partial();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

// ============================================================================
// FILTER TYPES
// ============================================================================

export interface ProductFilters {
  search?: string;
  type?: "product" | "service";
  productGroupId?: string;
  manufacturerId?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: "name" | "articleNumber" | "unitPrice" | "createdAt";
  sortOrder?: "asc" | "desc";
}

// PaginatedResult is exported from contacts.ts — no need to duplicate here

// ============================================================================
// DOMAIN FUNCTIONS
// ============================================================================

/**
 * List products with pagination, search, and filtering.
 */
export async function listProducts(
  db: Database,
  companyId: string,
  filters: ProductFilters = {},
): Promise<PaginatedResult<typeof products.$inferSelect>> {
  const {
    search,
    type,
    productGroupId,
    manufacturerId,
    isActive = true,
    page = 1,
    pageSize = 25,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = filters;

  // Build conditions
  const conditions = [eq(products.companyId, companyId)];

  if (isActive !== undefined) {
    conditions.push(eq(products.isActive, isActive));
  }

  if (type) {
    conditions.push(eq(products.type, type));
  }

  if (productGroupId) {
    conditions.push(eq(products.productGroupId, productGroupId));
  }

  if (manufacturerId) {
    conditions.push(eq(products.manufacturerId, manufacturerId));
  }

  if (search) {
    conditions.push(
      or(
        ilike(products.name, `%${search}%`),
        ilike(products.articleNumber, `%${search}%`),
        ilike(products.sku, `%${search}%`),
        ilike(products.ean, `%${search}%`),
      )!,
    );
  }

  const whereClause = and(...conditions);

  // Count total
  const [{ total: totalCount }] = await db
    .select({ total: count() })
    .from(products)
    .where(whereClause);

  // Sort
  const sortColumn = {
    name: products.name,
    articleNumber: products.articleNumber,
    unitPrice: products.unitPrice,
    createdAt: products.createdAt,
  }[sortBy];

  const orderFn = sortOrder === "asc" ? asc : desc;

  // Query with pagination
  const data = await db
    .select()
    .from(products)
    .where(whereClause)
    .orderBy(orderFn(sortColumn))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return {
    data,
    total: totalCount,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

/**
 * Get a single product with its manufacturer, product group, and stock levels.
 */
export async function getProduct(
  db: Database,
  companyId: string,
  productId: string,
) {
  const result = await db.query.products.findFirst({
    where: and(eq(products.id, productId), eq(products.companyId, companyId)),
    with: {
      manufacturer: true,
      productGroup: true,
      stockLevels: {
        with: {
          warehouse: true,
        },
      },
    },
  });

  return result ?? null;
}

/**
 * Verify that manufacturerId and productGroupId belong to the company.
 * Prevents cross-tenant FK references.
 */
async function validateProductFKs(
  db: Database,
  companyId: string,
  manufacturerId?: string | null,
  productGroupId?: string | null,
) {
  if (manufacturerId) {
    const [mfg] = await db
      .select({ id: manufacturers.id })
      .from(manufacturers)
      .where(
        and(
          eq(manufacturers.id, manufacturerId),
          eq(manufacturers.companyId, companyId),
        ),
      )
      .limit(1);
    if (!mfg) throw new Error("Manufacturer not found");
  }
  if (productGroupId) {
    const [grp] = await db
      .select({ id: productGroups.id })
      .from(productGroups)
      .where(
        and(
          eq(productGroups.id, productGroupId),
          eq(productGroups.companyId, companyId),
        ),
      )
      .limit(1);
    if (!grp) throw new Error("Product group not found");
  }
}

/**
 * Create a new product. Generates articleNumber automatically.
 */
export async function createProduct(
  db: Database,
  companyId: string,
  input: CreateProductInput,
) {
  // Validate input
  const validated = createProductSchema.parse(input);

  // Verify FK ownership
  await validateProductFKs(
    db,
    companyId,
    validated.manufacturerId,
    validated.productGroupId,
  );

  // Generate article number
  const articleNumber = await getNextNumber(db, companyId, "product");

  // Insert product
  const [product] = await db
    .insert(products)
    .values({
      companyId,
      articleNumber,
      name: validated.name,
      description: validated.description ?? null,
      type: validated.type,
      sku: validated.sku ?? null,
      ean: validated.ean ?? null,
      manufacturerId: validated.manufacturerId ?? null,
      productGroupId: validated.productGroupId ?? null,
      unitPrice: validated.unitPrice,
      purchasePrice: validated.purchasePrice ?? null,
      currency: validated.currency,
      vatRate: validated.vatRate,
      unit: validated.unit,
      weight: validated.weight ?? null,
      width: validated.width ?? null,
      height: validated.height ?? null,
      depth: validated.depth ?? null,
      minStock: validated.minStock ?? null,
      serialNumberTracking: validated.serialNumberTracking,
      shopVisible: validated.shopVisible,
      isActive: true,
    })
    .returning();

  return product;
}

/**
 * Update an existing product.
 */
export async function updateProduct(
  db: Database,
  companyId: string,
  productId: string,
  input: UpdateProductInput,
) {
  // Validate input
  const validated = updateProductSchema.parse(input);

  // Verify product belongs to company
  const existing = await db
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.id, productId), eq(products.companyId, companyId)))
    .limit(1);

  if (existing.length === 0) {
    throw new Error("Product not found");
  }

  // Verify FK ownership
  await validateProductFKs(
    db,
    companyId,
    validated.manufacturerId,
    validated.productGroupId,
  );

  // Build update values, only including fields that were provided
  const updateValues: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (validated.name !== undefined) updateValues.name = validated.name;
  if (validated.description !== undefined)
    updateValues.description = validated.description;
  if (validated.type !== undefined) updateValues.type = validated.type;
  if (validated.sku !== undefined) updateValues.sku = validated.sku;
  if (validated.ean !== undefined) updateValues.ean = validated.ean;
  if (validated.manufacturerId !== undefined)
    updateValues.manufacturerId = validated.manufacturerId;
  if (validated.productGroupId !== undefined)
    updateValues.productGroupId = validated.productGroupId;
  if (validated.unitPrice !== undefined)
    updateValues.unitPrice = validated.unitPrice;
  if (validated.purchasePrice !== undefined)
    updateValues.purchasePrice = validated.purchasePrice;
  if (validated.currency !== undefined)
    updateValues.currency = validated.currency;
  if (validated.vatRate !== undefined) updateValues.vatRate = validated.vatRate;
  if (validated.unit !== undefined) updateValues.unit = validated.unit;
  if (validated.weight !== undefined) updateValues.weight = validated.weight;
  if (validated.width !== undefined) updateValues.width = validated.width;
  if (validated.height !== undefined) updateValues.height = validated.height;
  if (validated.depth !== undefined) updateValues.depth = validated.depth;
  if (validated.minStock !== undefined)
    updateValues.minStock = validated.minStock;
  if (validated.serialNumberTracking !== undefined)
    updateValues.serialNumberTracking = validated.serialNumberTracking;
  if (validated.shopVisible !== undefined)
    updateValues.shopVisible = validated.shopVisible;

  const [updated] = await db
    .update(products)
    .set(updateValues)
    .where(and(eq(products.id, productId), eq(products.companyId, companyId)))
    .returning();

  return updated;
}

/**
 * Soft delete a product by setting isActive = false.
 */
export async function deleteProduct(
  db: Database,
  companyId: string,
  productId: string,
) {
  // Verify product belongs to company
  const existing = await db
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.id, productId), eq(products.companyId, companyId)))
    .limit(1);

  if (existing.length === 0) {
    throw new Error("Product not found");
  }

  const [deleted] = await db
    .update(products)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(products.id, productId), eq(products.companyId, companyId)))
    .returning();

  return deleted;
}

/**
 * Quick search products by name, SKU, or article number.
 * Returns a simple list (no pagination) for autocomplete/search use cases.
 */
export async function searchProducts(
  db: Database,
  companyId: string,
  query: string,
) {
  if (!query || query.length < 1) return [];

  const results = await db
    .select({
      id: products.id,
      articleNumber: products.articleNumber,
      sku: products.sku,
      name: products.name,
      type: products.type,
      unitPrice: products.unitPrice,
      currency: products.currency,
      vatRate: products.vatRate,
      unit: products.unit,
      stockQuantity: products.stockQuantity,
      isPriceFlexible: products.isPriceFlexible,
      minPrice: products.minPrice,
      maxPrice: products.maxPrice,
    })
    .from(products)
    .where(
      and(
        eq(products.companyId, companyId),
        eq(products.isActive, true),
        or(
          ilike(products.name, `%${query}%`),
          ilike(products.articleNumber, `%${query}%`),
          ilike(products.sku, `%${query}%`),
          ilike(products.ean, `%${query}%`),
        ),
      ),
    )
    .orderBy(asc(products.name))
    .limit(20);

  return results;
}
