import Link from "next/link";
import { Search, BookOpen } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { formatDate, cn, paginationRange } from "@/lib/utils";
import { Pagination } from "@/components/pagination";
import { EmptyState } from "@/components/empty-state";
import { SOURCE_TYPE_STYLES, getSourceTypeLabels } from "@/lib/config/journal";
import type { listJournalEntries } from "@kivvi/core";

type JournalResult = Awaited<ReturnType<typeof listJournalEntries>>;

interface JournalEntriesTableProps {
  result: JournalResult;
  search?: string;
  sourceType?: string;
  dateFrom?: string;
  dateTo?: string;
}

export async function JournalEntriesTable({
  result,
  search,
  sourceType,
  dateFrom,
  dateTo,
}: JournalEntriesTableProps) {
  const t = await getTranslations("accounting");
  const tc = await getTranslations("common");

  const SOURCE_TYPE_LABELS = getSourceTypeLabels(t);

  function buildPageUrl(page: number): string {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (sourceType) params.set("sourceType", sourceType);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (page > 1) params.set("page", page.toString());
    return `/accounting/journal${params.toString() ? `?${params.toString()}` : ""}`;
  }

  return (
    <div className="rounded-xl border bg-card">
      {result.data.length === 0 ? (
        <EmptyState
          icon={search || sourceType || dateFrom || dateTo ? Search : BookOpen}
          title={t("noJournalEntries")}
          description={
            search || sourceType || dateFrom || dateTo ? tc("noResults") : t("viewJournalEntries")
          }
          actionLabel={
            !search && !sourceType && !dateFrom && !dateTo ? t("newJournalEntry") : undefined
          }
          actionHref={
            !search && !sourceType && !dateFrom && !dateTo ? "/accounting/journal/new" : undefined
          }
        />
      ) : (
        <>
          {/* Table header */}
          <div className="hidden border-b px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground sm:grid sm:grid-cols-[auto_1fr_2fr_auto_auto]">
            <span className="w-24">{tc("date")}</span>
            <span>{t("reference")}</span>
            <span>{tc("description")}</span>
            <span className="px-4 text-center">{t("sourceType")}</span>
            <span className="w-28 text-right">{tc("total")}</span>
          </div>

          {/* Rows */}
          <div className="divide-y">
            {result.data.map((entry) => (
              <Link
                key={entry.id}
                href={`/accounting/journal/${entry.id}`}
                className="flex flex-col gap-1 p-4 hover:bg-muted/50 transition-colors sm:grid sm:grid-cols-[auto_1fr_2fr_auto_auto] sm:items-center sm:gap-4"
              >
                <div className="w-24 text-sm text-muted-foreground">{formatDate(entry.date)}</div>
                <div className="text-sm font-medium font-mono">{entry.reference || "-"}</div>
                <div className="text-sm text-muted-foreground truncate">{entry.description}</div>
                <div className="px-4 text-center">
                  <span
                    className={cn(
                      "inline-block rounded-full px-2.5 py-0.5 text-xs font-medium",
                      SOURCE_TYPE_STYLES[entry.sourceType ?? "manual"] || SOURCE_TYPE_STYLES.manual,
                    )}
                  >
                    {SOURCE_TYPE_LABELS[entry.sourceType ?? "manual"] || entry.sourceType}
                  </span>
                </div>
                <div className="w-28 text-right text-sm font-medium">-</div>
              </Link>
            ))}
          </div>

          <Pagination
            page={result.page}
            totalPages={result.totalPages}
            buildHref={buildPageUrl}
            labels={{
              showing: tc("showing", paginationRange(result.page, result.pageSize, result.total)),
              previous: tc("previous"),
              next: tc("next"),
              pageOf: tc("pageOf", {
                page: result.page,
                totalPages: result.totalPages,
              }),
            }}
          />
        </>
      )}
    </div>
  );
}
