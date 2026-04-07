"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSelection } from "@/hooks/use-selection";
import { cn, formatCurrency } from "@/lib/utils";
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

const STATUS_STYLES: Record<string, string> = {
  intake: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  testing:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  repair:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  ready_for_sale:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  listed:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  reserved:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  sold: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
  returned: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  donated: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400",
  recycled: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-500",
};

const CONDITION_STYLES: Record<string, string> = {
  untested: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  like_new:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  good: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  fair: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  poor: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  parts_only: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  scrap: "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-500",
};

const STATUS_LABELS: Record<string, string> = {
  intake: "Intake",
  testing: "Testing",
  repair: "Repair",
  ready_for_sale: "Ready",
  listed: "Listed",
  reserved: "Reserved",
  sold: "Sold",
  returned: "Returned",
  donated: "Donated",
  recycled: "Recycled",
};

const CONDITION_LABELS: Record<string, string> = {
  untested: "Untested",
  like_new: "Like New",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
  parts_only: "Parts",
  scrap: "Scrap",
};

export function SelectableItemList({ items }: SelectableItemListProps) {
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
              CONDITION_STYLES[item.condition],
            )}
          >
            {CONDITION_LABELS[item.condition] || item.condition}
          </span>
          <span
            className={cn(
              "inline-flex rounded-full px-2 py-0.5 text-xs font-medium w-fit",
              STATUS_STYLES[item.status],
            )}
          >
            {STATUS_LABELS[item.status] || item.status}
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
