import { PackageOpen, Plus, Wrench, Upload } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/pagination";
import { EmptyState } from "@/components/empty-state";
import {
  getChecklistTemplate,
  type ChecklistData,
} from "@kivvi/core/src/config/checklist-templates";
import { PIPELINE_STATUSES } from "@kivvi/core/src/config/pipeline-thresholds";
import { InventoryMetricsGrid } from "./inventory-metrics-grid";
import { InventoryFilterPills } from "./inventory-filter-pills";

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
  const assignedTo = params.assignedTo;
  const warehouseId = params.warehouseId;

  const assignedToUserId = assignedTo === "me" ? session.user.id : undefined;

  const [result, counts, conditionCounts, dashboard, allWarehouses] = await Promise.all([
    listInventoryItems(db, session.user.companyId, {
      status,
      condition,
      search,
      assignedToUserId,
      warehouseId,
      page,
      pageSize: 25,
      // Show oldest-first for pipeline statuses so stale items surface at top
      sortBy: "createdAt",
      sortOrder:
        status && PIPELINE_STATUSES.includes(status as (typeof PIPELINE_STATUSES)[number])
          ? "asc"
          : "desc",
    }),
    getInventoryItemCounts(db, session.user.companyId),
    getInventoryItemConditionCounts(db, session.user.companyId, status, warehouseId),
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
          <div className="flex flex-wrap items-center gap-2">
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
            <Button
              asChild
              variant={(counts["repair"] ?? 0) > 0 ? "outline" : "secondary"}
              className={
                (counts["repair"] ?? 0) > 0
                  ? "border-warning/30 bg-warning/5 text-warning hover:bg-warning/10"
                  : undefined
              }
            >
              <Link href="/intake/repair-queue">
                <Wrench className="h-4 w-4" />
                {(counts["repair"] ?? 0) > 0
                  ? `${ti("repairQueue")} (${counts["repair"]})`
                  : ti("repairQueue")}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/intake/items/import">
                <Upload className="h-4 w-4" />
                {ti("importItems")}
              </Link>
            </Button>
            <Button asChild>
              <Link href="/intake/new">
                <Plus className="h-4 w-4" />
                {ti("newIntake")}
              </Link>
            </Button>
          </div>
        }
      />

      <InventoryMetricsGrid dashboard={dashboard} totalItems={totalItems} />

      <InventoryFilterPills
        search={search}
        status={status}
        condition={condition}
        assignedTo={assignedTo}
        warehouseId={warehouseId}
        page={page}
        counts={counts}
        conditionCounts={conditionCounts}
        allWarehouses={allWarehouses}
        totalItems={totalItems}
      />

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
              let qcProgress: { done: number; total: number; signedOff: boolean } | undefined;
              if (cd?.completions?.length && item.category) {
                const template = getChecklistTemplate(item.category);
                const requiredTotal = template.checks.filter((c) => c.required).length;
                const done = cd.completions.filter((c) => c.result === "pass").length;
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
                createdAt: item.createdAt,
                askingPrice: item.askingPrice,
                donorName: item.donorName || null,
                donorContactId: item.donorContactId || null,
                productName: item.productName || null,
                photoBase64: item.photoBase64 || null,
                qcProgress,
              };
            })}
          />

          {result.totalPages > 1 && (
            <div className="p-4">
              <Pagination
                page={result.page}
                totalPages={result.totalPages}
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
