import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { listDocuments } from '@kivvi/core';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get('q') || '';
  const type = searchParams.get('type') || undefined;

  if (q.length < 2) {
    return NextResponse.json({ data: [] });
  }

  const result = await listDocuments(db, session.user.companyId, {
    search: q,
    type: type as 'invoice' | 'credit_note' | 'purchase_invoice' | undefined,
    pageSize: 20,
    sortBy: 'issueDate',
    sortOrder: 'desc',
  });

  // Return a simplified response suitable for the reconciliation picker
  const data = result.data.map((doc) => ({
    id: doc.id,
    number: doc.number,
    type: doc.type,
    total: doc.total,
    status: doc.status,
    contact: doc.contact || null,
  }));

  return NextResponse.json({ data });
}
