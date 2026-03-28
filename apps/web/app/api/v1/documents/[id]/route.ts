import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { authenticateApi, apiError, apiSuccess } from "@/lib/api-handler";
import {
  getDocument,
  updateDocument,
  updateDocumentStatus,
  deleteDocument,
} from "@kivvi/core";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await authenticateApi(request);
    if (ctx instanceof Response) return ctx;

    const { id } = await params;
    const doc = await getDocument(db, ctx.companyId, id);
    if (!doc) return apiError("Document not found", 404);

    return apiSuccess(doc);
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

    // If the body contains a 'status' field, use the status transition function
    if (body.status && Object.keys(body).length === 1) {
      const doc = await updateDocumentStatus(
        db,
        ctx.companyId,
        id,
        body.status,
      );
      return apiSuccess(doc);
    }

    const doc = await updateDocument(db, ctx.companyId, id, body);
    return apiSuccess(doc);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update document";
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
    await deleteDocument(db, ctx.companyId, id);
    return apiSuccess({ deleted: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete document";
    return apiError(message, 400);
  }
}
