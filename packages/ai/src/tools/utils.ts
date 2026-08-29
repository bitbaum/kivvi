import type { Database } from "@kivvi/database";
import type { ExecutionContext } from "../types";

/**
 * Get the typed database instance from the execution context.
 * Centralizes the cast from `unknown` to `Database` in one place,
 * avoiding `as any` in every tool file.
 */
export function getDb(context: ExecutionContext): Database {
  return context.db as Database;
}

// ============================================================================
// Shared identifier-resolution helpers
// ============================================================================

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ARTICLE_NUMBER_RE = /^ART-\d+$/i;

export type ResolvedInventoryItem = {
  id: string;
  itemNumber: string;
  status: string;
  condition: string;
  description: string;
  repairCost: string | null;
  category: string | null;
  dataErasuredAt: Date | null;
  askingPrice: string | null;
};

/**
 * Resolve an inventory item by UUID or item number (e.g. IT-00042).
 * Returns null when not found — callers return an error to the user.
 */
export async function resolveInventoryItem(
  db: Database,
  companyId: string,
  identifier: string,
): Promise<ResolvedInventoryItem | null> {
  const { inventoryItems } = await import("@kivvi/database");
  const { eq, and } = await import("drizzle-orm");

  const isUUID = UUID_RE.test(identifier);

  const [row] = await db
    .select({
      id: inventoryItems.id,
      itemNumber: inventoryItems.itemNumber,
      status: inventoryItems.status,
      condition: inventoryItems.condition,
      description: inventoryItems.description,
      repairCost: inventoryItems.repairCost,
      category: inventoryItems.category,
      dataErasuredAt: inventoryItems.dataErasuredAt,
      askingPrice: inventoryItems.askingPrice,
    })
    .from(inventoryItems)
    .where(
      and(
        isUUID
          ? eq(inventoryItems.id, identifier)
          : eq(inventoryItems.itemNumber, identifier.toUpperCase()),
        eq(inventoryItems.companyId, companyId),
      ),
    )
    .limit(1);

  return row ?? null;
}

export type ResolvedProduct = {
  id: string;
  name: string;
  articleNumber: string | null;
  unitPrice: string;
  currency: string | null;
};

/**
 * Resolve a product by UUID, article number (ART-xxxxx), or name partial match.
 * Returns null when not found — callers return an error to the user.
 */
export async function resolveProduct(
  db: Database,
  companyId: string,
  identifier: string,
): Promise<ResolvedProduct | null> {
  const { products } = await import("@kivvi/database");
  const { eq, and, ilike } = await import("drizzle-orm");

  const cols = {
    id: products.id,
    name: products.name,
    articleNumber: products.articleNumber,
    unitPrice: products.unitPrice,
    currency: products.currency,
  };

  const base = db.select(cols).from(products);

  let row: ResolvedProduct | undefined;

  if (UUID_RE.test(identifier)) {
    [row] = await base
      .where(and(eq(products.id, identifier), eq(products.companyId, companyId)))
      .limit(1);
  } else if (ARTICLE_NUMBER_RE.test(identifier)) {
    [row] = await base
      .where(
        and(
          eq(products.articleNumber, identifier.toUpperCase()),
          eq(products.companyId, companyId),
        ),
      )
      .limit(1);
  } else {
    [row] = await base
      .where(and(ilike(products.name, `%${identifier}%`), eq(products.companyId, companyId)))
      .limit(1);
  }

  return row ?? null;
}

export type ResolvedPriceList = {
  id: string;
  name: string;
};

/**
 * Resolve a price list by partial name match (case-insensitive).
 * Returns null when not found — callers return an error to the user.
 */
export async function resolvePriceList(
  db: Database,
  companyId: string,
  nameQuery: string,
): Promise<ResolvedPriceList | null> {
  const { priceLists } = await import("@kivvi/database");
  const { eq, and, ilike } = await import("drizzle-orm");

  const [row] = await db
    .select({ id: priceLists.id, name: priceLists.name })
    .from(priceLists)
    .where(and(eq(priceLists.companyId, companyId), ilike(priceLists.name, `%${nameQuery}%`)))
    .limit(1);

  return row ?? null;
}
