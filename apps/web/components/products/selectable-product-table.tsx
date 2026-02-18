'use client';

import { useCallback, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Package, Wrench } from 'lucide-react';
import { useSelection } from '@/hooks/use-selection';
import { BulkActionToolbar } from '@/components/bulk-action-toolbar';
import { BulkResultBanner } from '@/components/bulk-result-banner';
import {
  bulkDeleteProductsAction,
  bulkDeactivateProductsAction,
} from '@/app/actions/bulk-operations';
import type { BulkOperationResult } from '@/app/actions/bulk-operations';
import { cn, formatCurrency } from '@/lib/utils';

const UNIT_LABELS: Record<string, string> = {
  piece: 'pc',
  hour: 'h',
  kg: 'kg',
  m: 'm',
  m2: 'm\u00B2',
  m3: 'm\u00B3',
  liter: 'l',
};

interface ProductItem {
  id: string;
  articleNumber: string | null;
  name: string;
  sku: string | null;
  type: string;
  unitPrice: string;
  currency: string | null;
  unit: string | null;
  vatRate: string | null;
  stockQuantity: string | null;
  minStock: number | null;
  isActive: boolean | null;
}

interface Translations {
  columnLabels: {
    articleNumber: string;
    name: string;
    type: string;
    unitPrice: string;
    vatRate: string;
    stock: string;
    status: string;
    active: string;
    inactive: string;
    sku: string;
    outOfStock: string;
    lowStock: string;
  };
  typeLabels: Record<string, string>;
  bulkLabels: Record<string, string>;
}

interface SelectableProductTableProps {
  data: ProductItem[];
  translations: Translations;
}

