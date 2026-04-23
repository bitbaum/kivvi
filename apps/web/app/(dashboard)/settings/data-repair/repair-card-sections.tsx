"use client";

import { Loader2, FileText, CalendarX } from "lucide-react";
import { useTranslations } from "next-intl";

interface InvoiceStatusesRepairCardProps {
  sentInvoicesBefore2026: number;
  sentPurchaseInvoicesBefore2026: number;
  cutoffDate: string;
  onCutoffDateChange: (date: string) => void;
  repairing: boolean;
  onRepair: () => void;
}

export function InvoiceStatusesRepairCard({
  sentInvoicesBefore2026,
  sentPurchaseInvoicesBefore2026,
  cutoffDate,
  onCutoffDateChange,
  repairing,
  onRepair,
}: InvoiceStatusesRepairCardProps) {
  const t = useTranslations("settings.dataRepair");

  if (sentInvoicesBefore2026 === 0 && sentPurchaseInvoicesBefore2026 === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="rounded-lg border bg-background p-2">
          <FileText className="h-4 w-4 text-warning" />
        </div>
        <div>
          <h3 className="font-semibold">{t("invoiceStatuses")}</h3>
          <p className="text-sm text-muted-foreground">
            {t("invoiceStatusesDesc")}
          </p>
        </div>
      </div>

      <div className="mb-4 space-y-2 text-sm">
        <p>{t("sentInvoices", { count: sentInvoicesBefore2026 })}</p>
        <p>
          {t("sentPurchaseInvoices", { count: sentPurchaseInvoicesBefore2026 })}
        </p>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <label className="text-sm font-medium">{t("cutoffDate")}</label>
        <input
          type="date"
          value={cutoffDate}
          onChange={(e) => onCutoffDateChange(e.target.value)}
          className="rounded-lg border bg-background px-3 py-1.5 text-sm"
        />
      </div>

      <button
        onClick={onRepair}
        disabled={repairing}
        className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {repairing && <Loader2 className="h-4 w-4 animate-spin" />}
        {repairing ? t("repairingStatuses") : t("repairStatuses")}
      </button>
    </div>
  );
}

interface PaidDatesRepairCardProps {
  count: number;
  repairing: boolean;
  onRepair: () => void;
}

export function PaidDatesRepairCard({
  count,
  repairing,
  onRepair,
}: PaidDatesRepairCardProps) {
  const t = useTranslations("settings.dataRepair");

  if (count === 0) return null;

  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="rounded-lg border bg-background p-2">
          <CalendarX className="h-4 w-4 text-warning" />
        </div>
        <div>
          <h3 className="font-semibold">{t("paidDates")}</h3>
          <p className="text-sm text-muted-foreground">{t("paidDatesDesc")}</p>
        </div>
      </div>

      <div className="mb-4 space-y-2 text-sm">
        <p className="text-warning">{t("paidDatesCount", { count })}</p>
      </div>

      <button
        onClick={onRepair}
        disabled={repairing}
        className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {repairing && <Loader2 className="h-4 w-4 animate-spin" />}
        {repairing ? t("repairingPaidDates") : t("repairPaidDates")}
      </button>
    </div>
  );
}
