"use client";

import { useState, useCallback, useMemo } from "react";
import {
  Loader2,
  Upload,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  MapPin,
  PackageSearch,
} from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";
import { useTranslations } from "next-intl";
import {
  analyzeInventoryImportRows,
  type RawImportRow,
  type AnalyzedImportRow,
  type WarehouseOption,
} from "@kivvi/core/src/domain/inventory-import";
import { importInventoryItemsAction } from "@/app/actions/inventory-items";
import { CsvDropZone } from "@/components/import/csv-drop-zone";

interface Props {
  warehouses: WarehouseOption[];
}

/** Source header → RawImportRow field. Lowercased, punctuation-insensitive. */
const HEADER_ALIASES: Record<keyof RawImportRow, string[]> = {
  description: [
    "description",
    "beschreibung",
    "name",
    "titel",
    "title",
    "bezeichnung",
    "artikel",
  ],
  category: ["category", "kategorie", "warengruppe", "group"],
  condition: ["condition", "zustand", "grade"],
  serialNumber: ["serial", "serialnumber", "seriennummer", "sn", "seriennr"],
  askingPrice: ["price", "preis", "askingprice", "verkaufspreis", "vk"],
  estimatedValue: ["value", "wert", "estimatedvalue", "einkaufspreis"],
  warehouse: ["warehouse", "lager", "standort", "storage"],
  location: ["location", "lagerplatz", "shelf", "bin", "regal", "platz"],
  externalRef: [
    "externalref",
    "articlenumber",
    "artikelnummer",
    "sku",
    "id",
    "shopwareid",
  ],
  notes: ["notes", "bemerkung", "notiz", "comment", "kommentar"],
};

