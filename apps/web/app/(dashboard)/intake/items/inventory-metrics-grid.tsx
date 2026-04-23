import { getTranslations } from "next-intl/server";
import { cn, formatCurrency } from "@/lib/utils";
import type { getInventoryDashboard } from "@kivvi/core";

type DashboardData = Awaited<ReturnType<typeof getInventoryDashboard>>;

interface InventoryMetricsGridProps {
  dashboard: DashboardData;
  totalItems: number;
}

export async function InventoryMetricsGrid({
  dashboard,
  totalItems,
}: InventoryMetricsGridProps) {
  const ti = await getTranslations("inventory");

  if (totalItems === 0) return null;

  return (
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
        <p className="text-xs text-muted-foreground">{ti("metricAvgMargin")}</p>
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
  );
}
