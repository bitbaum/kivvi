import { getTranslations } from "next-intl/server";
import { DEFAULT_LOCALE } from "@kivvi/core/src/config/locale";
import type { DestinationBreakdown } from "@kivvi/core/src/domain/impact";

export async function DestinationBreakdownSection({
  data,
}: {
  data: DestinationBreakdown;
}) {
  const t = await getTranslations("inventory");
  const tr = await getTranslations("reports");

  const total = data.sold + data.donated + data.recycled + data.inStock;
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  const destinations = [
    {
      label: t("statusSold"),
      value: data.sold,
      pct: pct(data.sold),
      color: "bg-success/20 text-success",
      bar: "bg-success/60",
    },
    {
      label: t("statusDonated"),
      value: data.donated,
      pct: pct(data.donated),
      color: "bg-info/20 text-info",
      bar: "bg-info/60",
    },
    {
      label: t("statusRecycled"),
      value: data.recycled,
      pct: pct(data.recycled),
      color: "bg-warning/20 text-warning",
      bar: "bg-warning/60",
    },
    {
      label: t("inStock"),
      value: data.inStock,
      pct: pct(data.inStock),
      color: "bg-muted text-muted-foreground",
      bar: "bg-muted-foreground/40",
    },
  ];

  return (
    <div className="rounded-xl border bg-card p-6">
      <h2 className="mb-4 font-semibold">{tr("impactDestinationBreakdown")}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {destinations.map((d) => (
          <div key={d.label} className="rounded-lg border bg-card p-4">
            <div className="text-2xl font-bold tabular-nums">
              {d.value.toLocaleString(DEFAULT_LOCALE)}
            </div>
            <div
              className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${d.color}`}
            >
              {d.label}
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full ${d.bar}`}
                style={{ width: `${d.pct}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{d.pct}%</p>
          </div>
        ))}
      </div>
    </div>
  );
}