function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .replace(/\uFEFF/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function buildHeaderMap(
  headers: string[],
): Partial<Record<string, keyof RawImportRow>> {
  const map: Partial<Record<string, keyof RawImportRow>> = {};
  for (const header of headers) {
    const norm = normalizeHeader(header);
    for (const [field, aliases] of Object.entries(HEADER_ALIASES) as [
      keyof RawImportRow,
      string[],
    ][]) {
      if (aliases.includes(norm)) {
        map[header] = field;
        break;
      }
    }
  }
  return map;
}

interface RowState {
  warehouseId: string | null;
  presenceConfirmed: boolean;
}

export function InventoryImportPanel({ warehouses }: Props) {
  const t = useTranslations("inventoryImport");
  const [fileName, setFileName] = useState<string | null>(null);
  const [rawRows, setRawRows] = useState<RawImportRow[] | null>(null);
  const [rowState, setRowState] = useState<Record<number, RowState>>({});
  const [defaultWarehouseId, setDefaultWarehouseId] = useState<string>(
    warehouses.find((w) => w.isDefault)?.id ?? warehouses[0]?.id ?? "",
  );
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<{
    inserted: number;
    skippedDuplicates: number;
    skippedInvalid: number;
  } | null>(null);

  // Re-run the pure analysis whenever the file or the default warehouse changes.
  const analysis = useMemo(() => {
    if (!rawRows) return null;
    return analyzeInventoryImportRows(rawRows, {
      warehouses,
      fallbackWarehouseId: defaultWarehouseId || null,
    });
  }, [rawRows, warehouses, defaultWarehouseId]);

  const handleFile = useCallback(
    (file: File) => {
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        encoding: "UTF-8",
        transformHeader: (h) => h.replace(/\uFEFF/g, "").trim(),
        complete: (results) => {
          const data = results.data;
          if (!data.length) {
            toast.error(t("csvEmpty"));
            return;
          }
          const headers = results.meta.fields ?? Object.keys(data[0]);
          const headerMap = buildHeaderMap(headers);

          const mapped: RawImportRow[] = data.map((row) => {
            const out: RawImportRow = {};
            for (const [header, field] of Object.entries(headerMap)) {
              if (field) out[field] = row[header] ?? null;
            }
            return out;
          });

          setFileName(file.name);
          setRawRows(mapped);
          setRowState({});
          setResult(null);
        },
        error: (err) =>
          toast.error(t("csvParseError", { message: err.message })),
      });
    },
    [t],
  );

  function effectiveWarehouseId(row: AnalyzedImportRow): string | null {
    const override = rowState[row.index]?.warehouseId;
    if (override !== undefined) return override;
    return row.resolvedWarehouseId;
  }

  function isPresent(row: AnalyzedImportRow): boolean {
    return rowState[row.index]?.presenceConfirmed ?? false;
  }

  /** A row can be imported when: has description, has a warehouse, is confirmed
   *  present, and isn't a known-existing duplicate. */
  function isImportable(row: AnalyzedImportRow): boolean {
    const hasDescription = !row.issues.some(
      (i) => i.code === "MISSING_DESCRIPTION",
    );
    const isExistingDup = row.issues.some(
      (i) => i.code === "DUPLICATE_SERIAL_EXISTING",
    );
    return (
      hasDescription &&
      !isExistingDup &&
      !!effectiveWarehouseId(row) &&
      isPresent(row)
    );
  }

  const importableCount = useMemo(() => {
    if (!analysis) return 0;
    return analysis.rows.filter(isImportable).length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis, rowState]);

  function setRow(index: number, patch: Partial<RowState>) {
    setRowState((prev) => ({
      ...prev,
      [index]: {
        warehouseId: prev[index]?.warehouseId ?? null,
        presenceConfirmed: prev[index]?.presenceConfirmed ?? false,
        ...patch,
      },
    }));
  }

  function assignAllWarehouse(warehouseId: string) {
    if (!analysis) return;
    setRowState((prev) => {
      const next = { ...prev };
      for (const row of analysis.rows) {
        next[row.index] = {
          warehouseId,
          presenceConfirmed: next[row.index]?.presenceConfirmed ?? false,
        };
      }
      return next;
    });
  }

  function confirmAllPresent() {
    if (!analysis) return;
    setRowState((prev) => {
      const next = { ...prev };
      for (const row of analysis.rows) {
        next[row.index] = {
          warehouseId:
            next[row.index]?.warehouseId ?? row.resolvedWarehouseId ?? null,
          presenceConfirmed: true,
        };
      }
      return next;
    });
  }

  async function handleImport() {
    if (!analysis) return;

    const payload = analysis.rows.filter(isImportable).map((row) => ({
      description: row.normalized.description,
      warehouseId: effectiveWarehouseId(row),
      category: row.normalized.category,
      condition: row.normalized.condition,
      serialNumber: row.normalized.serialNumber,
      askingPrice: row.normalized.askingPrice,
      estimatedValue: row.normalized.estimatedValue,
      location: row.normalized.location,
      notes: row.normalized.notes,
      presenceConfirmed: true as const,
    }));

    if (payload.length === 0) {
      toast.error(t("nothingToImport"));
      return;
    }

    setIsImporting(true);
    const res = await importInventoryItemsAction(payload);
    setIsImporting(false);

    if (res.success && res.data) {
      setResult(res.data);
      toast.success(t("importSuccess", { count: res.data.inserted }));
    } else {
      toast.error(res.error || t("importFailed"));
    }
  }

  function reset() {
    setFileName(null);
    setRawRows(null);
    setRowState({});
    setResult(null);
  }

  // ── No warehouses: can't place items anywhere ──────────────────────────────
  if (warehouses.length === 0) {
    return (
      <div className="rounded-xl border border-warning/30 bg-warning/5 p-6">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-warning" />
          <p className="text-sm font-medium">{t("noWarehouses")}</p>
        </div>
      </div>
    );
  }

  // ── Result screen ──────────────────────────────────────────────────────────
  if (result) {
    return (
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-success" />
          <span className="font-medium">{t("resultTitle")}</span>
        </div>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <Stat
            label={t("insertedCount")}
            value={result.inserted}
            tone="success"
          />
          <Stat
            label={t("skippedDuplicates")}
            value={result.skippedDuplicates}
            tone="warning"
          />
          <Stat
            label={t("skippedInvalid")}
            value={result.skippedInvalid}
            tone="muted"
          />
        </div>
        <button
          onClick={reset}
          className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted/50"
        >
          {t("importAnother")}
        </button>
      </div>
    );
  }

  // ── Upload screen ──────────────────────────────────────────────────────────
  if (!analysis) {
    return (
      <CsvDropZone
        onFile={handleFile}
        label={t("uploadLabel")}
        hint={t("uploadHint")}
      />
    );
  }

  // ── Review screen ──────────────────────────────────────────────────────────
  const { summary } = analysis;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm">
          <Upload className="h-4 w-4 text-primary" />
          <span className="font-medium">{fileName}</span>
          <span className="text-muted-foreground">
            · {t("rowCount", { count: summary.total })}
          </span>
        </div>

        {/* Smart summary — answers "do we have them / info / where?" */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 text-sm">
          <Stat
            label={t("summaryReady")}
            value={summary.ready}
            tone="success"
          />
          <Stat
            label={t("summaryReview")}
            value={summary.review}
            tone="warning"
          />
          <Stat
            label={t("summaryBlocked")}
            value={summary.blocked}
            tone="destructive"
          />
          <Stat
            label={t("summaryMissingLocation")}
            value={summary.missingLocation}
            tone="muted"
          />
          <Stat
            label={t("summaryDuplicates")}
            value={summary.duplicates}
            tone="muted"
          />
        </div>

        {/* Bulk controls */}
        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {t("defaultWarehouse")}
            </span>
            <select
              value={defaultWarehouseId}
              onChange={(e) => {
                setDefaultWarehouseId(e.target.value);
                assignAllWarehouse(e.target.value);
              }}
              className="rounded-lg border bg-background px-3 py-1.5 text-sm"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={confirmAllPresent}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted/50"
          >
            <PackageSearch className="h-4 w-4" />
            {t("confirmAllPresent")}
          </button>
        </div>
      </div>

      {/* Review table */}
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              <th className="px-3 py-2 font-medium">{t("colStatus")}</th>
              <th className="px-3 py-2 font-medium">{t("colItem")}</th>
              <th className="px-3 py-2 font-medium">{t("colWarehouse")}</th>
              <th className="px-3 py-2 font-medium">{t("colCondition")}</th>
              <th className="px-3 py-2 text-right font-medium">
                {t("colPrice")}
              </th>
              <th className="px-3 py-2 font-medium">{t("colComplete")}</th>
              <th className="px-3 py-2 text-center font-medium">
                {t("colPresent")}
              </th>
            </tr>
          </thead>
          <tbody>
            {analysis.rows.map((row) => {
              const whId = effectiveWarehouseId(row);
              const present = isPresent(row);
              const importable = isImportable(row);
              return (
                <tr
                  key={row.index}
                  className="border-b last:border-0 align-top"
                >
                  <td className="px-3 py-2">
                    <DecisionBadge row={row} importable={importable} t={t} />
                  </td>
                  <td className="px-3 py-2">
                    <div className="max-w-[260px]">
                      <p className="font-medium truncate">
                        {row.normalized.description || (
                          <span className="text-destructive">
                            {t("noDescription")}
                          </span>
                        )}
                      </p>
                      {row.normalized.serialNumber && (
                        <p className="text-xs text-muted-foreground font-mono">
                          {row.normalized.serialNumber}
                        </p>
                      )}
                      <IssueList row={row} />
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={whId ?? ""}
                      onChange={(e) =>
                        setRow(row.index, {
                          warehouseId: e.target.value || null,
                        })
                      }
                      className={`rounded-lg border bg-background px-2 py-1 text-xs ${
                        whId ? "" : "border-destructive text-destructive"
                      }`}
                    >
                      <option value="">{t("selectWarehouse")}</option>
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                    {row.normalized.location && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {row.normalized.location}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {row.normalized.condition}
                  </td>
                  <td className="px-3 py-2 text-right text-xs">
                    {row.normalized.askingPrice
                      ? `CHF ${row.normalized.askingPrice}`
                      : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <CompletenessBar score={row.completeness.score} />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={present}
                      onChange={(e) =>
                        setRow(row.index, {
                          presenceConfirmed: e.target.checked,
                        })
                      }
                      className="h-4 w-4 rounded border-input accent-primary"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">{t("reviewHint")}</p>

      <div className="flex gap-3">
        <button
          onClick={handleImport}
          disabled={isImporting || importableCount === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isImporting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isImporting
            ? t("importing")
            : t("importN", { count: importableCount })}
        </button>
        <button
          onClick={reset}
          disabled={isImporting}
          className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted/50 disabled:opacity-50"
        >
          {t("cancel")}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function DecisionBadge({
  row,
  importable,
  t,
}: {
  row: AnalyzedImportRow;
  importable: boolean;
  t: ReturnType<typeof useTranslations<"inventoryImport">>;
}) {
  if (importable) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
        <CheckCircle2 className="h-3 w-3" />
        {t("decisionReady")}
      </span>
    );
  }
  if (row.decision === "blocked") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
        <XCircle className="h-3 w-3" />
        {t("decisionBlocked")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
      <AlertTriangle className="h-3 w-3" />
      {t("decisionReview")}
    </span>
  );
}

function IssueList({ row }: { row: AnalyzedImportRow }) {
  const shown = row.issues.filter((i) => i.code !== "PRESENCE_UNCONFIRMED");
  if (shown.length === 0) return null;
  return (
    <ul className="mt-1 space-y-0.5">
      {shown.map((issue, i) => (
        <li
          key={i}
          className={`text-xs ${
            issue.severity === "error"
              ? "text-destructive"
              : issue.severity === "warning"
                ? "text-warning"
                : "text-muted-foreground"
          }`}
        >
          {issue.message}
        </li>
      ))}
    </ul>
  );
}

function CompletenessBar({ score }: { score: number }) {
  const tone =
    score >= 80 ? "bg-success" : score >= 50 ? "bg-warning" : "bg-destructive";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${tone}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs text-muted-foreground">{score}%</span>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "success" | "warning" | "destructive" | "muted";
}) {
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning"
        : tone === "destructive"
          ? "text-destructive"
          : "text-foreground";
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}
