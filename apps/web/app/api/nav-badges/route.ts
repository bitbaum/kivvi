import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { documents, bankTransactions, bankAccounts } from '@kivvi/database';
import { eq, and, sql, lt, inArray } from 'drizzle-orm';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.companyId) {
      return NextResponse.json({ documents: 0, money: 0 });
    }

    const companyId = session.user.companyId;
    const now = new Date();

    // Two lightweight count queries in parallel
    const [overdueResult, unreconciledResult] = await Promise.all([
      // Count overdue invoices (sent/partially_paid + past due date)
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(documents)
        .where(
          and(
            eq(documents.companyId, companyId),
            eq(documents.type, 'invoice'),
            inArray(documents.status, ['sent', 'partially_paid']),
            lt(documents.dueDate, now)
          )
        ),
      // Count unreconciled bank transactions (join through bankAccounts for companyId)
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(bankTransactions)
        .innerJoin(bankAccounts, eq(bankTransactions.bankAccountId, bankAccounts.id))
        .where(
          and(
            eq(bankAccounts.companyId, companyId),
            eq(bankTransactions.isReconciled, false)
          )
        ),
    ]);

    return NextResponse.json({
      documents: overdueResult[0]?.count ?? 0,
      money: unreconciledResult[0]?.count ?? 0,
    });
  } catch {
    return NextResponse.json({ documents: 0, money: 0 });
  }
}
