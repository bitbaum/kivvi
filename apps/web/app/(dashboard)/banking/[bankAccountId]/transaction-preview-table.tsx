"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { CamtPreview } from "@/app/actions/banking";
import type { ParsedTransaction } from "./parse-bank-csv";

type FileType = "csv" | "xml";

interface TransactionPreviewTableProps {
  fileType: FileType;
  csvTransactions: ParsedTransaction[];
  camtPreview: CamtPreview | null;
  previewCount: number;
  isPending: boolean;
  onImport: () => void;
  onClose: () => void;
}

export function TransactionPreviewTable({
  fileType,
  csvTransactions,
  camtPreview,
  previewCount,
  isPending,
  onImport,
  onClose,
}: TransactionPreviewTableProps) {
  const t = useTranslations("banking");
  const tc = useTranslations("common");

  return (
    <>
      <div>
        <p className="mb-2 text-sm font-medium">{t("preview", { count: previewCount })}</p>
        <div className="max-h-64 overflow-x-auto overflow-y-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted">
              <tr className="text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2">{tc("date")}</th>
                <th className="px-3 py-2">{tc("description")}</th>
                {fileType === "xml" && <th className="px-3 py-2">{t("debtor")}</th>}
                {fileType === "xml" && <th className="px-3 py-2">{t("creditor")}</th>}
                {fileType === "csv" && <th className="px-3 py-2">{t("reference")}</th>}
                <th className="px-3 py-2 text-right">{tc("amount")}</th>
                {fileType === "csv" && <th className="px-3 py-2 text-right">{t("balance")}</th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {fileType === "xml" && camtPreview
                ? camtPreview.entries.slice(0, 50).map((entry, i) => {
                    const amt = Number(entry.amount);
                    return (
                      <tr key={i} className="hover:bg-muted/50">
                        <td className="whitespace-nowrap px-3 py-2">{entry.bookingDate}</td>
                        <td className="max-w-[180px] truncate px-3 py-2">
                          {entry.description || "-"}
                        </td>
                        <td className="max-w-[120px] truncate px-3 py-2">
                          {entry.debtorName || "-"}
                        </td>
                        <td className="max-w-[120px] truncate px-3 py-2">
                          {entry.creditorName || "-"}
                        </td>
                        <td
                          className={`whitespace-nowrap px-3 py-2 text-right font-medium ${amt >= 0 ? "text-success" : "text-destructive"}`}
                        >
                          {entry.amount}
                        </td>
                      </tr>
                    );
                  })
                : csvTransactions.slice(0, 50).map((txn, i) => {
                    const amt = Number(txn.amount);
                    return (
                      <tr key={i} className="hover:bg-muted/50">
                        <td className="whitespace-nowrap px-3 py-2">{txn.date}</td>
                        <td className="max-w-[200px] truncate px-3 py-2">
                          {txn.description || "-"}
                        </td>
                        <td className="max-w-[120px] truncate px-3 py-2 font-mono text-xs">
                          {txn.reference || "-"}
                        </td>
                        <td
                          className={`whitespace-nowrap px-3 py-2 text-right font-medium ${amt >= 0 ? "text-success" : "text-destructive"}`}
                        >
                          {txn.amount}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right">
                          {txn.balance || "-"}
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
          {previewCount > 50 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              {t("andMore", { count: previewCount - 50 })}
            </p>
          )}
        </div>
      </div>

      {camtPreview?.openingBalance && camtPreview?.closingBalance && (
        <div className="flex gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">{t("openingBalance")}: </span>
            <span className="font-medium">
              {camtPreview.openingBalance.amount} {camtPreview.openingBalance.currency}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">{t("closingBalance")}: </span>
            <span className="font-medium">
              {camtPreview.closingBalance.amount} {camtPreview.closingBalance.currency}
            </span>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button onClick={onImport} disabled={isPending} className="flex-1">
          {isPending ? t("importing") : t("importTransactions", { count: previewCount })}
        </Button>
        <Button variant="secondary" onClick={onClose}>
          {tc("cancel")}
        </Button>
      </div>
    </>
  );
}
