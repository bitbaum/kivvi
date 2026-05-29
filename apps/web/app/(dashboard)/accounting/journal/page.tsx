import Link from "next/link";
import { Plus, Search, Download } from "lucide-react";
import { getSessionOrRedirect } from "@/lib/session";
import { db } from "@/lib/db";
import { listJournalEntries } from "@kivvi/core";
import { cn } from "@/lib/utils";
import { getTranslations } from "next-intl/server";
import { DEFAULT_PAGE_SIZE } from "@/lib/config/document-types";
import { SOURCE_TYPE_STYLES, getSourceTypeLabels } from "@/lib/config/journal";
import { PageHeader } from "@/components/page-header";
import { JournalEntriesTable } from "./journal-entries-table";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    sourceType?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: string;
  }>;
}

export default async function JournalPage({ searchParams }: PageProps) {
  const session = await getSessionOrRedirect();
  const t = await getTranslations("accounting");
  const tc = await getTranslations("common");

  const SOURCE_TYPE_LABELS = getSourceTypeLabels(t);

  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const sourceType = params.sourceType;
  const search = params.search;
  const dateFrom = params.dateFrom;
  const dateTo = params.dateTo;

  const result = await listJournalEntries(db, session.user.companyId, {
    search: search || undefined,
    sourceType: sourceType || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("journal")}
        subtitle={t("viewJournalEntries")}
        actions={
          <>
            <a
              href="/api/export/journal"
              className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
            >
              <Download className="h-4 w-4" />
              {tc("exportCsv")}
            </a>
            <Link
              href="/accounting/journal/new"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              {t("newJournalEntry")}
            </Link>
          </>
        }
      />

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* Search */}
        <form
          className="relative flex-1 sm:max-w-sm"
          action="/accounting/journal"
          method="GET"
        >
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            name="search"
            placeholder={tc("search") + "..."}
            defaultValue={search}
            className="w-full rounded-lg border bg-background py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {sourceType && (
            <input type="hidden" name="sourceType" value={sourceType} />
          )}
          {dateFrom && <input type="hidden" name="dateFrom" value={dateFrom} />}
          {dateTo && <input type="hidden" name="dateTo" value={dateTo} />}
        </form>

        {/* Source type filter */}
        <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
          <SourceTypeFilterLink
            label={tc("all")}
            value=""
            current={sourceType}
            search={search}
            dateFrom={dateFrom}
            dateTo={dateTo}
          />
          <SourceTypeFilterLink
            label={SOURCE_TYPE_LABELS.manual}
            value="manual"
            current={sourceType}
            search={search}
            dateFrom={dateFrom}
            dateTo={dateTo}
          />
          <SourceTypeFilterLink
            label={SOURCE_TYPE_LABELS.invoice}
            value="invoice"
            current={sourceType}
            search={search}
            dateFrom={dateFrom}
            dateTo={dateTo}
          />
          <SourceTypeFilterLink
            label={SOURCE_TYPE_LABELS.payment}
            value="payment"
            current={sourceType}
            search={search}
            dateFrom={dateFrom}
            dateTo={dateTo}
          />
        </div>
      </div>

      {/* Date range filter */}
      <form
        className="flex flex-wrap items-end gap-3"
        action="/accounting/journal"
        method="GET"
      >
        {search && <input type="hidden" name="search" value={search} />}
        {sourceType && (
          <input type="hidden" name="sourceType" value={sourceType} />
        )}
        <div>
          <label
            htmlFor="journal-dateFrom"
            className="block text-sm text-muted-foreground mb-1"
          >
            {tc("from")}
          </label>
          <input
            id="journal-dateFrom"
            type="date"
            name="dateFrom"
            defaultValue={dateFrom}
            className="rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label
            htmlFor="journal-dateTo"
            className="block text-sm text-muted-foreground mb-1"
          >
            {tc("to")}
          </label>
          <input
            id="journal-dateTo"
            type="date"
            name="dateTo"
            defaultValue={dateTo}
            className="rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
        >
          {tc("filter")}
        </button>
        {(dateFrom || dateTo) && (
          <Link
            href={buildFilterUrl({ search, sourceType })}
            className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {tc("clear")}
          </Link>
        )}
      </form>

      <JournalEntriesTable
        result={result}
        search={search}
        sourceType={sourceType}
        dateFrom={dateFrom}
        dateTo={dateTo}
      />
    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS & FUNCTIONS
// ============================================================================

function SourceTypeFilterLink({
  label,
  value,
  current,
  search,
  dateFrom,
  dateTo,
}: {
  label: string;
  value: string;
  current?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const isActive = (current || "") === value;
  const href = buildFilterUrl({
    search,
    sourceType: value || undefined,
    dateFrom,
    dateTo,
  });

  return (
    <Link
      href={href}
      className={cn(
        "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        isActive
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );
}

function buildFilterUrl(filters: {
  search?: string;
  sourceType?: string;
  dateFrom?: string;
  dateTo?: string;
}): string {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.sourceType) params.set("sourceType", filters.sourceType);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  return `/accounting/journal${params.toString() ? `?${params.toString()}` : ""}`;
}