export function SelectableProductTable({ data, translations }: SelectableProductTableProps) {
  const router = useRouter();
  const allIds = useMemo(() => data.map((p) => p.id), [data]);
  const { selectedIds, toggle, toggleAll, clear, isSelected, isAllSelected, isSomeSelected, count } =
    useSelection(allIds);
  const [bulkResult, setBulkResult] = useState<BulkOperationResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [confirmAction, setConfirmAction] = useState<'delete' | 'deactivate' | null>(null);

  const handleComplete = useCallback(
    (result: BulkOperationResult) => {
      setBulkResult(result);
      clear();
    },
    [clear]
  );

  const dismissBanner = useCallback(() => setBulkResult(null), []);

  function executeAction(action: 'delete' | 'deactivate') {
    if (!confirmAction) {
      setConfirmAction(action);
      return;
    }
    setConfirmAction(null);
    startTransition(async () => {
      const result = action === 'delete'
        ? await bulkDeleteProductsAction({ productIds: selectedIds })
        : await bulkDeactivateProductsAction({ productIds: selectedIds });
      if (result.success && result.data) {
        handleComplete(result.data);
      } else {
        handleComplete({ successCount: 0, failureCount: selectedIds.length, results: [] });
      }
    });
  }

  function renderStockBadge(product: ProductItem) {
    if (product.type !== 'product') {
      return <span className="text-sm text-muted-foreground">-</span>;
    }
    const quantity = Number(product.stockQuantity || '0');
    const isLow = product.minStock !== null && quantity <= product.minStock && quantity > 0;
    const isOut = quantity <= 0;

    if (isOut) {
      return (
        <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-400">
          {translations.columnLabels.outOfStock}
        </span>
      );
    }
    if (isLow) {
      return (
        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
          {quantity} ({translations.columnLabels.lowStock})
        </span>
      );
    }
    return <span className="text-sm">{quantity}</span>;
  }

  return (
    <>
      <BulkResultBanner result={bulkResult} labels={translations.bulkLabels} onDismiss={dismissBanner} />

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="hidden border-b text-left text-sm text-muted-foreground sm:table-row">
              <th className="whitespace-nowrap px-4 py-3 font-medium">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={(el) => { if (el) el.indeterminate = isSomeSelected; }}
                  onChange={toggleAll}
                  aria-label="Select all"
                  className="h-4 w-4 rounded border-gray-300"
                />
              </th>
              <th className="hidden whitespace-nowrap px-4 py-3 font-medium lg:table-cell">{translations.columnLabels.articleNumber}</th>
              <th className="whitespace-nowrap px-4 py-3 font-medium">{translations.columnLabels.name}</th>
              <th className="hidden whitespace-nowrap px-4 py-3 font-medium md:table-cell">{translations.columnLabels.type}</th>
              <th className="whitespace-nowrap px-4 py-3 font-medium text-right">{translations.columnLabels.unitPrice}</th>
              <th className="hidden whitespace-nowrap px-4 py-3 font-medium text-right lg:table-cell">{translations.columnLabels.vatRate}</th>
              <th className="hidden whitespace-nowrap px-4 py-3 font-medium text-right md:table-cell">{translations.columnLabels.stock}</th>
              <th className="whitespace-nowrap px-4 py-3 font-medium">{translations.columnLabels.status}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.map((product) => (
              <tr
                key={product.id}
                tabIndex={0}
                onClick={() => router.push(`/products/${product.id}`)}
                onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/products/${product.id}`); }}
                className={cn(
                  'group cursor-pointer transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  isSelected(product.id) && 'bg-primary/5'
                )}
              >
                <td className="whitespace-nowrap px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isSelected(product.id)}
                    onChange={() => toggle(product.id)}
                    aria-label={`Select ${product.name}`}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                </td>
                <td className="hidden whitespace-nowrap px-4 py-3 lg:table-cell">
                  <span className="font-mono text-sm text-primary">
                    {product.articleNumber || '-'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="font-medium">{product.name}</span>
                  {product.sku && (
                    <p className="text-xs text-muted-foreground">
                      {translations.columnLabels.sku}: {product.sku}
                    </p>
                  )}
                  {/* Show article number on mobile */}
                  {product.articleNumber && (
                    <p className="font-mono text-xs text-primary lg:hidden">{product.articleNumber}</p>
                  )}
                </td>
                <td className="hidden whitespace-nowrap px-4 py-3 md:table-cell">
                  <span className="inline-flex items-center gap-1.5 text-sm">
                    {product.type === 'product' ? (
                      <Package className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    {translations.typeLabels[product.type]}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-medium">
                  {formatCurrency(Number(product.unitPrice), product.currency || 'CHF')}
                  <span className="ml-1 text-xs text-muted-foreground">
                    /{UNIT_LABELS[product.unit || 'piece'] || product.unit}
                  </span>
                </td>
                <td className="hidden whitespace-nowrap px-4 py-3 text-right text-sm lg:table-cell">
                  {product.vatRate}%
                </td>
                <td className="hidden whitespace-nowrap px-4 py-3 text-right md:table-cell">
                  {renderStockBadge(product)}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span
                    className={
                      product.isActive
                        ? 'inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                    }
                  >
                    {product.isActive ? translations.columnLabels.active : translations.columnLabels.inactive}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bulk action toolbar */}
      <BulkActionToolbar
        count={count}
        selectedLabel={translations.bulkLabels.selected}
        clearLabel={translations.bulkLabels.clearSelection}
        onClear={clear}
      >
        <button
          onClick={() => executeAction('deactivate')}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
        >
          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {translations.bulkLabels.deactivate}
        </button>
        <button
          onClick={() => executeAction('delete')}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {translations.bulkLabels.delete}
        </button>
      </BulkActionToolbar>

      {/* Confirmation dialog */}
      {confirmAction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onKeyDown={(e) => { if (e.key === 'Escape') setConfirmAction(null); }}
        >
          <div role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title" className="mx-4 w-full max-w-md rounded-xl border bg-card p-6 shadow-xl">
            <h3 id="confirm-dialog-title" className="text-lg font-semibold">{translations.bulkLabels.confirmTitle}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {(confirmAction === 'delete' ? translations.bulkLabels.confirmDelete : translations.bulkLabels.confirmDeactivate)
                .replace('{count}', String(selectedIds.length))}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setConfirmAction(null)}
                className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                {translations.bulkLabels.cancel}
              </button>
              <button
                onClick={() => executeAction(confirmAction)}
                disabled={isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isPending ? translations.bulkLabels.processing : translations.bulkLabels.confirmAction}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
