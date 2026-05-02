"use client";

import { Search, X, Package } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatCurrency } from "@/lib/utils";
import type { SearchResult } from "../_types";

interface PosSearchProps {
  query: string;
  results: SearchResult[];
  searching: boolean;
  onSearch: (q: string) => void;
  onAddToCart: (item: SearchResult) => void;
  cartIds: Set<string>;
}

export function PosSearch({
  query,
  results,
  searching,
  onSearch,
  onAddToCart,
  cartIds,
}: PosSearchProps) {
  const t = useTranslations("inventory");
  const tc = useTranslations("common");

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={t("posSearchItems")}
          className="w-full rounded-xl border bg-background py-3 pl-10 pr-4 text-base focus:outline-none focus:ring-2 focus:ring-primary"
          autoFocus
        />
        {query && (
          <button
            onClick={() => onSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {results.length > 0 && (
        <div className="rounded-xl border bg-card divide-y overflow-y-auto max-h-64 shrink-0">
          {results.map((item) => (
            <button
              key={item.id}
              onClick={() => onAddToCart(item)}
              disabled={!item.askingPrice || cartIds.has(item.id)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors disabled:opacity-40"
            >
              {item.photoBase64 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.photoBase64}
                  alt=""
                  className="h-10 w-10 rounded object-cover shrink-0"
                />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-muted">
                  <Package className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="truncate text-sm font-medium">
                  {item.description}
                </div>
                <div className="text-xs text-muted-foreground">
                  {item.itemNumber}
                </div>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums">
                {item.askingPrice ? formatCurrency(item.askingPrice) : "—"}
              </span>
            </button>
          ))}
          {searching && (
            <div className="px-4 py-3 text-sm text-muted-foreground text-center">
              {tc("loading")}…
            </div>
          )}
        </div>
      )}
    </div>
  );
}
