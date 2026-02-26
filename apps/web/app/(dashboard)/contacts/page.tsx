import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plus, Users, Download } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { listContacts } from '@kivvi/core';
import { cn } from '@/lib/utils';
import { DEFAULT_PAGE_SIZE } from '@/lib/config/document-types';
import { SelectableContactTable } from '@/components/contacts/selectable-contact-table';
import { SearchInput } from '@/components/search-input';
import { Pagination } from '@/components/pagination';

interface ContactsPageProps {
  searchParams: {
    search?: string;
    type?: string;
    page?: string;
    sort?: string;
    order?: string;
  };
}

export default async function ContactsPage({ searchParams }: ContactsPageProps) {
  const session = await auth();
  if (!session?.user?.companyId) {
    redirect('/login');
  }

  const t = await getTranslations('contacts');
  const tc = await getTranslations('common');
  const tb = await getTranslations('bulkActions');

  const companyId = session.user.companyId;
  const search = searchParams.search || '';
  const typeFilter = searchParams.type as 'customer' | 'vendor' | 'both' | undefined;
  const page = parseInt(searchParams.page || '1', 10);
  const sort = (searchParams.sort || 'name') as 'name' | 'contactNumber' | 'createdAt' | 'city';
  const order = (searchParams.order || 'asc') as 'asc' | 'desc';

  const result = await listContacts(db, companyId, {
    search: search || undefined,
    type: typeFilter || undefined,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
    sortBy: sort,
    sortOrder: order,
  });

  // Pre-resolve translations for client component
  const bulkActionKeys = [
    'selected', 'clearSelection', 'delete', 'deactivate',
    'confirmTitle', 'confirmDelete', 'confirmDeactivate',
    'cancel', 'processing', 'confirmAction',
    'successAll', 'successPartial', 'failedAll',
    'showErrors', 'hideErrors',
  ];
  const bulkLabels: Record<string, string> = {};
  for (const key of bulkActionKeys) {
    bulkLabels[key] = tb(key);
  }

  const columnLabels = {
    number: tc('number'),
    name: tc('name'),
    type: tc('type'),
    email: tc('email'),
    phone: tc('phone'),
    city: t('city'),
    status: tc('status'),
    active: tc('active'),
    inactive: tc('inactive'),
  };

  const typeLabels: Record<string, string> = {
    customer: t('customer'),
    vendor: t('vendor'),
    both: t('both'),
  };

  function buildPageUrl(p: number): string {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (typeFilter) params.set('type', typeFilter);
    if (sort !== 'name') params.set('sort', sort);
    if (order !== 'asc') params.set('order', order);
    if (p > 1) params.set('page', p.toString());
    return `/contacts${params.toString() ? `?${params.toString()}` : ''}`;
  }

  function buildSortUrl(s: string, o: 'asc' | 'desc'): string {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (typeFilter) params.set('type', typeFilter);
    params.set('sort', s);
    params.set('order', o);
    return `/contacts?${params.toString()}`;
  }

  // Pre-compute sort hrefs for client component (functions can't cross server→client boundary)
  const sortHrefs: Record<string, string> = {};
  for (const field of ['contactNumber', 'name', 'city']) {
    const nextOrder = sort === field && order === 'asc' ? 'desc' : 'asc';
    sortHrefs[field] = buildSortUrl(field, nextOrder);
  }

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
        <SearchInput
          basePath="/contacts"
          placeholder={t('searchContacts')}
          preserveParams={['type', 'sort', 'order']}
        />

        <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
          <TypeFilterLink label={tc('all')} value="" current={typeFilter} search={search} sort={sort} order={order} />
          <TypeFilterLink label={t('customer')} value="customer" current={typeFilter} search={search} sort={sort} order={order} />
          <TypeFilterLink label={t('vendor')} value="vendor" current={typeFilter} search={search} sort={sort} order={order} />
          <TypeFilterLink label={t('both')} value="both" current={typeFilter} search={search} sort={sort} order={order} />
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
            <SelectableContactTable
              data={result.data.map((c) => ({
                id: c.id,
                contactNumber: c.contactNumber,
                name: c.name,
                firstName: c.firstName,
                lastName: c.lastName,
                type: c.type,
                email: c.email,
                phone: c.phone,
                mobile: c.mobile,
                city: c.city,
                isActive: c.isActive,
              }))}
              translations={{ columnLabels, typeLabels, bulkLabels }}
              sort={{ field: sort, order, hrefs: sortHrefs }}
            />

            <Pagination
              page={result.page}
              totalPages={result.totalPages}
              total={result.total}
              pageSize={result.pageSize}
              buildHref={buildPageUrl}
              labels={{
                showing: tc('showing', {
                  from: (result.page - 1) * result.pageSize + 1,
                  to: Math.min(result.page * result.pageSize, result.total),
                  total: result.total,
                }),
                previous: tc('previous'),
                next: tc('next'),
                pageOf: tc('pageOf', { page: result.page, totalPages: result.totalPages }),
              }}
            />
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
  sort,
  order,
}: {
  label: string;
  value: string;
  current?: string;
  search: string;
  sort: string;
  order: string;
}) {
  const isActive = (current || '') === value;
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (value) params.set('type', value);
  if (sort !== 'name') params.set('sort', sort);
  if (order !== 'asc') params.set('order', order);
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
