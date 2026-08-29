import Link from "next/link";
import { Plus } from "lucide-react";
import { getSessionOrRedirect } from "@/lib/session";
import { db } from "@/lib/db";
import { listDocuments, getDocumentSummary } from "@kivvi/core";
import {
  DOCUMENT_TYPES,
  DEFAULT_PAGE_SIZE,
  toCamelCase,
  COMMON_FILTER_STATUSES,
} from "@/lib/config/document-types";
import { formatCurrency, cn, paginationRange } from "@/lib/utils";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/search-input";
import { DateRangeFilter } from "@/components/date-range-filter";
import { Pagination } from "@/components/pagination";
import { PageHeader } from "@/components/page-header";
import { DocumentListTable } from "./document-list-table";
import type { DocumentType, DocumentStatus } from "@kivvi/database";

const OUTGOING_TYPES: DocumentType[] = [
  "quote",
  "order",
  "order_confirmation",
  "invoice",
  "delivery_note",
  "credit_note",
  "dunning",
];
const INCOMING_TYPES: DocumentType[] = ["purchase_order", "purchase_invoice"];
const ALL_TYPES = [...OUTGOING_TYPES, ...INCOMING_TYPES];

interface PageProps {
  searchParams: Promise<{
    type?: string;
    status?: string;
    search?: string;
    contactId?: string;
    page?: string;
    sort?: string;
    order?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}

export default async function DocumentsPage({ searchParams }: PageProps) {
  const session = await getSessionOrRedirect();
  const params = await searchParams;
  const t = await getTranslations("documentsHub");
  const td = await getTranslations("documents");
  const ts = await getTranslations("status");
  const tc = await getTranslations("common");

  const selectedType = params.type as DocumentType | undefined;
  const status = params.status as DocumentStatus | undefined;
  const search = params.search;
  const contactId = params.contactId;
  const dateFrom = params.dateFrom;
  const dateTo = params.dateTo;
  const page = parseInt(params.page || "1", 10);
  const sort = (params.sort || "issueDate") as
    | "number"
    | "issueDate"
    | "dueDate"
    | "total"
    | "createdAt";
  const order = (params.order || "desc") as "asc" | "desc";

  const result = await listDocuments(db, session.user.companyId, {
    type: selectedType,
    status,
    search,
    contactId,
    dateFrom,
    dateTo,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
    sortBy: sort,
    sortOrder: order,
  });

  const { totalCount, openAmount, overdueCount } = await getDocumentSummary(
    db,
    session.user.companyId,
    selectedType,
  );

  function buildHref(overrides: Record<string, string | undefined>) {
    const p = new URLSearchParams();
    const merged = {
      type: selectedType,
      status,
      search,
      contactId,
      dateFrom,
      dateTo,
      sort: sort !== "issueDate" ? sort : undefined,
      order: order !== "desc" ? order : undefined,
      ...overrides,
    };
    for (const [k, v] of Object.entries(merged)) {
      if (v) p.set(k, v);
    }
    const qs = p.toString();
    return `/documents${qs ? `?${qs}` : ""}`;
  }

  const creatableTypes = ALL_TYPES.filter((t) => DOCUMENT_TYPES[t].canCreate);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <div className="group relative">
            <Button>
              <Plus className="h-4 w-4" />
              {t("newDocument")}
            </Button>
            <div className="absolute right-0 top-full z-10 mt-1 hidden w-56 rounded-lg border bg-popover p-1 shadow-lg group-focus-within:block hover:block">
              {creatableTypes.map((type) => (
                <Link
                  key={type}
                  href={`${DOCUMENT_TYPES[type].basePath}/new`}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted"
                >
                  {td(DOCUMENT_TYPES[type].label)}
                </Link>
              ))}
            </div>
          </div>
        }
      />

      {/* Type tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/documents"
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            !selectedType
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80",
          )}
        >
          {t("allDocuments")}
        </Link>
        <span className="mx-1 text-muted-foreground/40">|</span>
        {OUTGOING_TYPES.map((type) => (
          <Link
            key={type}
            href={buildHref({ type, status: undefined, page: undefined })}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              selectedType === type
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            {td(DOCUMENT_TYPES[type].labelPlural)}
          </Link>
        ))}
        <span className="mx-1 text-muted-foreground/40">|</span>
        {INCOMING_TYPES.map((type) => (
          <Link
            key={type}
            href={buildHref({ type, status: undefined, page: undefined })}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              selectedType === type
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            {td(DOCUMENT_TYPES[type].labelPlural)}
          </Link>
        ))}
      </div>

      {/* Search + filters */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          basePath="/documents"
          placeholder={`${tc("search")}...`}
          preserveParams={["type", "status", "sort", "order", "dateFrom", "dateTo"]}
        />
        <DateRangeFilter
          basePath="/documents"
          preserveParams={["type", "status", "search", "sort", "order"]}
          labelFrom={tc("from")}
          labelTo={tc("to")}
        />
        <div className="flex gap-2">
          <Link
            href={buildHref({ status: undefined, page: undefined })}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              !status
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            {tc("all")}
          </Link>
          {COMMON_FILTER_STATUSES.map((s) => (
            <Link
              key={s}
              href={buildHref({ status: s, page: undefined })}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                status === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              {ts(toCamelCase(s))}
            </Link>
          ))}
        </div>
      </div>

      {/* Summary stats */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="rounded-full bg-muted px-3 py-1 font-medium">
          {totalCount} {t("documentsCount")}
        </span>
        <span className="rounded-full bg-warning/10 px-3 py-1 font-medium text-warning">
          {formatCurrency(openAmount)} {t("open")}
        </span>
        {overdueCount > 0 && (
          <span className="rounded-full bg-destructive/10 px-3 py-1 font-medium text-destructive">
            {overdueCount} {t("overdue")}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card">
        <DocumentListTable
          documents={result.data}
          selectedType={selectedType}
          status={status}
          search={search}
          contactId={contactId}
          dateFrom={dateFrom}
          dateTo={dateTo}
          sort={sort}
          order={order}
        />
      </div>

      {/* Pagination */}
      <Pagination
        page={result.page}
        totalPages={result.totalPages}
        buildHref={(p) => buildHref({ page: p > 1 ? String(p) : undefined })}
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
    </div>
  );
}
