import { PackageOpen, Plus } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getSessionOrRedirect } from "@/lib/session";
import { db } from "@/lib/db";
import { InventoryItemsExportButton } from "@/components/inventory-items-export-button";
import { SelectableItemList } from "@/components/inventory/selectable-item-list";
import { listInventoryItems, getInventoryItemCounts } from "@kivvi/core";
import { PageHeader } from "@/components/page-header";
import { SearchInput } from "@/components/search-input";
import { Pagination } from "@/components/pagination";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";
import { ITEM_STATUS_VALUES } from "@kivvi/database/src/enums";
import { getStatusLabelKey } from "@/lib/config/inventory-items";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    condition?: string;
    page?: string;
  }>;
}

export default async function InventoryItemsPage({ searchParams }: PageProps) {
  const session = await getSessionOrRedirect();
  const t = await getTranslations("common");
  const ti = await getTranslations("inventory");
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const status = params.status;
  const condition = params.condition;
  const search = params.search;

  const [result, counts] = await Promise.all([
    listInventoryItems(db, session.user.companyId, {
      status,
      condition,
      search,
      page,
      pageSize: 25,
    }),
    getInventoryItemCounts(db, session.user.companyId),
  ]);

  const totalItems = Object.values(counts).reduce((a, b) => a + b, 0);

  function buildHref(overrides: Record<string, string | undefined>) {
    const p = new URLSearchParams();
    const values = {
      search,
      status,
      condition,
      page: String(page),
      ...overrides,
    };
    for (const [k, v] of Object.entries(values)) {
      if (v) p.set(k, v);
    }
    return `/intake/items?${p.toString()}`;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={ti("itemsTitle")}
        subtitle={ti("itemsTracked", { count: totalItems })}
        actions={
          <div className="flex items-center gap-2">
            <InventoryItemsExportButton
              totalCount={totalItems}
              filters={{
                status: status || undefined,
                condition: condition || undefined,
                search: search || undefined,
              }}
            />
            <Link
              href="/intake/new"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              {ti("newIntake")}
            </Link>
          </div>
        }
      />

      {/* Filters */}
      <div className="space-y-3">
        <SearchInput basePath="/intake/items" placeholder={ti("searchItems")} />

        {/* Status filter pills */}
        <div className="flex flex-wrap gap-2">
          <Link
            href={buildHref({ status: undefined, page: undefined })}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              !status
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            {t("all")} ({totalItems})
          </Link>
          {ITEM_STATUS_VALUES.filter((s) => counts[s]).map((s) => (
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
              {ti(getStatusLabelKey(s))} ({counts[s]})
            </Link>
          ))}
        </div>
      </div>

      {/* Items table */}
      {result.data.length === 0 ? (
        <EmptyState
          icon={PackageOpen}
          title={ti("noItemsFound")}
          description={ti("noItemsDesc")}
          actionLabel={ti("newIntake")}
          actionHref="/intake/new"
        />
      ) : (
        <div className="rounded-xl border bg-card">
          <SelectableItemList
            items={result.data.map((item) => ({
              id: item.id,
              itemNumber: item.itemNumber,
              description: item.description,
              condition: item.condition,
              status: item.status,
              askingPrice: item.askingPrice,
              donorName: item.donorName || null,
              productName: item.productName || null,
              photoBase64: item.photoBase64 || null,
            }))}
          />

          {/* Pagination */}
          {result.totalPages > 1 && (
            <div className="p-4">
              <Pagination
                page={result.page}
                totalPages={result.totalPages}
                total={result.total}
                pageSize={result.pageSize}
                buildHref={(p) => buildHref({ page: String(p) })}
                labels={{
                  showing: t("showing"),
                  previous: t("previous"),
                  next: t("next"),
                  pageOf: t("pageOf"),
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
