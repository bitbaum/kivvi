/**
 * Posting groups (Kivitendo "Buchungsgruppen") — configurable revenue-account
 * routing per article/line. Replaces the hardcoded product/service → 3000/3200
 * split. See POSTING_GROUP_REVENUE_ROUTING_SPEC.md.
 */
import { z } from "zod";
import { eq, and, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { accounts, products, productGroups, documentItems, postingGroups } from "@kivvi/database";
import type { Database, PostingGroup } from "@kivvi/database";

/** Legacy fallback revenue accounts when no posting group is configured. */
const LEGACY_PRODUCT_REVENUE = "3000"; // Warenertrag
const LEGACY_SERVICE_REVENUE = "3200"; // Dienstleistungserlöse

/**
 * Pure precedence resolver (most specific wins): line override → product →
 * product-group default → company default → legacy product/service split.
 * Kept pure so the routing rule is unit-testable without a DB.
 */
export function pickRevenueAccountCode(input: {
  itemAccountCode?: string | null;
  productAccountCode?: string | null;
  groupAccountCode?: string | null;
  defaultAccountCode?: string | null;
  productType?: "product" | "service" | null;
}): string {
  return (
    input.itemAccountCode ||
    input.productAccountCode ||
    input.groupAccountCode ||
    input.defaultAccountCode ||
    (input.productType === "service" ? LEGACY_SERVICE_REVENUE : LEGACY_PRODUCT_REVENUE)
  );
}

export interface ResolvedRevenueLine {
  total: string;
  revenueAccountCode: string;
}

/**
 * Resolve the revenue Erlöskonto for every line of a document via the 3-level
 * posting-group chain, with the legacy product/service fallback.
 */
export async function resolveLineRevenueAccounts(
  db: Database,
  companyId: string,
  documentId: string,
): Promise<ResolvedRevenueLine[]> {
  const pgItem = alias(postingGroups, "pg_item");
  const pgProd = alias(postingGroups, "pg_prod");
  const pgGrp = alias(postingGroups, "pg_grp");

  const rows = await db
    .select({
      total: documentItems.total,
      productType: products.type,
      itemRevId: pgItem.revenueAccountId,
      prodRevId: pgProd.revenueAccountId,
      grpRevId: pgGrp.revenueAccountId,
    })
    .from(documentItems)
    .leftJoin(products, eq(documentItems.productId, products.id))
    .leftJoin(productGroups, eq(products.productGroupId, productGroups.id))
    .leftJoin(pgItem, eq(documentItems.postingGroupId, pgItem.id))
    .leftJoin(pgProd, eq(products.postingGroupId, pgProd.id))
    .leftJoin(pgGrp, eq(productGroups.defaultPostingGroupId, pgGrp.id))
    .where(eq(documentItems.documentId, documentId));

  const [def] = await db
    .select({ revId: postingGroups.revenueAccountId })
    .from(postingGroups)
    .where(
      and(
        eq(postingGroups.companyId, companyId),
        eq(postingGroups.isDefault, true),
        eq(postingGroups.isActive, true),
      ),
    )
    .limit(1);

  const accts = await db
    .select({ id: accounts.id, code: accounts.code })
    .from(accounts)
    .where(eq(accounts.companyId, companyId));
  const codeById = new Map(accts.map((a) => [a.id, a.code]));
  const codeOf = (id: string | null | undefined) => (id ? (codeById.get(id) ?? null) : null);

  return rows.map((r) => ({
    total: r.total,
    revenueAccountCode: pickRevenueAccountCode({
      itemAccountCode: codeOf(r.itemRevId),
      productAccountCode: codeOf(r.prodRevId),
      groupAccountCode: codeOf(r.grpRevId),
      defaultAccountCode: codeOf(def?.revId),
      productType: r.productType,
    }),
  }));
}

/**
 * Seed the two default posting groups on company creation, preserving legacy
 * behavior: Warenertrag → 3000 (default) and Dienstleistungen → 3200.
 * No-op if the chart of accounts isn't seeded yet.
 */
export async function seedDefaultPostingGroups(db: Database, companyId: string): Promise<void> {
  const accts = await db
    .select({ id: accounts.id, code: accounts.code })
    .from(accounts)
    .where(
      and(
        eq(accounts.companyId, companyId),
        inArray(accounts.code, [LEGACY_PRODUCT_REVENUE, LEGACY_SERVICE_REVENUE]),
      ),
    );
  const idByCode = new Map(accts.map((a) => [a.code, a.id]));
  const revenueId = idByCode.get(LEGACY_PRODUCT_REVENUE);
  const serviceId = idByCode.get(LEGACY_SERVICE_REVENUE);
  if (!revenueId) return; // chart not seeded

  const rows: Array<typeof postingGroups.$inferInsert> = [
    {
      companyId,
      name: "Warenertrag",
      revenueAccountId: revenueId,
      isDefault: true,
      sortOrder: 0,
    },
  ];
  if (serviceId) {
    rows.push({
      companyId,
      name: "Dienstleistungen",
      revenueAccountId: serviceId,
      isDefault: false,
      sortOrder: 1,
    });
  }
  await db.insert(postingGroups).values(rows).onConflictDoNothing();
}

// ---- CRUD ----

export const createPostingGroupSchema = z.object({
  name: z.string().trim().min(1).max(100),
  revenueAccountId: z.string().uuid(),
  expenseAccountId: z.string().uuid().optional().nullable(),
  inventoryAccountId: z.string().uuid().optional().nullable(),
  isDefault: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function listPostingGroups(db: Database, companyId: string): Promise<PostingGroup[]> {
  return db.select().from(postingGroups).where(eq(postingGroups.companyId, companyId));
}

export async function createPostingGroup(
  db: Database,
  companyId: string,
  input: z.infer<typeof createPostingGroupSchema>,
): Promise<PostingGroup> {
  const data = createPostingGroupSchema.parse(input);
  return db.transaction(async (tx) => {
    // Only one default per company.
    if (data.isDefault) {
      await tx
        .update(postingGroups)
        .set({ isDefault: false })
        .where(eq(postingGroups.companyId, companyId));
    }
    const [row] = await tx
      .insert(postingGroups)
      .values({ companyId, ...data })
      .returning();
    return row;
  });
}

export async function updatePostingGroup(
  db: Database,
  companyId: string,
  id: string,
  input: Partial<z.infer<typeof createPostingGroupSchema>>,
): Promise<PostingGroup> {
  return db.transaction(async (tx) => {
    if (input.isDefault) {
      await tx
        .update(postingGroups)
        .set({ isDefault: false })
        .where(eq(postingGroups.companyId, companyId));
    }
    const [row] = await tx
      .update(postingGroups)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(postingGroups.id, id), eq(postingGroups.companyId, companyId)))
      .returning();
    if (!row) throw new Error("Posting group not found");
    return row;
  });
}
