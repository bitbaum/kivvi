"use client";

import { Loader2 } from "lucide-react";
import type Decimal from "decimal.js";
import type { useTranslations } from "next-intl";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { DocumentTypeConfig } from "@/lib/config/document-types";

interface DocumentSummaryPanelProps {
  config: DocumentTypeConfig;
  subtotal: Decimal;
  vatAmount: Decimal;
  total: Decimal;
  /** When true (donation intake), show item count instead of financials */
  hideFinancials: boolean;
  itemCount: number;
  totalQuantity: number;
  error: string | null;
  isPending: boolean;
  onSubmit: () => void;
  t: ReturnType<typeof useTranslations>;
  tc: ReturnType<typeof useTranslations>;
}

export function DocumentSummaryPanel({
  config,
  subtotal,
  vatAmount,
  total,
  hideFinancials,
  itemCount,
  totalQuantity,
  error,
  isPending,
  onSubmit,
  t,
  tc,
}: DocumentSummaryPanelProps) {
  return (
    <div className="sticky top-6 rounded-xl border bg-card p-6">
      <h2 className="mb-4 font-semibold">{t("summary")}</h2>

      {hideFinancials ? (
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("lineItems")}</span>
            <span className="font-medium">{itemCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("quantity")}</span>
            <span className="font-medium">{totalQuantity}</span>
          </div>
        </div>
      ) : (
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{tc("subtotal")}</span>
            <span>{formatCurrency(subtotal.toFixed(2))}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("vat")}</span>
            <span>{formatCurrency(vatAmount.toFixed(2))}</span>
          </div>
          <div className="flex justify-between border-t pt-2 text-lg font-bold">
            <span>{tc("total")}</span>
            <span>{formatCurrency(total.toFixed(2))}</span>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <Button
        type="button"
        onClick={onSubmit}
        disabled={isPending}
        className="mt-6 w-full"
        size="lg"
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {tc("creating")}
          </>
        ) : (
          <>
            {t("newDocument", { type: t(config.label) })}
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-primary-foreground/20 bg-primary-foreground/10 px-1.5 py-0.5 text-micro font-mono">
              ⌘↵
            </kbd>
          </>
        )}
      </Button>

      <p className="mt-2 text-center text-xs text-muted-foreground">
        {t("createdAsDraft", { type: t(config.label) })}
      </p>
    </div>
  );
}
