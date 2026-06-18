"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatCurrency } from "@/lib/utils";
import type Decimal from "decimal.js";

interface EditDocumentSummaryProps {
  subtotal: Decimal;
  vatAmount: Decimal;
  total: Decimal;
  error: string | null;
  isPending: boolean;
  onSubmit: () => void;
}

export function EditDocumentSummary({
  subtotal,
  vatAmount,
  total,
  error,
  isPending,
  onSubmit,
}: EditDocumentSummaryProps) {
  const t = useTranslations("documents");
  const tc = useTranslations("common");

  return (
    <div className="sticky top-6 rounded-xl border bg-card p-6">
      <h2 className="mb-4 font-semibold">{t("summary")}</h2>
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

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg bg-destructive/5 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={onSubmit}
        disabled={isPending}
        className="mt-6 w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {isPending ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {tc("saving")}
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            {tc("saveChanges")}
            <kbd className="hidden items-center gap-0.5 rounded border border-primary-foreground/20 bg-primary-foreground/10 px-1.5 py-0.5 font-mono text-micro sm:inline-flex">
              ⌘↵
            </kbd>
          </span>
        )}
      </button>
    </div>
  );
}
