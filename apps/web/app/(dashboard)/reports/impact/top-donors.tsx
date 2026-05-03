import { Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { TopDonor, ImpactMetrics } from "@kivvi/core/src/domain/impact";

export async function TopDonorsSection({
  topDonors,
  metrics,
  co2Kg,
}: {
  topDonors: TopDonor[];
  metrics: ImpactMetrics;
  co2Kg: number;
}) {
  const t = await getTranslations("inventory");
  const tr = await getTranslations("reports");

  return (
    <div className="rounded-xl border bg-card p-6">
      <h2 className="mb-4 flex items-center gap-2 font-semibold">
        <Users className="h-4 w-4 text-muted-foreground" />
        {tr("impactTopDonors")}
      </h2>
      {topDonors.length === 0 ? (
        <p className="text-sm text-muted-foreground">{tr("impactNoDonors")}</p>
      ) : (
        <div className="space-y-3">
          {topDonors.map((donor, i) => {
            const co2PerItem =
              metrics.itemsReused > 0 ? co2Kg / metrics.itemsReused : 0;
            const donorCo2Kg = Math.round(donor.itemsReused * co2PerItem);
            const pct =
              metrics.itemsProcessed > 0
                ? Math.round(
                    (donor.itemsDonated / metrics.itemsProcessed) * 100,
                  )
                : 0;
            return (
              <div key={donor.donorId}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-4 text-xs font-bold text-muted-foreground">
                      {i + 1}.
                    </span>
                    <span className="font-medium">{donor.donorName}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>
                      {t("donorItemsDonated")}: {donor.itemsDonated}
                    </span>
                    <span className="font-medium text-success">
                      {t("donorImpactSummary", {
                        reused: donor.itemsReused,
                        total: donor.itemsDonated,
                        co2: `${donorCo2Kg} kg`,
                      })}
                    </span>
                  </div>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary/60"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
