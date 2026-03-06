import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { authenticateApi, apiError, apiSuccess } from '@/lib/api-handler';
import { listProducts, createProduct } from '@kivvi/core';

export async function GET(request: NextRequest) {
  try {
    const ctx = await authenticateApi(request);
    if (ctx instanceof Response) return ctx;

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = Math.min(parseInt(url.searchParams.get('pageSize') || '50', 10), 200);
    const search = url.searchParams.get('search') || undefined;
    const type = url.searchParams.get('type') as 'product' | 'service' | undefined;

    const result = await listProducts(db, ctx.companyId, {
      page,
      pageSize,
      search,
      type,
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
    const product = await createProduct(db, ctx.companyId, body);
    return apiSuccess(product);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create product';
    return apiError(message, 400);
  }
}
