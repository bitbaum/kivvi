import { FileText, Wallet, TrendingUp, Clock, ArrowRight, Users, Package } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { documents, contacts, bankAccounts, products } from '@kivvi/database';
import { eq, and, sql, desc, inArray } from 'drizzle-orm';
import { formatCurrency, formatDate } from '@/lib/utils';
import { redirect } from 'next/navigation';

async function getDashboardData(companyId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Revenue this month (paid invoices)
  const [revenueResult] = await db
    .select({
      total: sql<string>`COALESCE(SUM(${documents.total}::numeric), 0)`,
    })
    .from(documents)
    .where(
      and(
        eq(documents.companyId, companyId),
        eq(documents.type, 'invoice'),
        eq(documents.status, 'paid'),
        sql`${documents.paidDate} >= ${startOfMonth}`
      )
    );

  // Open invoices (sent, not paid)
  const openInvoices = await db
    .select({
      total: sql<string>`COALESCE(SUM(${documents.total}::numeric), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(documents)
    .where(
      and(
        eq(documents.companyId, companyId),
        eq(documents.type, 'invoice'),
        inArray(documents.status, ['sent', 'confirmed', 'delivered'])
      )
    );

  // Overdue invoices
  const overdueInvoices = await db
    .select({
      total: sql<string>`COALESCE(SUM(${documents.total}::numeric), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(documents)
    .where(
      and(
        eq(documents.companyId, companyId),
        eq(documents.type, 'invoice'),
        eq(documents.status, 'overdue')
      )
    );

  // Bank balance total
  const [bankBalance] = await db
    .select({
      total: sql<string>`COALESCE(SUM(${bankAccounts.balance}::numeric), 0)`,
    })
    .from(bankAccounts)
    .where(eq(bankAccounts.companyId, companyId));

  // Recent documents (last 5)
  const recentDocs = await db.query.documents.findMany({
    where: and(
      eq(documents.companyId, companyId),
      eq(documents.type, 'invoice')
    ),
    with: { contact: true },
    orderBy: [desc(documents.createdAt)],
    limit: 5,
  });

  // Counts
  const [contactCount] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(contacts)
    .where(and(eq(contacts.companyId, companyId), eq(contacts.isActive, true)));

  const [productCount] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(products)
    .where(and(eq(products.companyId, companyId), eq(products.isActive, true)));

  return {
    revenue: Number(revenueResult?.total || 0),
    openInvoicesTotal: Number(openInvoices[0]?.total || 0),
    openInvoicesCount: Number(openInvoices[0]?.count || 0),
    overdueTotal: Number(overdueInvoices[0]?.total || 0),
    overdueCount: Number(overdueInvoices[0]?.count || 0),
    bankBalance: Number(bankBalance?.total || 0),
    recentDocs,
    contactCount: Number(contactCount?.count || 0),
    productCount: Number(productCount?.count || 0),
  };
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.companyId) redirect('/login');

  const data = await getDashboardData(session.user.companyId);

  const greeting = getGreeting();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{greeting}</h1>
        <p className="text-muted-foreground">
          Here's what's happening with your business today.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Revenue (MTD)"
          value={formatCurrency(data.revenue)}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          title="Open Invoices"
          value={formatCurrency(data.openInvoicesTotal)}
          subtitle={`${data.openInvoicesCount} invoices`}
          icon={<FileText className="h-5 w-5" />}
        />
        <StatCard
          title="Bank Balance"
          value={formatCurrency(data.bankBalance)}
          icon={<Wallet className="h-5 w-5" />}
        />
        <StatCard
          title="Overdue"
          value={formatCurrency(data.overdueTotal)}
          subtitle={`${data.overdueCount} invoices`}
          icon={<Clock className="h-5 w-5" />}
          alert={data.overdueCount > 0}
        />
      </div>

      {/* Quick stats */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
        <QuickStat
          title="Active Contacts"
          value={data.contactCount}
          href="/contacts"
          icon={<Users className="h-5 w-5" />}
        />
        <QuickStat
          title="Active Products"
          value={data.productCount}
          href="/products"
          icon={<Package className="h-5 w-5" />}
        />
      </div>

      {/* Recent Invoices */}
      <div className="rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="font-semibold">Recent Invoices</h2>
          <Link
            href="/sales/invoices"
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="divide-y">
          {data.recentDocs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <FileText className="mx-auto mb-2 h-8 w-8" />
              <p>No invoices yet.</p>
              <Link
                href="/sales/invoices/new"
                className="mt-2 inline-block text-sm text-primary hover:underline"
              >
                Create your first invoice
              </Link>
            </div>
          ) : (
            data.recentDocs.map((doc) => (
              <Link
                key={doc.id}
                href={`/sales/invoices/${doc.id}`}
                className="flex items-center justify-between p-4 hover:bg-muted/50"
              >
                <div>
                  <p className="font-medium">{doc.number}</p>
                  <p className="text-sm text-muted-foreground">
                    {doc.contact?.name || 'Unknown'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatCurrency(Number(doc.total))}</p>
                  <StatusBadge status={doc.status} />
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  alert,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  alert?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{title}</span>
        <div className={alert ? 'text-destructive' : 'text-muted-foreground'}>
          {icon}
        </div>
      </div>
      <p className={`mt-2 text-2xl font-bold ${alert ? 'text-destructive' : ''}`}>
        {value}
      </p>
      {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

function QuickStat({
  title,
  value,
  href,
  icon,
}: {
  title: string;
  value: number;
  href: string;
  icon: React.ReactNode;
}) {
  return (
    <Link href={href} className="rounded-xl border bg-card p-6 hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        <div className="text-muted-foreground">{icon}</div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{title}</p>
        </div>
      </div>
    </Link>
  );
}

const statusStyles: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  delivered: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  partially_paid: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  overdue: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[status] || statusStyles.draft}`}
    >
      {status.replace('_', ' ')}
    </span>
  );
}
