import { FileText, Plus, Search } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { DocumentTypeConfig } from "@/lib/config/document-types";
import {
  getFilterStatuses,
  toCamelCase,
  INTAKE_SOURCE_LABEL_KEYS,
} from "@/lib/config/document-types";
import type { PaginatedResult } from "@kivvi/core";
import type { DocumentListItem } from "@kivvi/core/src/domain/documents";
import { documentStatusEnum } from "@kivvi/database";
import { SelectableDocumentTable } from "./selectable-document-table";
import { cn, paginationRange } from "@/lib/utils";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

interface DocumentListProps {
  config: DocumentTypeConfig;
  result: PaginatedResult<DocumentListItem>;
  search?: string;
  status?: string;
  headerActions?: React.ReactNode;
  /** Optional extra filter row rendered below the search + status filters */
  secondaryFilters?: React.ReactNode;
  /** Extra URL params to preserve in status pills, pagination, and search form */
  preserveParams?: Record<string, string>;
}

/** Build a query string, dropping empty/undefined values */
function qs(
  params: Record<string, string | number | undefined | null>,
): string {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(
      ([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`,
    );
  return parts.length ? `?${parts.join("&")}` : "";
}

export async function DocumentList({
  config,
  result,
  search,
  status,
  headerActions,
  secondaryFilters,
  preserveParams,
}: DocumentListProps) {
  const t = await getTranslations("documents");
  const ts = await getTranslations("status");
  const tc = await getTranslations("common");
  const tb = await getTranslations("bulkActions");
  const filterStatuses = getFilterStatuses(config.type);

  // Pre-resolve translations for the client component
  const allStatuses = documentStatusEnum.enumValues.map(toCamelCase);
  const statusLabels: Record<string, string> = {};
  for (const s of allStatuses) {
    statusLabels[s] = ts(s);
  }

  // Pre-resolve bulk action labels
  const bulkActionKeys = [
    "selected",
    "clearSelection",
    "convertToOrder",
    "convertToInvoice",
    "convertToDeliveryNote",
    "convertToCreditNote",
    "convertToPurchaseInvoice",
    "extendValidity",
    "markAsSent",
    "markDelivered",
    "confirm",
    "delete",
    "days",
    "confirmTitle",
    "confirmMessage",
    "cancel",
    "processing",
    "confirmAction",
    "successAll",
    "successPartial",
    "failedAll",
    "showErrors",
    "hideErrors",
  ];
  // Keys with ICU placeholders ({count}, {action}, etc.) must use
  // tb.raw() to avoid ICU parser errors — the client fills them via .replace()
  const rawKeys = new Set([
    "successAll",
    "successPartial",
    "failedAll",
    "confirmMessage",
  ]);
  const bulkLabels: Record<string, string> = {};
  for (const key of bulkActionKeys) {
    bulkLabels[key] = rawKeys.has(key) ? tb.raw(key) : tb(key);
  }

  const columnLabels = {
    number: tc("number"),
    contact: config.contactFilter === "vendor" ? t("vendor") : t("customer"),
    total: tc("total"),
    status: tc("status"),
    date: tc("date"),
    noContact:
      config.contactFilter === "vendor" ? t("noVendor") : t("noCustomer"),
  };

  const hasActiveFilter =
    !!(search || status) || Object.values(preserveParams ?? {}).some(Boolean);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t(config.labelPlural)}</h1>
          <p className="text-muted-foreground">
            {t("manageAndTrack", { type: t(config.labelPlural) })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {headerActions}
          {config.canCreate && (
            <Button asChild>
              <Link href={`${config.basePath}/new`}>
                <Plus className="h-4 w-4" />
                {t("newDocument", { type: t(config.label) })}
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <form className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="search"
            type="text"
            placeholder={t("searchDocuments", { type: t(config.labelPlural) })}
            defaultValue={search}
            className="w-full rounded-lg border bg-background py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
          {status && <input type="hidden" name="status" value={status} />}
          {preserveParams &&
            Object.entries(preserveParams).map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={v} />
            ))}
        </form>

        <div className="flex gap-2">
          {filterStatuses.map((s) => {
            const isActive = s === "all" ? !status : status === s;
            const href =
              s === "all"
                ? `${config.basePath}${qs({ search, ...preserveParams })}`
                : `${config.basePath}${qs({ status: s, search, ...preserveParams })}`;
            return (
              <Link
                key={s}
                href={href}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors min-h-[44px] inline-flex items-center",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
                )}
              >
                {s === "all" ? tc("all") : ts(toCamelCase(s))}
              </Link>
            );
          })}
        </div>
      </div>

      {secondaryFilters && <div>{secondaryFilters}</div>}

      {/* Table */}
      <div className="rounded-xl border bg-card">
        {result.data.length === 0 ? (
          <EmptyState
            icon={hasActiveFilter ? Search : FileText}
            title={t("noDocumentsFound", { type: t(config.labelPlural) })}
            description={
              hasActiveFilter
                ? t("adjustFilters")
                : t("createFirst", { type: t(config.label) })
            }
            actionLabel={
              !hasActiveFilter && config.canCreate
                ? t("newDocument", { type: t(config.label) })
                : undefined
            }
            actionHref={
              !hasActiveFilter && config.canCreate
                ? `${config.basePath}/new`
                : undefined
            }
          />
        ) : (
          <SelectableDocumentTable
            config={config}
            data={result.data.map((doc) => ({
              id: doc.id,
              number: doc.number,
              status: doc.status,
              total: doc.total,
              issueDate: doc.issueDate,
              dueDate: doc.dueDate,
              contact: doc.contact,
              tag: doc.intakeSource
                ? INTAKE_SOURCE_LABEL_KEYS[doc.intakeSource]
                  ? t(
                      INTAKE_SOURCE_LABEL_KEYS[doc.intakeSource] as Parameters<
                        typeof t
                      >[0],
                    )
                  : null
                : null,
            }))}
            translations={{ statusLabels, columnLabels, bulkLabels }}
          />
        )}
      </div>

      {/* Pagination — always show count when there are results; nav only when multi-page */}
      {result.data.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {tc(
              "showing",
              paginationRange(result.page, result.pageSize, result.total),
            )}
          </p>
          {result.totalPages > 1 && (
            <div className="flex gap-2">
              {result.page > 1 && (
                <Button asChild variant="secondary">
                  <Link
                    href={`${config.basePath}${qs({ page: result.page - 1, status, search, ...preserveParams })}`}
                  >
                    {tc("previous")}
                  </Link>
                </Button>
              )}
              {result.page < result.totalPages && (
                <Button asChild variant="secondary">
                  <Link
                    href={`${config.basePath}${qs({ page: result.page + 1, status, search, ...preserveParams })}`}
                  >
                    {tc("next")}
                  </Link>
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
