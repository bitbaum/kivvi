import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { authenticateApi, apiError, apiSuccess } from '@/lib/api-handler';
import { listDocuments, createDocument } from '@kivvi/core';
import type { DocumentType, DocumentStatus } from '@kivvi/database';

export async function GET(request: NextRequest) {
  try {
    const ctx = await authenticateApi(request);
    if (ctx instanceof Response) return ctx;

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = Math.min(parseInt(url.searchParams.get('pageSize') || '50', 10), 200);
    const type = url.searchParams.get('type') as DocumentType | undefined;
    const status = url.searchParams.get('status') as DocumentStatus | undefined;
    const search = url.searchParams.get('search') || undefined;
    const contactId = url.searchParams.get('contactId') || undefined;
    const sortBy = (url.searchParams.get('sortBy') as 'number' | 'issueDate' | 'dueDate' | 'total' | 'createdAt') || undefined;
    const sortOrder = (url.searchParams.get('sortOrder') as 'asc' | 'desc') || undefined;

    const result = await listDocuments(db, ctx.companyId, {
      type,
      status,
      search,
      contactId,
      page,
      pageSize,
      sortBy,
      sortOrder,
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
    const doc = await createDocument(db, ctx.companyId, ctx.userId, body);
    return apiSuccess(doc);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create document';
    return apiError(message, 400);
  }
}
