"use client";

import { ShoppingCart, Package, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatCurrency } from "@/lib/utils";
import type { CartItem } from "../_types";

interface PosCartProps {
  cart: CartItem[];
  onRemove: (id: string) => void;
}

export function PosCart({ cart, onRemove }: PosCartProps) {
  const t = useTranslations("inventory");

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
                <div className="truncate text-sm font-medium">
                  {item.description}
                </div>
                <div className="text-xs text-muted-foreground">
                  {item.itemNumber}
                </div>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums">
                {formatCurrency(item.askingPrice)}
              </span>
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
