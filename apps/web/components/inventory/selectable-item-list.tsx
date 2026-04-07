"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useSelection } from "@/hooks/use-selection";
import { cn, formatCurrency } from "@/lib/utils";
import {
  getStatusStyle,
  getConditionStyle,
  getStatusLabelKey,
  getConditionLabelKey,
} from "@/lib/config/inventory-items";
import { ItemBatchToolbar } from "./item-batch-toolbar";

interface ItemData {
  id: string;
  itemNumber: string;
  description: string;
  condition: string;
  status: string;
  askingPrice: string | null;
  donorName: string | null;
  productName: string | null;
  photoBase64: string | null;
}

interface SelectableItemListProps {
  items: ItemData[];
}

export function SelectableItemList({ items }: SelectableItemListProps) {
  const t = useTranslations("inventory");
  const allIds = useMemo(() => items.map((i) => i.id), [items]);
  const {
    selectedIds,
    toggle,
    toggleAll,
    clear,
    isSelected,
    isAllSelected,
    isSomeSelected,
  } = useSelection(allIds);

  return (
    <>
      {/* Table header */}
      <div className="hidden border-b px-4 py-3 text-sm font-medium text-muted-foreground sm:grid sm:grid-cols-[auto_48px_1fr_auto_auto_auto_auto] sm:gap-4 sm:items-center">
        <input
          type="checkbox"
          checked={isAllSelected}
          ref={(el) => {
            if (el) el.indeterminate = isSomeSelected;
          }}
          onChange={toggleAll}
          className="h-4 w-4 rounded border-input"
        />
        <div />
        <div>Item</div>
        <div>Condition</div>
        <div>Status</div>
        <div>Price</div>
        <div>Source</div>
      </div>

      {/* Rows */}
      {items.map((item) => (
        <div
          key={item.id}
          className={cn(
            "flex flex-col gap-1 border-b px-4 py-3 sm:grid sm:grid-cols-[auto_48px_1fr_auto_auto_auto_auto] sm:items-center sm:gap-4",
            isSelected(item.id) && "bg-primary/5",
          )}
        >
          <input
            type="checkbox"
            checked={isSelected(item.id)}
            onChange={() => toggle(item.id)}
            className="h-4 w-4 rounded border-input"
          />
          {/* Thumbnail */}
          <div className="flex items-center justify-center">
            {item.photoBase64 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.photoBase64}
                alt=""
                className="h-10 w-10 rounded object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded bg-muted text-muted-foreground text-xs">
                —
              </div>
            )}
          </div>
          <Link href={`/intake/items/${item.id}`} className="hover:underline">
            <div className="font-medium">{item.description}</div>
            <div className="text-xs text-muted-foreground">
              {item.itemNumber}
              {item.productName && ` — ${item.productName}`}
            </div>
          </Link>
          <span
            className={cn(
              "inline-flex rounded-full px-2 py-0.5 text-xs font-medium w-fit",
              getConditionStyle(item.condition),
            )}
          >
            {t(getConditionLabelKey(item.condition))}
          </span>
          <span
            className={cn(
              "inline-flex rounded-full px-2 py-0.5 text-xs font-medium w-fit",
              getStatusStyle(item.status),
            )}
          >
            {t(getStatusLabelKey(item.status))}
          </span>
          <div className="text-sm tabular-nums">
            {item.askingPrice ? formatCurrency(item.askingPrice) : "—"}
          </div>
          <div className="text-sm text-muted-foreground truncate max-w-[150px]">
            {item.donorName || "—"}
          </div>
        </div>
      ))}

      {/* Batch toolbar */}
      <ItemBatchToolbar selectedIds={selectedIds} onClear={clear} />
    </>
  );
}
