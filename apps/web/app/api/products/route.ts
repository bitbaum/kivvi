import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { listProducts } from '@kivvi/core';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.companyId) {
      return NextResponse.json([], { status: 401 });
    }

    const result = await listProducts(db, session.user.companyId, {
      isActive: true,
      pageSize: 1000,
      sortBy: 'name',
      sortOrder: 'asc',
    });

    return NextResponse.json(result.data);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
