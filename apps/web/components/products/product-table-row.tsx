"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Package, Wrench } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { DEFAULT_CURRENCY } from "@kivvi/core/src/config/locale";
import { DEFAULT_UNIT } from "@/lib/config/products";
import { StatusBadge } from "@/components/status-badge";
import { UNIT_ABBREVIATIONS } from "@/lib/config/units";
import type { ProductItem, ProductTableTranslations } from "./product-table-types";

interface ProductTableRowProps {
  product: ProductItem;
  isSelected: boolean;
  onToggle: () => void;
  translations: ProductTableTranslations;
}

function StockBadge({
  product,
  labels,
}: {
  product: ProductItem;
  labels: ProductTableTranslations["columnLabels"];
}) {
  if (product.type !== "product") {
    return <span className="text-sm text-muted-foreground">-</span>;
  }
  const quantity = Number(product.stockQuantity || "0");
  const isLow = product.minStock !== null && quantity <= product.minStock && quantity > 0;
  const isOut = quantity <= 0;

  if (isOut) {
    return (
      <span className="inline-flex items-center rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
        {labels.outOfStock}
      </span>
    );
  }
  if (isLow) {
    return (
      <span className="inline-flex items-center rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
        {quantity} ({labels.lowStock})
      </span>
    );
  }
  return <span className="text-sm">{quantity}</span>;
}

export function ProductTableRow({
  product,
  isSelected,
  onToggle,
  translations,
}: ProductTableRowProps) {
  const tc = useTranslations("common");
  return (
    <tr
      className={cn(
        "group relative cursor-pointer transition-colors hover:bg-muted/50 focus-within:ring-2 focus-within:ring-inset focus-within:ring-ring",
        isSelected && "bg-primary/5",
      )}
    >
      <td className="whitespace-nowrap px-4 py-3">
        {/* Native link covers entire row — tr position:relative makes this work */}
        <Link
          href={`/products/${product.id}`}
          className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          aria-label={product.name}
        />
        <span className="relative z-10">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggle}
            aria-label={tc("aria.selectItem", { name: product.name })}
            className="h-4 w-4 rounded border-input"
          />
        </span>
      </td>
      <td className="hidden whitespace-nowrap px-4 py-3 lg:table-cell">
        <span className="font-mono text-sm text-primary">{product.articleNumber || "-"}</span>
      </td>
      <td className="px-4 py-3">
        <span className="font-medium">{product.name}</span>
        {product.sku && (
          <p className="text-xs text-muted-foreground">
            {translations.columnLabels.sku}: {product.sku}
          </p>
        )}
        {product.articleNumber && (
          <p className="font-mono text-xs text-primary lg:hidden">{product.articleNumber}</p>
        )}
      </td>
      <td className="hidden whitespace-nowrap px-4 py-3 md:table-cell">
        <span className="inline-flex items-center gap-1.5 text-sm">
          {product.type === "product" ? (
            <Package className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          {translations.typeLabels[product.type]}
        </span>
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-right font-medium">
        {formatCurrency(product.unitPrice, product.currency || DEFAULT_CURRENCY)}
        <span className="ml-1 text-xs text-muted-foreground">
          /{UNIT_ABBREVIATIONS[product.unit || DEFAULT_UNIT] || product.unit}
        </span>
      </td>
      <td className="hidden whitespace-nowrap px-4 py-3 text-right text-sm lg:table-cell">
        {product.vatRate}%
      </td>
      <td className="hidden whitespace-nowrap px-4 py-3 text-right md:table-cell">
        <StockBadge product={product} labels={translations.columnLabels} />
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        <StatusBadge
          variant={product.isActive ? "active" : "inactive"}
          label={
            product.isActive ? translations.columnLabels.active : translations.columnLabels.inactive
          }
        />
      </td>
    </tr>
  );
}
