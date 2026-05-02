"use client";

import { useState, useCallback } from "react";
import { Loader2, Upload, CheckCircle2, PackagePlus } from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";
import { useTranslations } from "next-intl";
import { formatCurrency } from "@/lib/utils";
import { DEFAULT_LOCALE } from "@kivvi/core/src/config/locale";
import {
  cleanHeaders,
  applyMapping,
  KIVITENDO_PRODUCT_PROFILE,
} from "@kivvi/core/src/domain/import-mappings";
import { importProductsFromCsvAction } from "@/app/actions/onboarding";

interface ParsedPreview {
  fileName: string;
  totalRows: number;
  rowsWithName: number;
  rowsWithPrice: number;
  sample: Array<Record<string, string | null>>;
  rows: Array<Record<string, string | null>>;
}

export function ProductImportPanel() {
  const t = useTranslations("settings.repairImport.productImport");
  const [preview, setPreview] = useState<ParsedPreview | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<{
    inserted: number;
    skipped: number;
  } | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      Papa.parse(file, {
        header: false,
        skipEmptyLines: true,
        encoding: "UTF-8",
        complete: (results) => {
          const rawRows = results.data as string[][];
          if (rawRows.length < 2) {
            toast.error(t("csvEmpty"));
            return;
          }

          const headers = cleanHeaders(rawRows[0].map((h) => h || ""));
          const missing = KIVITENDO_PRODUCT_PROFILE.signatureColumns.filter(
            (col) => !headers.includes(col),
          );
          if (missing.length > 0) {
            toast.error(
              t("csvMissingColumns", { columns: missing.join(", ") }),
            );
            return;
          }

          const dataRows = rawRows.slice(1).map((row) => {
            const record: Record<string, string> = {};
            headers.forEach((h, i) => {
              record[h] = row[i] || "";
            });
            return record;
          });

          const mapped = dataRows.map((row) =>
            applyMapping(row, KIVITENDO_PRODUCT_PROFILE),
          );

          setPreview({
            fileName: file.name,
            totalRows: mapped.length,
            rowsWithName: mapped.filter((r) => r.name).length,
            rowsWithPrice: mapped.filter(
              (r) => r.unitPrice && r.unitPrice !== "0",
            ).length,
            sample: mapped.slice(0, 5),
            rows: mapped,
          });
          setResult(null);
        },
        error: (err) => {
          toast.error(t("csvParseError", { message: err.message }));
        },
      });
    },
    [t],
  );

  const handleImport = async () => {
    if (!preview) return;
    setIsImporting(true);

    const res = await importProductsFromCsvAction(preview.rows);

    if (res.success && res.data) {
      setResult(res.data);
      toast.success(
        t("importSuccess", {
          inserted: res.data.inserted,
          skipped: res.data.skipped,
        }),
      );
    } else {
      toast.error(res.error || t("importFailed"));
    }

    setIsImporting(false);
  };

  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      <div className="flex items-center gap-3">
        <PackagePlus className="h-5 w-5 text-muted-foreground" />
        <div>
          <h3 className="font-semibold">{t("title")}</h3>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
      </div>

      {!preview && !result && <FileDropZone onFile={handleFile} t={t} />}

      {preview && !result && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <Upload className="h-4 w-4 text-primary" />
            <span className="font-medium">{preview.fileName}</span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-sm">
            <Stat label={t("statsTotal")} value={preview.totalRows} />
            <Stat label={t("statsWithName")} value={preview.rowsWithName} />
            <Stat label={t("statsWithPrice")} value={preview.rowsWithPrice} />
          </div>

          {/* Sample table */}
          <div className="overflow-x-auto rounded-lg border text-xs">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2 text-left font-medium">
                    {t("colArticleNr")}
                  </th>
                  <th className="px-3 py-2 text-left font-medium">
                    {t("colName")}
                  </th>
                  <th className="px-3 py-2 text-left font-medium">
                    {t("colType")}
                  </th>
                  <th className="px-3 py-2 text-right font-medium">
                    {t("colPrice")}
                  </th>
                  <th className="px-3 py-2 text-left font-medium">
                    {t("colGroup")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {preview.sample.map((row, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-3 py-1.5 font-mono">
                      {row.articleNumber || "—"}
                    </td>
                    <td className="px-3 py-1.5 max-w-[200px] truncate">
                      {row.name || (
                        <span className="text-destructive">{t("noName")}</span>
                      )}
                    </td>
                    <td className="px-3 py-1.5">{row.type || "product"}</td>
                    <td className="px-3 py-1.5 text-right">
                      {row.unitPrice ? formatCurrency(row.unitPrice) : "—"}
                    </td>
                    <td className="px-3 py-1.5">{row.productGroup || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.totalRows > 5 && (
              <p className="px-3 py-2 text-muted-foreground">
                {t("andMore", { count: preview.totalRows - 5 })}
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleImport}
              disabled={isImporting}
              className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isImporting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isImporting
                ? t("importing")
                : t("importN", { count: preview.rowsWithName })}
            </button>
            <button
              onClick={() => setPreview(null)}
              disabled={isImporting}
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted/50 disabled:opacity-50"
            >
              {t("cancel")}
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <span className="font-medium">{t("importDone")}</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Stat label={t("importedCount")} value={result.inserted} />
            <Stat label={t("skippedCount")} value={result.skipped} />
          </div>
          <button
            onClick={() => {
              setPreview(null);
              setResult(null);
            }}
            className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted/50"
          >
            {t("startAnother")}
          </button>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">
        {value.toLocaleString(DEFAULT_LOCALE)}
      </p>
    </div>
  );
}

function FileDropZone({
  onFile,
  t,
}: {
  onFile: (file: File) => void;
  t: ReturnType<typeof useTranslations<"settings.repairImport.productImport">>;
}) {
  const [isDragging, setIsDragging] = useState(false);

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) onFile(file);
      }}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
        isDragging
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/30"
      }`}
    >
      <Upload className="mb-2 h-7 w-7 text-muted-foreground" />
      <span className="text-sm font-medium">{t("uploadLabel")}</span>
      <span className="mt-1 text-xs text-muted-foreground">
        {t("uploadHint")}
      </span>
      <input
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
        }}
      />
    </label>
  );
}
