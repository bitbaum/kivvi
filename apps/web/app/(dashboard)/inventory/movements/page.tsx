import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  ArrowLeft,
  ArrowUpDown,
  Search,
} from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { Pagination } from '@/components/pagination';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { listStockMovements, listWarehouses } from '@kivvi/core';
import { formatDate, cn } from '@/lib/utils';
import { getTranslations } from 'next-intl/server';
import { RecordMovementForm } from './record-movement-form';

const TYPE_STYLES: Record<string, string> = {
  purchase: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  sale: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  adjustment: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  transfer: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  return: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
};

interface PageProps {
  searchParams: Promise<{
    warehouseId?: string;
    type?: string;
    page?: string;
  }>;
}

export default async function MovementsPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.companyId) redirect('/login');

  const t = await getTranslations('inventory');
  const tc = await getTranslations('common');

  const TYPE_LABELS: Record<string, string> = {
    purchase: t('purchase'),
    sale: t('sale'),
    adjustment: t('adjustment'),
    transfer: t('transfer'),
    return: t('movementType'),
  };

  const params = await searchParams;
  const warehouseFilter = params.warehouseId;
  const typeFilter = params.type;
  const page = Math.max(1, parseInt(params.page || '1', 10));

  const [movements, warehouses] = await Promise.all([
    listStockMovements(db, session.user.companyId, {
      warehouseId: warehouseFilter || undefined,
      type: typeFilter || undefined,
      page,
      pageSize: 50,
    }),
    listWarehouses(db, session.user.companyId),
  ]);

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div>
        <Link
          href="/inventory"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          {tc('back')}
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('stockMovements')}</h1>
            <p className="text-muted-foreground">
              {t('subtitle')}
            </p>
          </div>
          <RecordMovementForm warehouses={warehouses} />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* Warehouse filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-muted-foreground">{t('warehouses')}:</label>
          <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
            <FilterLink
              href={buildFilterUrl({ type: typeFilter })}
              active={!warehouseFilter}
              label={tc('all')}
            />
            {warehouses.map((wh) => (
              <FilterLink
                key={wh.id}
                href={buildFilterUrl({ warehouseId: wh.id, type: typeFilter })}
                active={warehouseFilter === wh.id}
                label={wh.name}
              />
            ))}
          </div>
        </div>

        {/* Type filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-muted-foreground">{tc('type')}:</label>
          <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
            <FilterLink
              href={buildFilterUrl({ warehouseId: warehouseFilter })}
              active={!typeFilter}
              label={tc('all')}
            />
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <FilterLink
                key={value}
                href={buildFilterUrl({ warehouseId: warehouseFilter, type: value })}
                active={typeFilter === value}
                label={label}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Movements Table */}
      <div className="rounded-xl border bg-card">
        {movements.data.length === 0 ? (
          <EmptyState
            icon={warehouseFilter || typeFilter ? Search : ArrowUpDown}
            title={t('noMovements')}
            description={warehouseFilter || typeFilter ? t('adjustFilters') : t('noMovementsDesc')}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-muted-foreground">
                    <th className="whitespace-nowrap px-4 py-3 font-medium">{tc('date')}</th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium">{tc('name')}</th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium">{t('warehouses')}</th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium">{tc('type')}</th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium text-right">{tc('amount')}</th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium">{tc('number')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {movements.data.map((movement) => {
                    const qty = Number(movement.quantity);
                    const isPositive = movement.type === 'purchase' || movement.type === 'return';

                    return (
                      <tr
                        key={movement.id}
                        className="transition-colors hover:bg-muted/50"
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                          {formatDate(movement.createdAt)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className="font-medium">{movement.productName}</span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                          {movement.warehouseName}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                              TYPE_STYLES[movement.type] || TYPE_STYLES.adjustment
                            )}
                          >
                            {TYPE_LABELS[movement.type] || movement.type}
                          </span>
                        </td>
                        <td
                          className={cn(
                            'whitespace-nowrap px-4 py-3 text-right font-medium',
                            isPositive
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          )}
                        >
                          {isPositive ? '+' : '-'}{Math.abs(qty)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                          {movement.reference || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Pagination
              page={movements.page}
              totalPages={movements.totalPages}
              total={movements.total}
              pageSize={movements.pageSize}
              buildHref={(p) => buildFilterUrl({ warehouseId: warehouseFilter, type: typeFilter, page: p })}
              labels={{
                showing: tc('showing', {
                  from: (movements.page - 1) * movements.pageSize + 1,
                  to: Math.min(movements.page * movements.pageSize, movements.total),
                  total: movements.total,
                }),
                previous: tc('previous'),
                next: tc('next'),
                pageOf: tc('pageOf', { page: movements.page, totalPages: movements.totalPages }),
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

function FilterLink({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? 'rounded-md bg-background px-3 py-1.5 text-sm font-medium shadow-sm'
          : 'rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground'
      }
    >
      {label}
    </Link>
  );
}

// ============================================================================
// URL BUILDER
// ============================================================================

function buildFilterUrl(params: {
  warehouseId?: string;
  type?: string;
  page?: number;
}) {
  const searchParams = new URLSearchParams();
  if (params.warehouseId) searchParams.set('warehouseId', params.warehouseId);
  if (params.type) searchParams.set('type', params.type);
  if (params.page && params.page > 1) searchParams.set('page', String(params.page));
  const qs = searchParams.toString();
  return `/inventory/movements${qs ? `?${qs}` : ''}`;
}
