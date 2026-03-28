import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { authenticateApi, apiError, apiSuccess } from "@/lib/api-handler";
import { getProduct, updateProduct, deleteProduct } from "@kivvi/core";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await authenticateApi(request);
    if (ctx instanceof Response) return ctx;

    const { id } = await params;
    const product = await getProduct(db, ctx.companyId, id);
    if (!product) return apiError("Product not found", 404);

    return apiSuccess(product);
  } catch {
    return apiError("Internal server error", 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await authenticateApi(request, "member");
    if (ctx instanceof Response) return ctx;

    const { id } = await params;
    const body = await request.json();
    const product = await updateProduct(db, ctx.companyId, id, body);
    return apiSuccess(product);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update product";
    return apiError(message, 400);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await authenticateApi(request, "member");
    if (ctx instanceof Response) return ctx;

    const { id } = await params;
    await deleteProduct(db, ctx.companyId, id);
    return apiSuccess({ deleted: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete product";
    return apiError(message, 400);
  }
}
