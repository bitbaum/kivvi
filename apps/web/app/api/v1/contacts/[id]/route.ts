import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { authenticateApi, apiError, apiSuccess } from "@/lib/api-handler";
import { getContact, updateContact, deleteContact } from "@kivvi/core";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await authenticateApi(request);
    if (ctx instanceof Response) return ctx;

    const { id } = await params;
    const data = await getContact(db, ctx.companyId, id);
    if (!data) return apiError("Contact not found", 404);

    return apiSuccess(data.contact);
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

    const contact = await updateContact(db, ctx.companyId, id, body);
    return apiSuccess(contact);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update contact";
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
    await deleteContact(db, ctx.companyId, id);
    return apiSuccess({ deleted: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete contact";
    return apiError(message, 400);
  }
}
