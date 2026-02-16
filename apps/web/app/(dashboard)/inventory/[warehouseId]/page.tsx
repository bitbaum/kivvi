import Decimal from 'decimal.js';
import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import {
  ArrowLeft,
  Warehouse as WarehouseIcon,
  Package,
  MapPin,
  Star,
  AlertTriangle,
  ArrowUpDown,
  Boxes,
} from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getWarehouse, getStockLevelsByWarehouse } from '@kivvi/core';
import { cn } from '@/lib/utils';
import { getTranslations } from 'next-intl/server';
import { AddMovementForm } from './add-movement-form';

interface PageProps {
  params: Promise<{ warehouseId: string }>;
}

export default async function WarehouseDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.companyId) redirect('/login');

  const { warehouseId } = await params;

  const t = await getTranslations('inventory');
  const tc = await getTranslations('common');

  const warehouse = await getWarehouse(db, session.user.companyId, warehouseId);
  if (!warehouse) notFound();

  const stockLevels = await getStockLevelsByWarehouse(
    db,
    session.user.companyId,
    warehouseId
  );

  const totalProducts = stockLevels.length;
  const totalItems = stockLevels.reduce(
    (sum, sl) => sum.plus(new Decimal(sl.quantity)),
    new Decimal(0)
  );
  const lowStockCount = stockLevels.filter(
    (sl) => sl.minStock !== null && new Decimal(sl.quantity).lessThan(sl.minStock)
  ).length;

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div>
        <Link
          href="/inventory"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {tc('back')}
        </Link>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <WarehouseIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold">{warehouse.name}</h1>
                {warehouse.isDefault && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                    <Star className="h-3 w-3" />
                    {t('defaultWarehouse')}
                  </span>
                )}
              </div>
              {warehouse.address && (
                <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {warehouse.address}
                </p>
              )}
            </div>
          </div>
          <AddMovementForm warehouseId={warehouseId} />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Products</span>
            <Package className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="mt-2 text-2xl font-bold">{totalProducts}</p>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Items</span>
            <Boxes className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="mt-2 text-2xl font-bold">{totalItems.toString()}</p>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Low Stock Alerts
            </span>
            <AlertTriangle
              className={cn(
                'h-5 w-5',
                lowStockCount > 0
                  ? 'text-amber-500'
                  : 'text-muted-foreground'
              )}
            />
          </div>
          <p
            className={cn(
              'mt-2 text-2xl font-bold',
              lowStockCount > 0 && 'text-amber-600'
            )}
          >
            {lowStockCount}
          </p>
        </div>
      </div>

      {/* Stock Levels Table */}
      <div className="rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="font-semibold">{t('stockLevels')}</h2>
          <Link
            href={`/inventory/movements?warehouseId=${warehouseId}`}
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            {t('stockMovements')}
          </Link>
        </div>

        {stockLevels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Package className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">
              No stock in this warehouse
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Record a stock movement to add products to this warehouse.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm text-muted-foreground">
                  <th className="whitespace-nowrap px-4 py-3 font-medium">
                    Product
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium">
                    Article Number
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-right">
                    Quantity
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-right">
                    {t('reserved')}
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-right">
                    {t('available')}
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-right">
                    Min Stock
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium">
                    {tc('status')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {stockLevels.map((item) => {
                  const quantity = new Decimal(item.quantity);
                  const reserved = new Decimal(item.reservedQuantity || '0');
                  const available = quantity.minus(reserved);
                  const isLow =
                    item.minStock !== null &&
                    quantity.lessThanOrEqualTo(item.minStock) &&
                    quantity.greaterThan(0);
                  const isOut = quantity.lessThanOrEqualTo(0);

                  return (
                    <tr
                      key={item.id}
                      className={cn(
                        'transition-colors hover:bg-muted/50',
                        isLow && 'bg-amber-50/50 dark:bg-amber-950/10',
                        isOut && 'bg-red-50/50 dark:bg-red-950/10'
                      )}
                    >
                      <td className="whitespace-nowrap px-4 py-3">
                        <Link
                          href={`/products/${item.productId}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {item.productName}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-sm text-muted-foreground">
                        {item.articleNumber || '-'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-medium">
                        {quantity.toString()}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-muted-foreground">
                        {reserved.greaterThan(0) ? reserved.toString() : '-'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-medium">
                        {available.toString()}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-muted-foreground">
                        {item.minStock !== null ? item.minStock : '-'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {isOut ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-400">
                            <AlertTriangle className="h-3 w-3" />
                            Out of stock
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                            <AlertTriangle className="h-3 w-3" />
                            Low stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            In stock
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
