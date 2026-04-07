"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Package, Tag } from "lucide-react";
import {
  searchSellablesAction,
  type SellableResult,
} from "@/app/actions/sellables";
import { FormInput } from "@/components/ui/form-field";

/**
 * The callback receives a normalized product structure. For backward compat,
 * catalog products populate `id` = productId. For inventory items, `id` holds the
 * underlying productId (or the item id if there's no linked product), and
 * `inventoryItemId` is set so the document line item can be linked.
 */
interface ProductResult {
  id: string;
  name: string;
  articleNumber: string | null;
  unitPrice: string | null;
  vatRate: string | null;
  unit: string | null;
  stockQuantity: string | null;
  /** Set when a specific inventory item was picked (links the sell flow) */
  inventoryItemId?: string | null;
  productId?: string | null;
  condition?: string;
}

interface ProductSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Called when a product or inventory item is selected from the dropdown */
  onProductSelect: (product: ProductResult) => void;
  placeholder?: string;
  "data-item-id"?: string;
  "data-field"?: string;
}

const CONDITION_LABELS: Record<string, string> = {
  untested: "Untested",
  like_new: "Like New",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
  parts_only: "Parts",
  scrap: "Scrap",
};

export function ProductSearchInput({
  value,
  onChange,
  onProductSelect,
  placeholder,
  ...dataAttrs
}: ProductSearchInputProps) {
  const [results, setResults] = useState<SellableResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Close dropdown on click outside
  useEffect(() => {
    if (!showDropdown) return;
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showDropdown]);

  const doSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    const result = await searchSellablesAction(query);
    if (result.success && result.data) {
      setResults(result.data);
      setShowDropdown(result.data.length > 0);
      setHighlightIndex(-1);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 200);
  };

  const selectSellable = (sellable: SellableResult) => {
    onProductSelect({
      id:
        sellable.kind === "product"
          ? sellable.id
          : sellable.productId || sellable.id,
      name: sellable.name,
      articleNumber: sellable.number,
      unitPrice: sellable.price,
      vatRate: sellable.vatRate,
      unit: sellable.unit,
      stockQuantity: sellable.stockQuantity,
      productId:
        sellable.kind === "product" ? sellable.id : sellable.productId || null,
      inventoryItemId: sellable.kind === "inventory_item" ? sellable.id : null,
      condition: sellable.condition,
    });
    setShowDropdown(false);
    setResults([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && highlightIndex >= 0) {
      e.preventDefault();
      selectSellable(results[highlightIndex]);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <FormInput
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => results.length > 0 && setShowDropdown(true)}
        placeholder={placeholder}
        autoComplete="off"
        {...dataAttrs}
      />
      {showDropdown && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border bg-popover shadow-lg max-h-80 overflow-y-auto">
          {results.map((sellable, i) => {
            const isInventoryItem = sellable.kind === "inventory_item";
            const Icon = isInventoryItem ? Tag : Package;

            return (
              <button
                key={`${sellable.kind}-${sellable.id}`}
                type="button"
                onClick={() => selectSellable(sellable)}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-accent first:rounded-t-lg last:rounded-b-lg border-l-2 ${
                  i === highlightIndex ? "bg-accent" : ""
                } ${isInventoryItem ? "border-l-primary" : "border-l-transparent"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    <Icon
                      className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${
                        isInventoryItem
                          ? "text-primary"
                          : "text-muted-foreground"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">
                        {sellable.name}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        {sellable.number && <span>{sellable.number}</span>}
                        {isInventoryItem && sellable.condition && (
                          <span className="rounded bg-muted px-1.5 py-0.5">
                            {CONDITION_LABELS[sellable.condition] ||
                              sellable.condition}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 shrink-0 text-xs">
                    {sellable.price && (
                      <span className="text-foreground font-medium">
                        CHF {parseFloat(sellable.price).toFixed(2)}
                      </span>
                    )}
                    {!isInventoryItem &&
                      sellable.stockQuantity !== null &&
                      (() => {
                        const stock = parseFloat(sellable.stockQuantity);
                        const color =
                          stock <= 0
                            ? "text-red-500"
                            : stock < 5
                              ? "text-amber-500"
                              : "text-muted-foreground";
                        return (
                          <span className={color}>
                            {stock <= 0 ? "Out of stock" : `${stock} in stock`}
                          </span>
                        );
                      })()}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
