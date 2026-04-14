"use client";

import { useState, useCallback } from "react";
import { Database, Rocket, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import {
  detectMappingProfile,
  applyMapping,
  applyTransform,
  isSubtotalRow,
  parseKivitendoLineItems,
} from "@kivvi/core/src/domain/import-mappings";
import type {
  MappingProfile,
  MappingField,
  ParsedLineItem,
} from "@kivvi/core/src/domain/import-mappings";
import {
  executeImportAction,
  completeOnboardingAction,
} from "@/app/actions/onboarding";
import { CsvUploader } from "./CsvUploader";
import { ColumnMapper } from "./ColumnMapper";
import { ImportPreview } from "./ImportPreview";
import { ImportProgress, type ImportStatus } from "./ImportProgress";

interface StepDataImportProps {
  onComplete: () => void;
}

// Entity import categories — labels use translation keys resolved at render time
const IMPORT_CATEGORY_DEFS = [
  {
    id: "contacts",
    labelKey: "categories.contacts",
    descKey: "categories.contactsDesc",
    entityTypes: [
      { type: "customer", labelKey: "categories.customers" },
      { type: "vendor", labelKey: "categories.vendors" },
    ],
  },
  {
    id: "products",
    labelKey: "categories.products",
    descKey: "categories.productsDesc",
    entityTypes: [{ type: "product", labelKey: "categories.products" }],
  },
  {
    id: "documents",
    labelKey: "categories.documents",
    descKey: "categories.documentsDesc",
    entityTypes: [
      { type: "quote", labelKey: "categories.quotes" },
      { type: "order", labelKey: "categories.salesOrders" },
      { type: "invoice", labelKey: "categories.salesInvoices" },
      { type: "delivery_note", labelKey: "categories.deliveryNotes" },
      { type: "purchase_invoice", labelKey: "categories.purchaseInvoices" },
    ],
  },
  {
    id: "accounting",
    labelKey: "categories.accounting",
    descKey: "categories.accountingDesc",
    entityTypes: [
      { type: "journal_entry", labelKey: "categories.journalEntries" },
      { type: "stock", labelKey: "categories.stockLevels" },
    ],
  },
] as const;

type ImportMode = "choice" | "import";

interface PendingImport {
  entityType: string;
  label: string;
  rawRows: Record<string, string>[];
  headers: string[];
  rawArrayRows: string[][];
  profile: MappingProfile | null;
  mappedRows: Array<Record<string, string | null>> | null;
  confirmed: boolean;
}

export function StepDataImport({ onComplete }: StepDataImportProps) {
  const t = useTranslations("onboarding");
  const tc = useTranslations("common");
  const [mode, setMode] = useState<ImportMode>("choice");
  const [pendingImports, setPendingImports] = useState<
    Map<string, PendingImport>
  >(new Map());
  const [importStatuses, setImportStatuses] = useState<ImportStatus[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [error, setError] = useState("");

  const handleStartFresh = async () => {
    setIsCompleting(true);
    const result = await completeOnboardingAction();
    if (result.success) {
      onComplete();
    } else {
      setError(result.error || "Failed");
      setIsCompleting(false);
    }
  };

  const handleCsvParsed = useCallback(
    (
      entityType: string,
      label: string,
      headers: string[],
      rows: Record<string, string>[],
      rawArrayRows: string[][],
    ) => {
      const profile = detectMappingProfile(headers, entityType);

      setPendingImports((prev) => {
        const next = new Map(prev);
        next.set(entityType, {
          entityType,
          label,
          rawRows: rows,
          headers,
          rawArrayRows,
          profile,
          mappedRows: null,
          confirmed: false,
        });
        return next;
      });
    },
    [],
  );

  const handleMappingConfirmed = useCallback(
    (entityType: string, mapping: MappingField[]) => {
      setPendingImports((prev) => {
        const next = new Map(prev);
        const pending = next.get(entityType);
        if (!pending) return prev;

        // Apply mapping to all rows, filter out subtotal rows
        const keyColumn = pending.headers[0] || "";
        const mappedRows = pending.rawRows
          .filter((row) => !isSubtotalRow(row, keyColumn))
          .map((row) => {
            const result: Record<string, string | null> = {};
            for (const field of mapping) {
              const rawValue = row[field.source] ?? "";
              result[field.target] = applyTransform(rawValue, field.transform);
            }
            return result;
          })
          .filter((row) => {
            // Filter rows with no meaningful data
            const values = Object.values(row).filter(Boolean);
            return values.length >= 1;
          });

        next.set(entityType, {
          ...pending,
          mappedRows,
          confirmed: true,
        });
        return next;
      });
    },
    [],
  );

  const handleRunImport = async () => {
    setIsImporting(true);
    setError("");

    // Build import order: contacts → products → documents → accounting
    const importOrder = [
      "customer",
      "vendor",
      "product",
      "quote",
      "order",
      "invoice",
      "delivery_note",
      "purchase_invoice",
      "journal_entry",
      "stock",
    ];
    const toImport = importOrder
      .filter(
        (type) =>
          pendingImports.has(type) && pendingImports.get(type)!.confirmed,
      )
      .map((type) => pendingImports.get(type)!);

    // Initialize statuses
    const initialStatuses: ImportStatus[] = toImport.map((imp) => ({
      entityType: imp.entityType,
      label: imp.label,
      state: "pending",
    }));
    setImportStatuses(initialStatuses);

    // Execute sequentially
    for (let i = 0; i < toImport.length; i++) {
      const imp = toImport[i];

      setImportStatuses((prev) =>
        prev.map((s, idx) => (idx === i ? { ...s, state: "importing" } : s)),
      );

      // For document types, extract structured line items from raw CSV arrays
      let structuredItems: Record<string, ParsedLineItem[]> | undefined;
      if (
        imp.entityType === "invoice" ||
        imp.entityType === "purchase_invoice"
      ) {
        const positionenIdx = imp.headers.indexOf("Positionen");
        const buchungsnummerIdx = imp.headers.indexOf("Buchungsnummer");

        if (positionenIdx !== -1 && buchungsnummerIdx !== -1) {
          structuredItems = {};
          // Skip header row (index 0) in rawArrayRows
          for (let ri = 1; ri < imp.rawArrayRows.length; ri++) {
            const rawRow = imp.rawArrayRows[ri];
            const docNumber = rawRow[buchungsnummerIdx]?.trim();
            if (!docNumber) continue;

            const items = parseKivitendoLineItems(rawRow, positionenIdx);
            if (items.length > 0) {
              structuredItems[docNumber] = items;
            }
          }
        }
      }

      const result = await executeImportAction(
        imp.entityType,
        imp.mappedRows!,
        structuredItems,
      );

      setImportStatuses((prev) =>
        prev.map((s, idx) =>
          idx === i
            ? {
                ...s,
                state: result.success ? "done" : "error",
                inserted: result.data?.inserted,
                skipped: result.data?.skipped,
                errors: result.success
                  ? result.data?.errors
                  : [result.error || "Failed"],
              }
            : s,
        ),
      );
    }

    setIsImporting(false);
  };

  const handleCompleteSetup = async () => {
    setIsCompleting(true);
    const result = await completeOnboardingAction();
    if (result.success) {
      onComplete();
    } else {
      setError(result.error || "Failed");
      setIsCompleting(false);
    }
  };

  const confirmedCount = Array.from(pendingImports.values()).filter(
    (p) => p.confirmed,
  ).length;
  const allImportsDone =
    importStatuses.length > 0 &&
    importStatuses.every((s) => s.state === "done" || s.state === "error");

  // Choice screen
  if (mode === "choice") {
    return (
      <div className="rounded-xl border bg-background p-6 shadow-sm md:p-8">
        <div className="mb-6">
          <div className="mb-2 flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">{t("dataImport")}</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("importDataQuestion")}
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <button
            onClick={() => setMode("import")}
            className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors hover:border-primary hover:bg-primary/5"
          >
            <Upload className="h-10 w-10 text-muted-foreground" />
            <div>
              <div className="font-semibold">{t("importData")}</div>
              <div className="mt-1 text-sm text-muted-foreground">
                {t("importDataDesc")}
              </div>
            </div>
          </button>

          <button
            onClick={handleStartFresh}
            disabled={isCompleting}
            className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors hover:border-primary hover:bg-primary/5 disabled:opacity-50"
          >
            {isCompleting ? (
              <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
            ) : (
              <Rocket className="h-10 w-10 text-muted-foreground" />
            )}
            <div>
              <div className="font-semibold">{t("startFresh")}</div>
              <div className="mt-1 text-sm text-muted-foreground">
                {t("startFreshDesc")}
              </div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // Import interface
  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-background p-6 shadow-sm md:p-8">
        <div className="mb-6">
          <div className="mb-2 flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">{t("importData")}</h2>
          </div>
          <p className="text-sm text-muted-foreground">{t("importOrder")}</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Import progress (when running) */}
        {importStatuses.length > 0 && (
          <div className="mb-6">
            <ImportProgress statuses={importStatuses} />
          </div>
        )}

        {/* Upload sections (when not running) */}
        {!isImporting && importStatuses.length === 0 && (
          <div className="space-y-6">
            {IMPORT_CATEGORY_DEFS.map((category) => (
              <div key={category.id} className="rounded-lg border p-4">
                <h3 className="mb-1 font-medium">{t(category.labelKey)}</h3>
                <p className="mb-3 text-xs text-muted-foreground">
                  {t(category.descKey)}
                </p>

                <div className="space-y-4">
                  {category.entityTypes.map((et) => {
                    const pending = pendingImports.get(et.type);
                    const etLabel = t(et.labelKey);

                    return (
                      <div key={et.type}>
                        <div className="mb-2 text-sm font-medium">
                          {etLabel}
                        </div>

                        {!pending && (
                          <CsvUploader
                            label={`${tc("upload")} ${etLabel} CSV`}
                            onParsed={(headers, rows, rawArrayRows) =>
                              handleCsvParsed(
                                et.type,
                                etLabel,
                                headers,
                                rows,
                                rawArrayRows,
                              )
                            }
                          />
                        )}

                        {pending && !pending.confirmed && pending.profile && (
                          <ColumnMapper
                            headers={pending.headers}
                            profile={pending.profile}
                            onMappingConfirmed={(mapping) =>
                              handleMappingConfirmed(et.type, mapping)
                            }
                          />
                        )}

                        {pending && !pending.confirmed && !pending.profile && (
                          <div className="rounded-lg bg-warning/5 p-3 text-sm text-warning">
                            {t("noAutoDetect")}
                          </div>
                        )}

                        {pending?.confirmed && pending.mappedRows && (
                          <div>
                            <div className="mb-2 flex items-center gap-2 text-sm text-success">
                              <span className="inline-block h-2 w-2 rounded-full bg-success/50" />
                              {t("readyToImport", {
                                count: pending.mappedRows.length,
                              })}
                            </div>
                            <ImportPreview
                              rows={pending.mappedRows}
                              maxRows={3}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-6 flex items-center justify-between">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setMode("choice");
              setPendingImports(new Map());
              setImportStatuses([]);
            }}
            disabled={isImporting}
          >
            {t("back")}
          </Button>

          <div className="flex gap-3">
            {!allImportsDone &&
              importStatuses.length === 0 &&
              confirmedCount > 0 && (
                <Button onClick={handleRunImport} disabled={isImporting}>
                  {isImporting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t("importFiles", { count: confirmedCount })}
                </Button>
              )}

            {allImportsDone && (
              <Button onClick={handleCompleteSetup} disabled={isCompleting}>
                {isCompleting && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("completeSetup")}
              </Button>
            )}

            {!allImportsDone &&
              importStatuses.length === 0 &&
              confirmedCount === 0 && (
                <Button
                  variant="secondary"
                  onClick={handleCompleteSetup}
                  disabled={isCompleting}
                >
                  {isCompleting ? t("completing") : t("skipAndFinish")}
                </Button>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
