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
import { cn, formatCurrency } from "@/lib/utils";
import {
  ITEM_STATUS_VALUES,
  ITEM_CONDITION_VALUES,
} from "@kivvi/database/src/enums";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    condition?: string;
    page?: string;
  }>;
}

const STATUS_STYLES: Record<string, string> = {
  intake: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  testing:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  repair:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  ready_for_sale:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  listed:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  reserved:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  sold: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
  returned: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  donated: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400",
  recycled: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-500",
};

const CONDITION_STYLES: Record<string, string> = {
  untested: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  like_new:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  good: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  fair: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  poor: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  parts_only: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  scrap: "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-500",
};

const STATUS_LABELS: Record<string, string> = {
  intake: "Intake",
  testing: "Testing",
  repair: "Repair",
  ready_for_sale: "Ready",
  listed: "Listed",
  reserved: "Reserved",
  sold: "Sold",
  returned: "Returned",
  donated: "Donated",
  recycled: "Recycled",
};

const CONDITION_LABELS: Record<string, string> = {
  untested: "Untested",
  like_new: "Like New",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
  parts_only: "Parts",
  scrap: "Scrap",
};

export default async function InventoryItemsPage({ searchParams }: PageProps) {
  const session = await getSessionOrRedirect();
  const t = await getTranslations("common");
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
        title="Inventory Items"
        subtitle={`${totalItems} items tracked`}
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
              New Intake
            </Link>
          </div>
        }
      />

      {/* Filters */}
      <div className="space-y-3">
        <SearchInput basePath="/intake/items" placeholder="Search items..." />

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
              {STATUS_LABELS[s] || s} ({counts[s]})
            </Link>
          ))}
        </div>
      </div>

      {/* Items table */}
      {result.data.length === 0 ? (
        <EmptyState
          icon={PackageOpen}
          title="No items found"
          description="Create an intake to start tracking items through your workflow."
          actionLabel="New Intake"
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
