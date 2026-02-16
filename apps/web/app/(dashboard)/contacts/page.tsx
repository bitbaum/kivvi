import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plus, Search, Users, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { listContacts } from '@kivvi/core';
import { cn } from '@/lib/utils';

const TYPE_STYLES: Record<string, string> = {
  customer: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  vendor: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  both: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
};

interface ContactsPageProps {
  searchParams: {
    search?: string;
    type?: string;
    page?: string;
  };
}

export default async function ContactsPage({ searchParams }: ContactsPageProps) {
  const session = await auth();
  if (!session?.user?.companyId) {
    redirect('/login');
  }

  const t = await getTranslations('contacts');
  const tc = await getTranslations('common');

  const companyId = session.user.companyId;
  const search = searchParams.search || '';
  const typeFilter = searchParams.type as 'customer' | 'vendor' | 'both' | undefined;
  const page = parseInt(searchParams.page || '1', 10);

  const result = await listContacts(db, companyId, {
    search: search || undefined,
    type: typeFilter || undefined,
    page,
    pageSize: 25,
  });

  const TYPE_LABELS: Record<string, string> = {
    customer: t('customer'),
    vendor: t('vendor'),
    both: t('both'),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">
            {t('subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api/export/contacts"
            className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
          >
            <Download className="h-4 w-4" />
            {t('exportCsv')}
          </a>
          <Link
            href="/contacts/new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            {t('newContact')}
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* Search */}
        <form className="relative flex-1 sm:max-w-sm" action="/contacts" method="GET">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            name="search"
            placeholder={t('searchContacts')}
            defaultValue={search}
            className="w-full rounded-lg border bg-background py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {typeFilter && (
            <input type="hidden" name="type" value={typeFilter} />
          )}
        </form>

        {/* Type filter */}
        <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
          <TypeFilterLink label={tc('all')} value="" current={typeFilter} search={search} />
          <TypeFilterLink label={t('customer')} value="customer" current={typeFilter} search={search} />
          <TypeFilterLink label={t('vendor')} value="vendor" current={typeFilter} search={search} />
          <TypeFilterLink label={t('both')} value="both" current={typeFilter} search={search} />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card">
        {result.data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Users className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">{t('noContacts')}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {search
                ? tc('noResults')
                : t('createFirstContact')}
            </p>
            {!search && (
              <Link
                href="/contacts/new"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                {t('newContact')}
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="grid grid-cols-[1fr_2fr_auto_1.5fr_1fr_1fr_auto] gap-4 border-b px-6 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <div>{tc('number')}</div>
              <div>{tc('name')}</div>
              <div>{tc('type')}</div>
              <div>{tc('email')}</div>
              <div>{tc('phone')}</div>
              <div>{t('city')}</div>
              <div>{tc('status')}</div>
            </div>

            {/* Table rows */}
            <div className="divide-y">
              {result.data.map((contact) => (
                <Link
                  key={contact.id}
                  href={`/contacts/${contact.id}`}
                  className="grid grid-cols-[1fr_2fr_auto_1.5fr_1fr_1fr_auto] gap-4 px-6 py-4 transition-colors hover:bg-muted/50"
                >
                  <div className="text-sm font-mono text-muted-foreground">
                    {contact.contactNumber || '-'}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{contact.name}</p>
                    {(contact.firstName || contact.lastName) && (
                      <p className="text-xs text-muted-foreground">
                        {[contact.firstName, contact.lastName].filter(Boolean).join(' ')}
                      </p>
                    )}
                  </div>
                  <div>
                    <span
                      className={cn(
                        'inline-block rounded-full px-2 py-0.5 text-xs font-medium',
                        TYPE_STYLES[contact.type] || ''
                      )}
                    >
                      {TYPE_LABELS[contact.type] || contact.type}
                    </span>
                  </div>
                  <div className="truncate text-sm text-muted-foreground">
                    {contact.email || '-'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {contact.phone || contact.mobile || '-'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {contact.city || '-'}
                  </div>
                  <div>
                    <span
                      className={cn(
                        'inline-block rounded-full px-2 py-0.5 text-xs font-medium',
                        contact.isActive
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                      )}
                    >
                      {contact.isActive ? tc('active') : tc('inactive')}
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {result.totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-6 py-4">
                <p className="text-sm text-muted-foreground">
                  {tc('showing', {
                    from: (result.page - 1) * result.pageSize + 1,
                    to: Math.min(result.page * result.pageSize, result.total),
                    total: result.total,
                  })}
                </p>
                <div className="flex items-center gap-2">
                  {result.page > 1 ? (
                    <Link
                      href={buildPageUrl(result.page - 1, search, typeFilter)}
                      className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      {tc('previous')}
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm text-muted-foreground opacity-50">
                      <ChevronLeft className="h-4 w-4" />
                      {tc('previous')}
                    </span>
                  )}

                  <span className="text-sm text-muted-foreground">
                    {tc('pageOf', { page: result.page, totalPages: result.totalPages })}
                  </span>

                  {result.page < result.totalPages ? (
                    <Link
                      href={buildPageUrl(result.page + 1, search, typeFilter)}
                      className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
                    >
                      {tc('next')}
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm text-muted-foreground opacity-50">
                      {tc('next')}
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function TypeFilterLink({
  label,
  value,
  current,
  search,
}: {
  label: string;
  value: string;
  current?: string;
  search: string;
}) {
  const isActive = (current || '') === value;
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (value) params.set('type', value);
  const href = `/contacts${params.toString() ? `?${params.toString()}` : ''}`;

  return (
    <Link
      href={href}
      className={cn(
        'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
        isActive
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {label}
    </Link>
  );
}

function buildPageUrl(page: number, search: string, type?: string): string {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (type) params.set('type', type);
  if (page > 1) params.set('page', page.toString());
  return `/contacts${params.toString() ? `?${params.toString()}` : ''}`;
}
