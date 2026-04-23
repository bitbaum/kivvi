"use client";

import { useCallback, useMemo, useState, useTransition, useRef } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSelection } from "@/hooks/use-selection";
import { BulkActionToolbar } from "@/components/bulk-action-toolbar";
import { BulkResultBanner } from "@/components/bulk-result-banner";
import {
  bulkDeleteProductsAction,
  bulkDeactivateProductsAction,
} from "@/app/actions/bulk-operations";
import type { BulkOperationResult } from "@/app/actions/bulk-operations";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { SortableHeader } from "@/components/sortable-header";
import { ProductTableRow } from "./product-table-row";
import type {
  ProductItem,
  ProductTableTranslations,
} from "./product-table-types";

// Re-export for consumers that imported from this file
export type { ProductItem, ProductTableTranslations as Translations };

interface SortProps {
  field: string;
  order: "asc" | "desc";
  hrefs: Record<string, string>;
}

interface SelectableProductTableProps {
  data: ProductItem[];
  translations: ProductTableTranslations;
  sort?: SortProps;
}

export function SelectableProductTable({
  data,
  translations,
  sort,
}: SelectableProductTableProps) {
  const tc = useTranslations("common");
  const allIds = useMemo(() => data.map((p) => p.id), [data]);
  const {
    selectedIds,
    toggle,
    toggleAll,
    clear,
    isSelected,
    isAllSelected,
    isSomeSelected,
    count,
  } = useSelection(allIds);
  const [bulkResult, setBulkResult] = useState<BulkOperationResult | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();
  const [confirmAction, setConfirmAction] = useState<
    "delete" | "deactivate" | null
  >(null);
  const confirmRef = useRef<HTMLDivElement>(null);
  useFocusTrap(confirmRef, !!confirmAction);

  const handleComplete = useCallback(
    (result: BulkOperationResult) => {
      setBulkResult(result);
      clear();
    },
    [clear],
  );

  const dismissBanner = useCallback(() => setBulkResult(null), []);

  function executeAction(action: "delete" | "deactivate") {
    if (!confirmAction) {
      setConfirmAction(action);
      return;
    }
    setConfirmAction(null);
    startTransition(async () => {
      const result =
        action === "delete"
          ? await bulkDeleteProductsAction({ productIds: selectedIds })
          : await bulkDeactivateProductsAction({ productIds: selectedIds });
      if (result.success && result.data) {
        handleComplete(result.data);
      } else {
        handleComplete({
          successCount: 0,
          failureCount: selectedIds.length,
          results: [],
        });
      }
    });
  }

  return (
    <>
      <BulkResultBanner
        result={bulkResult}
        labels={translations.bulkLabels}
        onDismiss={dismissBanner}
      />

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="hidden border-b text-left text-sm text-muted-foreground sm:table-row">
              <th className="whitespace-nowrap px-4 py-3 font-medium">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = isSomeSelected;
                  }}
                  onChange={toggleAll}
                  aria-label={tc("aria.selectAll")}
                  className="h-4 w-4 rounded border-input"
                />
              </th>
              <th className="hidden whitespace-nowrap px-4 py-3 font-medium lg:table-cell">
                {sort ? (
                  <SortableHeader
                    label={translations.columnLabels.articleNumber}
                    field="articleNumber"
                    currentSort={sort.field}
                    currentOrder={sort.order}
                    href={sort.hrefs.articleNumber}
                  />
                ) : (
                  translations.columnLabels.articleNumber
                )}
              </th>
              <th className="whitespace-nowrap px-4 py-3 font-medium">
                {sort ? (
                  <SortableHeader
                    label={translations.columnLabels.name}
                    field="name"
                    currentSort={sort.field}
                    currentOrder={sort.order}
                    href={sort.hrefs.name}
                  />
                ) : (
                  translations.columnLabels.name
                )}
              </th>
              <th className="hidden whitespace-nowrap px-4 py-3 font-medium md:table-cell">
                {translations.columnLabels.type}
              </th>
              <th className="whitespace-nowrap px-4 py-3 font-medium text-right">
                {sort ? (
                  <SortableHeader
                    label={translations.columnLabels.unitPrice}
                    field="unitPrice"
                    currentSort={sort.field}
                    currentOrder={sort.order}
                    href={sort.hrefs.unitPrice}
                  />
                ) : (
                  translations.columnLabels.unitPrice
                )}
              </th>
              <th className="hidden whitespace-nowrap px-4 py-3 font-medium text-right lg:table-cell">
                {translations.columnLabels.vatRate}
              </th>
              <th className="hidden whitespace-nowrap px-4 py-3 font-medium text-right md:table-cell">
                {translations.columnLabels.stock}
              </th>
              <th className="whitespace-nowrap px-4 py-3 font-medium">
                {translations.columnLabels.status}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.map((product) => (
              <ProductTableRow
                key={product.id}
                product={product}
                isSelected={isSelected(product.id)}
                onToggle={() => toggle(product.id)}
                translations={translations}
              />
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
          onClick={() => executeAction("deactivate")}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
        >
          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {translations.bulkLabels.deactivate}
        </button>
        <button
          onClick={() => executeAction("delete")}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
        >
          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {translations.bulkLabels.delete}
        </button>
      </BulkActionToolbar>

      {/* Confirmation dialog */}
      {confirmAction && (
        <div
          ref={confirmRef}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onKeyDown={(e) => {
            if (e.key === "Escape") setConfirmAction(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            className="mx-4 w-full max-w-md rounded-xl border bg-card p-6 shadow-xl"
          >
            <h2 id="confirm-dialog-title" className="text-lg font-semibold">
              {translations.bulkLabels.confirmTitle}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {(confirmAction === "delete"
                ? translations.bulkLabels.confirmDelete
                : translations.bulkLabels.confirmDeactivate
              ).replace("{count}", String(selectedIds.length))}
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
                className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
              >
                {isPending
                  ? translations.bulkLabels.processing
                  : translations.bulkLabels.confirmAction}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
