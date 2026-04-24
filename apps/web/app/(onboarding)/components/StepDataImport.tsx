"use client";

import { useState, useCallback } from "react";
import { Database, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import {
  detectMappingProfile,
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
  seedSampleDataAction,
} from "@/app/actions/onboarding";
import { ImportProgress, type ImportStatus } from "./ImportProgress";
import { ImportChoiceScreen } from "./ImportChoiceScreen";
import { ImportCategoryList } from "./ImportCategoryList";

interface StepDataImportProps {
  onComplete: () => void;
}

export interface PendingImport {
  entityType: string;
  label: string;
  rawRows: Record<string, string>[];
  headers: string[];
  rawArrayRows: string[][];
  profile: MappingProfile | null;
  mappedRows: Array<Record<string, string | null>> | null;
  confirmed: boolean;
}

type ImportMode = "choice" | "import";

export function StepDataImport({ onComplete }: StepDataImportProps) {
  const t = useTranslations("onboarding");
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

  const handleSampleData = async () => {
    setIsCompleting(true);
    const result = await seedSampleDataAction();
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
          .filter((row) => Object.values(row).filter(Boolean).length >= 1);

        next.set(entityType, { ...pending, mappedRows, confirmed: true });
        return next;
      });
    },
    [],
  );

  const handleRunImport = async () => {
    setIsImporting(true);
    setError("");

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

    const initialStatuses: ImportStatus[] = toImport.map((imp) => ({
      entityType: imp.entityType,
      label: imp.label,
      state: "pending",
    }));
    setImportStatuses(initialStatuses);

    for (let i = 0; i < toImport.length; i++) {
      const imp = toImport[i];

      setImportStatuses((prev) =>
        prev.map((s, idx) => (idx === i ? { ...s, state: "importing" } : s)),
      );

      let structuredItems: Record<string, ParsedLineItem[]> | undefined;
      if (
        imp.entityType === "invoice" ||
        imp.entityType === "purchase_invoice"
      ) {
        const positionenIdx = imp.headers.indexOf("Positionen");
        const buchungsnummerIdx = imp.headers.indexOf("Buchungsnummer");
        if (positionenIdx !== -1 && buchungsnummerIdx !== -1) {
          structuredItems = {};
          for (let ri = 1; ri < imp.rawArrayRows.length; ri++) {
            const rawRow = imp.rawArrayRows[ri];
            const docNumber = rawRow[buchungsnummerIdx]?.trim();
            if (!docNumber) continue;
            const items = parseKivitendoLineItems(rawRow, positionenIdx);
            if (items.length > 0) structuredItems[docNumber] = items;
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

  if (mode === "choice") {
    return (
      <ImportChoiceScreen
        error={error}
        isCompleting={isCompleting}
        onImportData={() => setMode("import")}
        onStartFresh={handleStartFresh}
        onSampleData={handleSampleData}
      />
    );
  }

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

        {importStatuses.length > 0 && (
          <div className="mb-6">
            <ImportProgress statuses={importStatuses} />
          </div>
        )}

        {!isImporting && importStatuses.length === 0 && (
          <ImportCategoryList
            pendingImports={pendingImports}
            onCsvParsed={handleCsvParsed}
            onMappingConfirmed={handleMappingConfirmed}
          />
        )}

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
