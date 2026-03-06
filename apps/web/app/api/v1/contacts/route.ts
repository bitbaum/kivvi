import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { authenticateApi, apiError, apiSuccess } from '@/lib/api-handler';
import { listContacts, createContact } from '@kivvi/core';

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(50),
  search: z.string().optional(),
  type: z.enum(['customer', 'vendor']).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const ctx = await authenticateApi(request);
    if (ctx instanceof Response) return ctx;

    const url = new URL(request.url);
    const raw = Object.fromEntries(url.searchParams.entries());
    const parsed = querySchema.safeParse(raw);
    if (!parsed.success) {
      return apiError(`Invalid query parameters: ${parsed.error.issues.map(i => `${i.path}: ${i.message}`).join(', ')}`, 400);
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
    return apiError('Internal server error', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await authenticateApi(request);
    if (ctx instanceof Response) return ctx;

    const body = await request.json();

    const contact = await db.transaction(async (tx) => {
      return createContact(tx, ctx.companyId, body);
    });

    return apiSuccess(contact, undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create contact';
    return apiError(message, 400);
  }
}
