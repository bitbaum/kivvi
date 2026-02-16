import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { documentItems } from '@kivvi/database';
import { sql } from 'drizzle-orm';

export async function GET() {
  const [result] = await (db as any).select({ count: sql`count(*)::int` }).from(documentItems);
  const sample = await (db as any).select().from(documentItems).limit(5);
  return NextResponse.json({ totalItems: result.count, sample });
}
