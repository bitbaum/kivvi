"use client";

import { useState } from "react";
import { ShoppingCart, Package, Trash2, Pencil, Check, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatCurrency } from "@/lib/utils";
import type { CartItem } from "../_types";

interface PosCartProps {
  cart: CartItem[];
  onRemove: (id: string) => void;
  onPriceChange: (id: string, price: string) => void;
}

export function PosCart({ cart, onRemove, onPriceChange }: PosCartProps) {
  const t = useTranslations("inventory");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  return (
    <div className="flex-1 rounded-xl border bg-card overflow-hidden flex flex-col">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-semibold">{t("posCart")}</h2>
        {cart.length > 0 && (
          <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
            {cart.length}
          </span>
        )}
      </div>
      {cart.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center py-8">
          <ShoppingCart className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">{t("posEmptyCart")}</p>
          <p className="text-xs text-muted-foreground">{t("posSearchHint")}</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto divide-y">
          {cart.map((item) => (
            <div key={item.id} className="flex items-center gap-3 px-4 py-3">
              {item.photoBase64 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.photoBase64}
                  alt={item.description}
                  className="h-9 w-9 rounded object-cover shrink-0"
                />
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-muted">
                  <Package className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="truncate text-sm font-medium">{item.description}</div>
                <div className="text-xs text-muted-foreground">{item.itemNumber}</div>
              </div>
              {editingId === item.id ? (
                <div className="flex items-center gap-1 shrink-0">
                  <input
                    type="number"
                    min={item.minPrice ?? "0"}
                    max={item.askingPrice}
                    step="0.05"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-20 rounded border px-2 py-1 text-sm tabular-nums text-right focus:outline-none focus:ring-1 focus:ring-ring"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const n = parseFloat(editValue);
                        const min = item.minPrice ? parseFloat(item.minPrice) : 0;
                        const max = parseFloat(item.askingPrice);
                        if (!isNaN(n) && n >= min && n <= max) {
                          onPriceChange(item.id, n.toFixed(2));
                        }
                        setEditingId(null);
                      } else if (e.key === "Escape") {
                        setEditingId(null);
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      const n = parseFloat(editValue);
                      const min = item.minPrice ? parseFloat(item.minPrice) : 0;
                      const max = parseFloat(item.askingPrice);
                      if (!isNaN(n) && n >= min && n <= max) {
                        onPriceChange(item.id, n.toFixed(2));
                      }
                      setEditingId(null);
                    }}
                    className="rounded p-1 text-success hover:bg-success/10 transition-colors"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="rounded p-1 text-muted-foreground hover:bg-muted transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setEditingId(item.id);
                    setEditValue(item.soldPrice);
                  }}
                  className="group flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 hover:bg-muted transition-colors"
                  title={item.minPrice ? `Min: ${formatCurrency(item.minPrice)}` : undefined}
                >
                  <span className="text-sm font-semibold tabular-nums">
                    {formatCurrency(item.soldPrice)}
                  </span>
                  <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              )}
              <button
                onClick={() => onRemove(item.id)}
                className="shrink-0 rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
