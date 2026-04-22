import { z } from "zod";
import Decimal from "decimal.js";
import { eq, and, asc, desc, sql, ilike } from "drizzle-orm";
import { projects, documents, contacts } from "@kivvi/database";
import type { Database, Project } from "@kivvi/database";
import { PROJECT_STATUS_VALUES } from "../config/project";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export const createProjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(2000).optional().nullable(),
  contactId: z.string().uuid().optional().nullable(),
  status: z.enum(PROJECT_STATUS_VALUES).optional().default("active"),
  budget: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
});

export const updateProjectSchema = createProjectSchema.partial().extend({
  isActive: z.boolean().optional(),
});

// ============================================================================
// PROJECTS
// ============================================================================

export interface ProjectWithContact extends Project {
  contactName: string | null;
}

export interface ProjectFilters {
  search?: string;
  status?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

export async function listProjects(
  db: Database,
  companyId: string,
  filters: ProjectFilters = {},
): Promise<{
  data: ProjectWithContact[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 50;

  const conditions = [eq(projects.companyId, companyId)];

  if (filters.search) {
    conditions.push(ilike(projects.name, `%${filters.search}%`));
  }
  if (filters.status) {
    conditions.push(sql`${projects.status} = ${filters.status}`);
  }
  if (filters.isActive !== undefined) {
    conditions.push(eq(projects.isActive, filters.isActive));
  }

  const whereClause = and(...conditions);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(projects)
    .where(whereClause);

  const rows = await db
    .select({
      project: projects,
      contactName: contacts.name,
    })
    .from(projects)
    .leftJoin(contacts, eq(projects.contactId, contacts.id))
    .where(whereClause)
    .orderBy(desc(projects.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const data: ProjectWithContact[] = rows.map((r) => ({
    ...r.project,
    contactName: r.contactName,
  }));

  return {
    data,
    total: count,
    page,
    pageSize,
    totalPages: Math.ceil(count / pageSize),
  };
}

export async function getProject(
  db: Database,
  companyId: string,
  projectId: string,
): Promise<ProjectWithContact | null> {
  const [row] = await db
    .select({
      project: projects,
      contactName: contacts.name,
    })
    .from(projects)
    .leftJoin(contacts, eq(projects.contactId, contacts.id))
    .where(and(eq(projects.id, projectId), eq(projects.companyId, companyId)));

  if (!row) return null;
  return { ...row.project, contactName: row.contactName };
}

export async function createProject(
  db: Database,
  companyId: string,
  input: z.infer<typeof createProjectSchema>,
): Promise<Project> {
  const validated = createProjectSchema.parse(input);

  const [project] = await db
    .insert(projects)
    .values({
      companyId,
      name: validated.name,
      description: validated.description || null,
      contactId: validated.contactId || null,
      status: validated.status,
      budget: validated.budget || null,
      startDate: validated.startDate || null,
      endDate: validated.endDate || null,
    })
    .returning();

  return project;
}

export async function updateProject(
  db: Database,
  companyId: string,
  projectId: string,
  input: z.infer<typeof updateProjectSchema>,
): Promise<Project> {
  const validated = updateProjectSchema.parse(input);

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (validated.name !== undefined) updates.name = validated.name;
  if (validated.description !== undefined)
    updates.description = validated.description || null;
  if (validated.contactId !== undefined)
    updates.contactId = validated.contactId || null;
  if (validated.status !== undefined) updates.status = validated.status;
  if (validated.budget !== undefined) updates.budget = validated.budget || null;
  if (validated.startDate !== undefined)
    updates.startDate = validated.startDate || null;
  if (validated.endDate !== undefined)
    updates.endDate = validated.endDate || null;
  if (validated.isActive !== undefined) updates.isActive = validated.isActive;

  const [project] = await db
    .update(projects)
    .set(updates)
    .where(and(eq(projects.id, projectId), eq(projects.companyId, companyId)))
    .returning();

  if (!project) throw new Error("Project not found");
  return project;
}

export async function getProjectDocuments(
  db: Database,
  companyId: string,
  projectId: string,
): Promise<
  {
    id: string;
    type: string;
    number: string;
    status: string;
    total: string;
    contactName: string | null;
    issueDate: Date;
  }[]
> {
  const rows = await db
    .select({
      id: documents.id,
      type: documents.type,
      number: documents.number,
      status: documents.status,
      total: documents.total,
      contactName: contacts.name,
      issueDate: documents.issueDate,
    })
    .from(documents)
    .leftJoin(contacts, eq(documents.contactId, contacts.id))
    .where(
      and(
        eq(documents.projectId, projectId),
        eq(documents.companyId, companyId),
      ),
    )
    .orderBy(desc(documents.issueDate));

  return rows.map((r) => ({
    ...r,
    contactName: r.contactName,
  }));
}

export async function getProjectSummary(
  db: Database,
  companyId: string,
  projectId: string,
): Promise<{
  totalDocuments: number;
  totalRevenue: number;
  totalInvoiced: number;
}> {
  const [stats] = await db
    .select({
      totalDocuments: sql<number>`count(*)::int`,
      totalRevenue: sql<number>`COALESCE(SUM(CASE WHEN ${documents.type} = 'invoice' AND ${documents.status} = 'paid' THEN CAST(${documents.total} AS DECIMAL) ELSE 0 END), 0)`,
      totalInvoiced: sql<number>`COALESCE(SUM(CASE WHEN ${documents.type} = 'invoice' THEN CAST(${documents.total} AS DECIMAL) ELSE 0 END), 0)`,
    })
    .from(documents)
    .where(
      and(
        eq(documents.projectId, projectId),
        eq(documents.companyId, companyId),
      ),
    );

  return {
    totalDocuments: stats.totalDocuments,
    totalRevenue: new Decimal(stats.totalRevenue || "0").toNumber(),
    totalInvoiced: new Decimal(stats.totalInvoiced || "0").toNumber(),
  };
}
