import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { authenticateApi, apiError, apiSuccess } from "@/lib/api-handler";
import {
  listDocuments,
  createDocument,
  createDocumentSchema,
  resolveOrCreateContact,
} from "@kivvi/core";
import {
  documentTypeEnum,
  documentStatusEnum,
} from "@kivvi/database/src/schema";

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(50),
  type: z.enum(documentTypeEnum.enumValues).optional(),
  status: z.enum(documentStatusEnum.enumValues).optional(),
  search: z.string().optional(),
  contactId: z.string().uuid().optional(),
  sortBy: z
    .enum(["number", "issueDate", "dueDate", "total", "createdAt"])
    .optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const ctx = await authenticateApi(request);
    if (ctx instanceof Response) return ctx;

    const url = new URL(request.url);
    const raw = Object.fromEntries(url.searchParams.entries());
    const parsed = querySchema.safeParse(raw);
    if (!parsed.success) {
      return apiError(
        `Invalid query parameters: ${parsed.error.issues.map((i) => `${i.path}: ${i.message}`).join(", ")}`,
        400,
      );
    }

    const { page, pageSize, ...filters } = parsed.data;
    const result = await listDocuments(db, ctx.companyId, {
      ...filters,
      page,
      pageSize,
    });

    return apiSuccess(result.data, {
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
      totalPages: result.totalPages,
    });
  } catch {
    return apiError("Internal server error", 500);
  }
}


export async function POST(request: NextRequest) {
  try {
    const ctx = await authenticateApi(request, "member");
    if (ctx instanceof Response) return ctx;

    const body = await request.json();

    // Allow external callers (e.g. RevampIT) to pass contactName + contactEmail
    // instead of a contactId. Resolve or auto-create the contact transparently.
    let resolvedBody = { ...body };
    if (!body.contactId && body.contactName) {
      const contactId = await resolveOrCreateContact(
        db,
        ctx.companyId,
        body.contactName,
        body.contactEmail,
      );
      resolvedBody = { ...body, contactId };
      delete resolvedBody.contactName;
      delete resolvedBody.contactEmail;
    }

    // Auto-populate `position` on items — external callers don't need to track it
    if (Array.isArray(resolvedBody.items)) {
      resolvedBody = {
        ...resolvedBody,
        items: resolvedBody.items.map(
          (item: Record<string, unknown>, idx: number) =>
            item.position !== undefined ? item : { ...item, position: idx + 1 },
        ),
      };
    }

    const parsed = createDocumentSchema.safeParse(resolvedBody);
    if (!parsed.success) {
      return apiError(
        `Invalid body: ${parsed.error.issues.map((i) => `${i.path}: ${i.message}`).join(", ")}`,
        400,
      );
    }
    const doc = await createDocument(
      db,
      ctx.companyId,
      ctx.userId,
      parsed.data,
    );
    return apiSuccess(doc);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create document";
    return apiError(message, 400);
  }
}
