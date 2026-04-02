"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { searchProductsAction } from "@/app/actions/products";
import { FormInput } from "@/components/ui/form-field";

interface ProductResult {
  id: string;
  name: string;
  articleNumber: string | null;
  unitPrice: string | null;
  vatRate: string | null;
  unit: string | null;
  stockQuantity: string | null;
}

interface ProductSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Called when a product is selected from the dropdown */
  onProductSelect: (product: ProductResult) => void;
  placeholder?: string;
  "data-item-id"?: string;
  "data-field"?: string;
}

export function ProductSearchInput({
  value,
  onChange,
  onProductSelect,
  placeholder,
  ...dataAttrs
}: ProductSearchInputProps) {
  const [results, setResults] = useState<ProductResult[]>([]);
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
    const result = await searchProductsAction(query);
    if (result.success && result.data) {
      setResults(result.data.slice(0, 8));
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

  const selectProduct = (product: ProductResult) => {
    onProductSelect(product);
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
      selectProduct(results[highlightIndex]);
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
        <div className="absolute z-20 mt-1 w-full rounded-lg border bg-popover shadow-lg max-h-64 overflow-y-auto">
          {results.map((product, i) => {
            const stock = product.stockQuantity
              ? parseFloat(product.stockQuantity)
              : null;
            const stockColor =
              stock === null
                ? ""
                : stock <= 0
                  ? "text-red-500"
                  : stock < 5
                    ? "text-amber-500"
                    : "text-muted-foreground";

            return (
              <button
                key={product.id}
                type="button"
                onClick={() => selectProduct(product)}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-accent first:rounded-t-lg last:rounded-b-lg ${
                  i === highlightIndex ? "bg-accent" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium truncate">{product.name}</span>
                  <div className="flex items-center gap-3 shrink-0 text-xs">
                    {stock !== null && (
                      <span className={stockColor}>
                        {stock <= 0 ? "Out of stock" : `${stock} in stock`}
                      </span>
                    )}
                    {product.unitPrice && (
                      <span className="text-muted-foreground font-medium">
                        CHF {parseFloat(product.unitPrice).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
                {product.articleNumber && (
                  <span className="text-xs text-muted-foreground">
                    {product.articleNumber}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
