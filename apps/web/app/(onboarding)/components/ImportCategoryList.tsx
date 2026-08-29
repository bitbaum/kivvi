"use client";

import { useTranslations } from "next-intl";
import type { MappingField } from "@kivvi/core/src/domain/import-mappings";
import { CsvUploader } from "./CsvUploader";
import { ColumnMapper } from "./ColumnMapper";
import { ImportPreview } from "./ImportPreview";
import type { PendingImport } from "./StepDataImport";

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

interface ImportCategoryListProps {
  pendingImports: Map<string, PendingImport>;
  onCsvParsed: (
    entityType: string,
    label: string,
    headers: string[],
    rows: Record<string, string>[],
    rawArrayRows: string[][],
  ) => void;
  onMappingConfirmed: (entityType: string, mapping: MappingField[]) => void;
}

export function ImportCategoryList({
  pendingImports,
  onCsvParsed,
  onMappingConfirmed,
}: ImportCategoryListProps) {
  const t = useTranslations("onboarding");
  const tc = useTranslations("common");

  return (
    <div className="space-y-6">
      {IMPORT_CATEGORY_DEFS.map((category) => (
        <div key={category.id} className="rounded-lg border p-4">
          <h3 className="mb-1 font-medium">{t(category.labelKey)}</h3>
          <p className="mb-3 text-xs text-muted-foreground">{t(category.descKey)}</p>

          <div className="space-y-4">
            {category.entityTypes.map((et) => {
              const pending = pendingImports.get(et.type);
              const etLabel = t(et.labelKey);

              return (
                <div key={et.type}>
                  <div className="mb-2 text-sm font-medium">{etLabel}</div>

                  {!pending && (
                    <CsvUploader
                      label={`${tc("upload")} ${etLabel} CSV`}
                      onParsed={(headers, rows, rawArrayRows) =>
                        onCsvParsed(et.type, etLabel, headers, rows, rawArrayRows)
                      }
                    />
                  )}

                  {pending && !pending.confirmed && pending.profile && (
                    <ColumnMapper
                      headers={pending.headers}
                      profile={pending.profile}
                      onMappingConfirmed={(mapping) => onMappingConfirmed(et.type, mapping)}
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
                      <ImportPreview rows={pending.mappedRows} maxRows={3} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
