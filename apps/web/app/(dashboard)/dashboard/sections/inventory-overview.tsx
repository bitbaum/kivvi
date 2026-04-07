import { PackageOpen, TrendingUp, Clock, Recycle } from "lucide-react";
import { getSessionOrRedirect } from "@/lib/session";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { getInventoryDashboard } from "@kivvi/core/src/domain/inventory-dashboard";
import { formatCurrency } from "@/lib/utils";
import {
  ITEM_STATUS_CONFIG,
  getStatusLabelKey,
} from "@/lib/config/inventory-items";

// Active pipeline statuses (exclude terminal: sold, returned, donated, recycled)
const PIPELINE_STATUSES = [
  "intake",
  "testing",
  "repair",
  "ready_for_sale",
  "listed",
  "reserved",
];

export async function InventoryOverview() {
  const session = await getSessionOrRedirect();
  const ti = await getTranslations("inventory");
  const data = await getInventoryDashboard(db, session.user.companyId);

  // Only show if there are inventory items
  if (data.unsoldCount === 0 && data.soldCount === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Inventory</h2>

      {/* Key metrics row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={<PackageOpen className="h-5 w-5" />}
          label="Inventory Value"
          value={formatCurrency(data.inventoryValue)}
          sub={`${data.unsoldCount} items`}
        />
        <MetricCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Avg Margin"
          value={`${data.averageMarginPercent}%`}
          sub={`${formatCurrency(data.totalProfit)} profit`}
          positive={data.averageMarginPercent > 0}
        />
        <MetricCard
          icon={<Clock className="h-5 w-5" />}
          label="Avg Days to Sale"
          value={`${data.avgDaysToSale}d`}
          sub={`${data.soldCount} sold / ${data.intakeCount} received`}
        />
        <MetricCard
          icon={<Recycle className="h-5 w-5" />}
          label="Sell-Through"
          value={`${data.sellThroughRate}%`}
          sub="of processed items sold"
          positive={data.sellThroughRate > 50}
        />
      </div>

      {/* Pipeline: items by status */}
      {data.unsoldCount > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">
            Pipeline
          </h3>
          <div className="flex flex-wrap gap-3">
            {PIPELINE_STATUSES.map((status) => {
              const count = data.byStatus[status] || 0;
              if (count === 0) return null;
              return (
                <a
                  key={status}
                  href={`/intake/items?status=${status}`}
                  className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted transition-colors"
                >
                  <span className="font-medium">{count}</span>
                  <span className="text-muted-foreground">
                    {ti(getStatusLabelKey(status))}
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent sales with margin */}
      {data.topItems.length > 0 && (
        <div className="rounded-xl border bg-card">
          <div className="border-b px-4 py-3">
            <h3 className="text-sm font-medium text-muted-foreground">
              Recent Sales
            </h3>
          </div>
          <div className="divide-y">
            {data.topItems.slice(0, 5).map((item) => (
              <div
                key={item.itemNumber}
                className="flex items-center justify-between px-4 py-2.5 text-sm"
              >
                <div>
                  <span className="font-medium">{item.description}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {item.itemNumber}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-medium">
                    {formatCurrency(item.soldPrice)}
                  </span>
                  <span
                    className={`ml-2 text-xs ${parseFloat(item.margin) > 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {parseFloat(item.margin) > 0 ? "+" : ""}
                    {formatCurrency(item.margin)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  sub,
  positive,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-2 flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div
        className={`text-2xl font-bold ${positive === true ? "text-green-600" : positive === false ? "text-red-600" : ""}`}
      >
        {value}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}
