import { z } from "zod";
import { eq, and, gte, lte, ilike, inArray, count } from "drizzle-orm";
import { companies, inventoryItems } from "@kivvi/database";
import type { Database } from "@kivvi/database";
import { PUBLIC_ITEM_STATUSES } from "../config/item-status-sets";

// ============================================================================
// PUBLIC SHOP DOMAIN
// Public-facing functions — only expose safe, non-sensitive data.
// No authentication required; tenant isolation via slug→companyId lookup.
// ============================================================================

export { PUBLIC_ITEM_STATUSES };

export interface PublicCompany {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  country: string | null;
}

export interface PublicItem {
  id: string;
  itemNumber: string;
  description: string;
  category: string | null;
  condition: string;
  askingPrice: string | null;
  currency: string;
  photoBase64: string | null;
}

export interface PublicItemsResult {
  data: PublicItem[];
  total: number;
}

// ─── Filters ────────────────────────────────────────────────────────────────

export const listPublicItemsSchema = z.object({
  category: z.string().optional(),
  condition: z.string().optional(),
  minPrice: z.string().optional(),
  maxPrice: z.string().optional(),
  search: z.string().max(100).optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().min(1).max(48).default(24),
});

export type ListPublicItemsInput = z.infer<typeof listPublicItemsSchema>;

// ─── Domain functions ────────────────────────────────────────────────────────

export async function getPublicCompanyBySlug(
  db: Database,
  slug: string,
): Promise<PublicCompany | null> {
  const [company] = await db
    .select({
      id: companies.id,
      name: companies.name,
      slug: companies.slug,
      city: companies.city,
      country: companies.country,
    })
    .from(companies)
    .where(eq(companies.slug, slug))
    .limit(1);

  if (!company || !company.slug) return null;
  return company as PublicCompany;
}

export async function getPublicItem(
  db: Database,
  companyId: string,
  itemId: string,
): Promise<PublicItem | null> {
  const [row] = await db
    .select({
      id: inventoryItems.id,
      itemNumber: inventoryItems.itemNumber,
      description: inventoryItems.description,
      category: inventoryItems.category,
      condition: inventoryItems.condition,
      askingPrice: inventoryItems.askingPrice,
      photoBase64: inventoryItems.photoBase64,
    })
    .from(inventoryItems)
    .where(
      and(
        eq(inventoryItems.id, itemId),
        eq(inventoryItems.companyId, companyId),
        inArray(inventoryItems.status, [...PUBLIC_ITEM_STATUSES]),
      ),
    )
    .limit(1);

  if (!row) return null;
  return { ...row, currency: "CHF" };
}

export async function listPublicItems(
  db: Database,
  companyId: string,
  input: ListPublicItemsInput,
  currency: string = "CHF",
): Promise<PublicItemsResult> {
  const parsed = listPublicItemsSchema.parse(input);
  const { page, pageSize } = parsed;
  const offset = (page - 1) * pageSize;

  const conditions = [
    eq(inventoryItems.companyId, companyId),
    inArray(inventoryItems.status, [...PUBLIC_ITEM_STATUSES]),
  ];

  if (parsed.category) {
    conditions.push(eq(inventoryItems.category, parsed.category));
  }
  if (parsed.condition) {
    conditions.push(eq(inventoryItems.condition, parsed.condition as never));
  }
  if (parsed.minPrice) {
    conditions.push(gte(inventoryItems.askingPrice, parsed.minPrice));
  }
  if (parsed.maxPrice) {
    conditions.push(lte(inventoryItems.askingPrice, parsed.maxPrice));
  }
  if (parsed.search) {
    conditions.push(ilike(inventoryItems.description, `%${parsed.search}%`));
  }

  const where = and(...conditions);

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: inventoryItems.id,
        itemNumber: inventoryItems.itemNumber,
        description: inventoryItems.description,
        category: inventoryItems.category,
        condition: inventoryItems.condition,
        askingPrice: inventoryItems.askingPrice,
        photoBase64: inventoryItems.photoBase64,
      })
      .from(inventoryItems)
      .where(where)
      .orderBy(inventoryItems.createdAt)
      .limit(pageSize)
      .offset(offset),
    db.select({ total: count() }).from(inventoryItems).where(where),
  ]);

  return {
    data: rows.map((r) => ({ ...r, currency })),
    total: Number(total),
  };
}
