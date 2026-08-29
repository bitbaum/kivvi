import { z } from "zod";
import { and, asc, eq } from "drizzle-orm";
import { costCenters } from "@kivvi/database";
import type { CostCenter, Database } from "@kivvi/database";
import { COST_CENTER_KIND_VALUES } from "@kivvi/database";
import { DomainError } from "../domain-error";
import { DEFAULT_COST_CENTERS } from "../config/cost-centers";

export const createCostCenterSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Code is required")
    .max(40)
    .transform((c) => c.toUpperCase()),
  name: z.string().trim().min(1, "Name is required").max(120),
  kind: z.enum(COST_CENTER_KIND_VALUES).default("activity"),
  isActive: z.boolean().default(true),
});

export const updateCostCenterSchema = createCostCenterSchema.partial();

export type CreateCostCenterInput = z.input<typeof createCostCenterSchema>;
export type UpdateCostCenterInput = z.input<typeof updateCostCenterSchema>;

/** List a company's cost centers, active first, ordered by code. */
export async function listCostCenters(
  db: Database,
  companyId: string,
  opts: { activeOnly?: boolean } = {},
): Promise<CostCenter[]> {
  const where = opts.activeOnly
    ? and(eq(costCenters.companyId, companyId), eq(costCenters.isActive, true))
    : eq(costCenters.companyId, companyId);
  return db
    .select()
    .from(costCenters)
    .where(where)
    .orderBy(asc(costCenters.kind), asc(costCenters.code));
}

export async function createCostCenter(
  db: Database,
  companyId: string,
  input: CreateCostCenterInput,
): Promise<CostCenter> {
  const v = createCostCenterSchema.parse(input);
  const [existing] = await db
    .select({ id: costCenters.id })
    .from(costCenters)
    .where(and(eq(costCenters.companyId, companyId), eq(costCenters.code, v.code)))
    .limit(1);
  if (existing) {
    throw new DomainError(
      "alreadyExists",
      { code: v.code },
      `A cost center with code ${v.code} already exists`,
    );
  }
  const [created] = await db
    .insert(costCenters)
    .values({ companyId, ...v })
    .returning();
  return created;
}

export async function updateCostCenter(
  db: Database,
  companyId: string,
  id: string,
  input: UpdateCostCenterInput,
): Promise<CostCenter> {
  const v = updateCostCenterSchema.parse(input);
  const [updated] = await db
    .update(costCenters)
    .set(v)
    .where(and(eq(costCenters.id, id), eq(costCenters.companyId, companyId)))
    .returning();
  if (!updated) {
    throw new DomainError("notFound", { id }, "Cost center not found");
  }
  return updated;
}

/**
 * Seed the default activities for a company. Idempotent — re-running never
 * duplicates (unique companyId+code), so it doubles as a backfill for
 * companies created before this feature existed.
 */
export async function seedCostCenters(db: Database, companyId: string): Promise<number> {
  const rows = DEFAULT_COST_CENTERS.map((c) => ({ companyId, ...c }));
  const inserted = await db
    .insert(costCenters)
    .values(rows)
    .onConflictDoNothing({
      target: [costCenters.companyId, costCenters.code],
    })
    .returning({ id: costCenters.id });
  return inserted.length;
}
