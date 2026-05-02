import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  authenticateApi,
  apiError,
  apiInternalError,
  apiSuccess,
  apiZodError,
  paginationQueryFields,
} from "@/lib/api-handler";
import { listContacts, createContact, createContactSchema } from "@kivvi/core";

const querySchema = z.object({
  ...paginationQueryFields,
  search: z.string().optional(),
  type: z.enum(["customer", "vendor"]).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const ctx = await authenticateApi(request);
    if (ctx instanceof Response) return ctx;

    const url = new URL(request.url);
    const raw = Object.fromEntries(url.searchParams.entries());
    const parsed = querySchema.safeParse(raw);
    if (!parsed.success) {
      return apiZodError(parsed.error, "query parameters");
    }

    const { page, pageSize, ...filters } = parsed.data;
    const result = await listContacts(db, ctx.companyId, {
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
    return apiInternalError();
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await authenticateApi(request, "member");
    if (ctx instanceof Response) return ctx;

    const body = await request.json();
    const parsed = createContactSchema.safeParse(body);
    if (!parsed.success) {
      return apiZodError(parsed.error, "body");
    }

    const contact = await db.transaction(async (tx) => {
      return createContact(tx, ctx.companyId, parsed.data);
    });

    return apiSuccess(contact, undefined);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create contact";
    return apiError(message, 400);
  }
}
