"use client";

import { useState } from "react";
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Hash,
  BookOpen,
} from "lucide-react";
import {
  InvoiceStatusesRepairCard,
  PaidDatesRepairCard,
} from "./repair-card-sections";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  repairNumberSequencesAction,
  repairInvoiceStatusesAction,
  generateMissingJournalEntriesAction,
  repairPaidDatesAction,
} from "@/app/actions/data-repair";

interface RepairStatus {
  sequences: { type: string; prefix: string; nextNumber: number }[];
  sentInvoicesBefore2026: number;
  sentPurchaseInvoicesBefore2026: number;
  documentsWithoutItems: number;
  documentsWithoutJournalEntries: number;
  totalJournalEntries: number;
  paidInvoicesWithoutPaidDate: number;
}

export function DataRepairPanel({
  initialStatus,
}: {
  initialStatus: RepairStatus | null;
}) {
  const t = useTranslations("settings.dataRepair");
  const [status, setStatus] = useState<RepairStatus | null>(initialStatus);
  const [repairingSequences, setRepairingSequences] = useState(false);
  const [repairingStatuses, setRepairingStatuses] = useState(false);
  const [generatingEntries, setGeneratingEntries] = useState(false);
  const [repairingPaidDates, setRepairingPaidDates] = useState(false);
  const [cutoffDate, setCutoffDate] = useState("2026-01-01");

  if (!status) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
        <AlertTriangle className="mx-auto mb-3 h-8 w-8" />
        <p>{t("repairFailed")}</p>
      </div>
    );
  }

  const hasIssues =
    status.sentInvoicesBefore2026 > 0 ||
    status.sentPurchaseInvoicesBefore2026 > 0 ||
    status.documentsWithoutJournalEntries > 0 ||
    status.paidInvoicesWithoutPaidDate > 0;

  async function handleRepairSequences() {
    setRepairingSequences(true);
    const result = await repairNumberSequencesAction();
    if (result.success && result.data) {
      toast.success(t("sequencesRepaired"));
      // Refresh status
      const updatedSeqs = Object.entries(result.data.updated).map(
        ([key, nextNumber]) => {
          const match = key.match(/^(.+?) \((.+)\)$/);
          return {
            prefix: match?.[1] || key,
            type: match?.[2] || key,
            nextNumber,
          };
        },
      );
      setStatus((prev) =>
        prev
          ? {
              ...prev,
              sequences: updatedSeqs.length > 0 ? updatedSeqs : prev.sequences,
            }
          : prev,
      );
    } else {
      toast.error(result.error || t("repairFailed"));
    }
    setRepairingSequences(false);
  }

  async function handleRepairStatuses() {
    setRepairingStatuses(true);
    const result = await repairInvoiceStatusesAction(cutoffDate);
    if (result.success && result.data) {
      const data = result.data;
      toast.success(
        t("statusesRepaired", {
          invoices: data.updatedInvoices,
          purchases: data.updatedPurchaseInvoices,
        }),
      );
      setStatus((prev) =>
        prev
          ? {
              ...prev,
              sentInvoicesBefore2026:
                prev.sentInvoicesBefore2026 - data.updatedInvoices,
              sentPurchaseInvoicesBefore2026:
                prev.sentPurchaseInvoicesBefore2026 -
                data.updatedPurchaseInvoices,
            }
          : prev,
      );
    } else {
      toast.error(result.error || t("repairFailed"));
    }
    setRepairingStatuses(false);
  }

  async function handleGenerateEntries() {
    setGeneratingEntries(true);
    const result = await generateMissingJournalEntriesAction();
    if (result.success && result.data) {
      const data = result.data;
      toast.success(
        t("entriesGenerated", {
          invoices: data.invoiceEntries,
          purchases: data.purchaseEntries,
          skipped: data.skipped,
        }),
      );
      if (data.errors.length > 0) {
        toast.warning(t("errorsOccurred"), {
          description: data.errors.slice(0, 3).join(", "),
        });
      }
      setStatus((prev) =>
        prev
          ? {
              ...prev,
              totalJournalEntries:
                prev.totalJournalEntries +
                data.invoiceEntries +
                data.purchaseEntries,
              documentsWithoutJournalEntries: Math.max(
                0,
                prev.documentsWithoutJournalEntries -
                  data.invoiceEntries -
                  data.purchaseEntries,
              ),
            }
          : prev,
      );
    } else {
      toast.error(result.error || t("repairFailed"));
    }
    setGeneratingEntries(false);
  }

  async function handleRepairPaidDates() {
    setRepairingPaidDates(true);
    const result = await repairPaidDatesAction();
    if (result.success && result.data) {
      toast.success(t("paidDatesRepaired", { count: result.data.updated }));
      setStatus((prev) =>
        prev ? { ...prev, paidInvoicesWithoutPaidDate: 0 } : prev,
      );
    } else {
      toast.error(result.error || t("repairFailed"));
    }
    setRepairingPaidDates(false);
  }

  return (
    <div className="space-y-6">
      {/* Number Sequences */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-lg border bg-background p-2">
            <Hash className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold">{t("sequences")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("sequencesDesc")}
            </p>
          </div>
        </div>

        <div className="mb-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">{t("sequenceType")}</th>
                <th className="pb-2 pr-4 font-medium">{t("sequencePrefix")}</th>
                <th className="pb-2 font-medium text-right">
                  {t("sequenceNext")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {status.sequences.map((seq) => (
                <tr key={`${seq.type}-${seq.prefix}`}>
                  <td className="py-2 pr-4">{seq.type}</td>
                  <td className="py-2 pr-4 font-mono">{seq.prefix}</td>
                  <td className="py-2 text-right font-mono font-medium">
                    {seq.nextNumber}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          onClick={handleRepairSequences}
          disabled={repairingSequences}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {repairingSequences && <Loader2 className="h-4 w-4 animate-spin" />}
          {repairingSequences ? t("repairingSequences") : t("repairSequences")}
        </button>
      </div>

      <InvoiceStatusesRepairCard
        sentInvoicesBefore2026={status.sentInvoicesBefore2026}
        sentPurchaseInvoicesBefore2026={status.sentPurchaseInvoicesBefore2026}
        cutoffDate={cutoffDate}
        onCutoffDateChange={setCutoffDate}
        repairing={repairingStatuses}
        onRepair={handleRepairStatuses}
      />

      {/* Journal Entries */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-lg border bg-background p-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold">{t("journalEntries")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("journalEntriesDesc")}
            </p>
          </div>
        </div>

        <div className="mb-4 space-y-2 text-sm">
          <p>{t("totalEntries", { count: status.totalJournalEntries })}</p>
          {status.documentsWithoutJournalEntries > 0 && (
            <p className="text-warning">
              {t("missingEntries", {
                count: status.documentsWithoutJournalEntries,
              })}
            </p>
          )}
        </div>

        {status.documentsWithoutJournalEntries > 0 ? (
          <button
            onClick={handleGenerateEntries}
            disabled={generatingEntries}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {generatingEntries && <Loader2 className="h-4 w-4 animate-spin" />}
            {generatingEntries ? t("generatingEntries") : t("generateEntries")}
          </button>
        ) : (
          <div className="flex items-center gap-2 text-sm text-success">
            <CheckCircle2 className="h-4 w-4" />
            {t("allGood")}
          </div>
        )}
      </div>

      <PaidDatesRepairCard
        count={status.paidInvoicesWithoutPaidDate}
        repairing={repairingPaidDates}
        onRepair={handleRepairPaidDates}
      />

      {/* All good message */}
      {!hasIssues && (
        <div className="rounded-xl border border-success/20 bg-success/5 p-6">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <div>
              <h3 className="font-semibold text-success">
                {t("noIssuesFound")}
              </h3>
              <p className="text-sm text-success/80">{t("allGood")}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
