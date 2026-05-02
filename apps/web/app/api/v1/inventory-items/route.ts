import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  authenticateApi,
  apiError,
  apiSuccess,
  paginationQueryFields,
} from "@/lib/api-handler";
import {
  listInventoryItems,
  createInventoryItem,
  createInventoryItemSchema,
} from "@kivvi/core/src/domain/inventory-items";

const querySchema = z.object({
  ...paginationQueryFields,
  pageSize: z.coerce.number().int().positive().max(200).default(25),
  status: z.string().optional(),
  condition: z.string().optional(),
  warehouseId: z.string().uuid().optional(),
  search: z.string().optional(),
  sortBy: z
    .enum(["createdAt", "description", "status", "condition"])
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
    const result = await listInventoryItems(db, ctx.companyId, {
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
    const parsed = createInventoryItemSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        `Invalid body: ${parsed.error.issues.map((i) => `${i.path}: ${i.message}`).join(", ")}`,
        400,
      );
    }

    const item = await createInventoryItem(db, ctx.companyId, parsed.data);
    return apiSuccess(item);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to create inventory item";
    return apiError(message, 400);
  }
}
