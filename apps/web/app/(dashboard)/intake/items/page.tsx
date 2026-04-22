import { PackageOpen, Plus, Wrench } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getSessionOrRedirect } from "@/lib/session";
import { db } from "@/lib/db";
import { InventoryItemsExportButton } from "@/components/inventory-items-export-button";
import { SelectableItemList } from "@/components/inventory/selectable-item-list";
import {
  listInventoryItems,
  getInventoryItemCounts,
  getInventoryItemConditionCounts,
  getInventoryDashboard,
  listWarehouses,
} from "@kivvi/core";
import { PageHeader } from "@/components/page-header";
import { SearchInput } from "@/components/search-input";
import { Pagination } from "@/components/pagination";
import { EmptyState } from "@/components/empty-state";
import { cn, formatCurrency } from "@/lib/utils";
import {
  ITEM_STATUS_VALUES,
  ITEM_CONDITION_VALUES,
} from "@kivvi/database/src/enums";
import {
  getStatusLabelKey,
  getConditionLabelKey,
} from "@/lib/config/inventory-items";
import {
  getChecklistTemplate,
  type ChecklistData,
} from "@kivvi/core/src/config/checklist-templates";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    condition?: string;
    assignedTo?: string;
    warehouseId?: string;
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
  const assignedTo = params.assignedTo; // "me" | undefined
  const warehouseId = params.warehouseId;

  const assignedToUserId = assignedTo === "me" ? session.user.id : undefined;

  const [result, counts, conditionCounts, dashboard, allWarehouses] =
    await Promise.all([
      listInventoryItems(db, session.user.companyId, {
        status,
        condition,
        search,
        assignedToUserId,
        warehouseId,
        page,
        pageSize: 25,
      }),
      getInventoryItemCounts(db, session.user.companyId),
      getInventoryItemConditionCounts(
        db,
        session.user.companyId,
        status,
        warehouseId,
      ),
      getInventoryDashboard(db, session.user.companyId, { periodDays: 30 }),
      listWarehouses(db, session.user.companyId),
    ]);

  const totalItems = Object.values(counts).reduce((a, b) => a + b, 0);

  function buildHref(overrides: Record<string, string | undefined>) {
    const p = new URLSearchParams();
    const values = {
      search,
      status,
      condition,
      assignedTo,
      warehouseId,
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
                assignedToUserId: assignedToUserId,
                warehouseId: warehouseId,
              }}
            />
            {(counts["repair"] ?? 0) > 0 && (
              <Link
                href="/intake/repair-queue"
                className="inline-flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/5 px-4 py-2 text-sm font-medium text-warning hover:bg-warning/10 transition-colors"
              >
                <Wrench className="h-4 w-4" />
                {ti("repairQueue")} ({counts["repair"]})
              </Link>
            )}
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

      {/* Inventory metrics */}
      {totalItems > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">
              {ti("metricInventoryValue")}
            </p>
            <p className="mt-1 text-lg font-semibold">
              {formatCurrency(dashboard.inventoryValue)}
            </p>
            <p className="text-xs text-muted-foreground">
              {ti("metricUnsoldItems", { count: dashboard.unsoldCount })}
            </p>
          </div>
          <div className="rounded-xl border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">
              {ti("metricSellThrough")}
            </p>
            <p className="mt-1 text-lg font-semibold">
              {dashboard.sellThroughRate}%
            </p>
            <p className="text-xs text-muted-foreground">
              {ti("metricSoldItems", { count: dashboard.soldCount })}
            </p>
          </div>
          <div className="rounded-xl border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">
              {ti("metricAvgMargin")}
            </p>
            <p
              className={cn(
                "mt-1 text-lg font-semibold",
                dashboard.averageMarginPercent > 0
                  ? "text-success"
                  : "text-muted-foreground",
              )}
            >
              {dashboard.averageMarginPercent > 0
                ? `${dashboard.averageMarginPercent}%`
                : "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              {dashboard.totalProfit !== "0"
                ? `${formatCurrency(dashboard.totalProfit)} ${ti("metricProfit")}`
                : ti("metricNoSalesYet")}
            </p>
          </div>
          <div className="rounded-xl border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">
              {ti("metricAvgDaysToSale")}
            </p>
            <p className="mt-1 text-lg font-semibold">
              {dashboard.avgDaysToSale > 0 ? dashboard.avgDaysToSale : "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              {dashboard.avgDaysToSale > 0
                ? ti("metricDays")
                : ti("metricNoSalesYet")}
            </p>
          </div>
        </div>
      )}

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
          <div className="h-6 w-px bg-border self-center" />
          <Link
            href={buildHref({
              assignedTo: assignedTo === "me" ? undefined : "me",
              page: undefined,
            })}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              assignedTo === "me"
                ? "bg-warning text-warning-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            {ti("assignedToMe")}
          </Link>
        </div>

        {/* Condition filter pills — only shown when at least one condition has items */}
        {ITEM_CONDITION_VALUES.some((c) => conditionCounts[c]) && (
          <div className="flex flex-wrap gap-2">
            <Link
              href={buildHref({ condition: undefined, page: undefined })}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                !condition
                  ? "bg-secondary text-secondary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              {t("allConditions")}
            </Link>
            {ITEM_CONDITION_VALUES.filter((c) => conditionCounts[c]).map(
              (c) => (
                <Link
                  key={c}
                  href={buildHref({ condition: c, page: undefined })}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    condition === c
                      ? "bg-secondary text-secondary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80",
                  )}
                >
                  {ti(getConditionLabelKey(c))} ({conditionCounts[c]})
                </Link>
              ),
            )}
          </div>
        )}

        {/* Warehouse filter pills — only shown when company has multiple warehouses */}
        {allWarehouses.length > 1 && (
          <div className="flex flex-wrap gap-2">
            <Link
              href={buildHref({ warehouseId: undefined, page: undefined })}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                !warehouseId
                  ? "bg-secondary text-secondary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              {ti("allWarehouses")}
            </Link>
            {allWarehouses.map((w) => (
              <Link
                key={w.id}
                href={buildHref({ warehouseId: w.id, page: undefined })}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  warehouseId === w.id
                    ? "bg-secondary text-secondary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
                )}
              >
                {w.name}
              </Link>
            ))}
          </div>
        )}
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
            items={result.data.map((item) => {
              const cd = item.checklistData as ChecklistData | null;
              let qcProgress:
                | { done: number; total: number; signedOff: boolean }
                | undefined;
              if (cd?.completions?.length && item.category) {
                const template = getChecklistTemplate(item.category);
                const requiredTotal = template.checks.filter(
                  (c) => c.required,
                ).length;
                const done = cd.completions.filter(
                  (c) => c.result === "pass",
                ).length;
                qcProgress = {
                  done,
                  total: requiredTotal,
                  signedOff: !!cd.signedOffAt,
                };
              }
              return {
                id: item.id,
                itemNumber: item.itemNumber,
                description: item.description,
                condition: item.condition,
                status: item.status,
                askingPrice: item.askingPrice,
                donorName: item.donorName || null,
                productName: item.productName || null,
                photoBase64: item.photoBase64 || null,
                qcProgress,
              };
            })}
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
