import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { listAccounts } from '@kivvi/core';

export async function GET() {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const accounts = await listAccounts(db, session.user.companyId, { isActive: true });
  return NextResponse.json(accounts);
}
