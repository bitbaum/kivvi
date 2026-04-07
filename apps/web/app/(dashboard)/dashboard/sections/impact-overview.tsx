import { Leaf, Recycle, Users, ArrowRight } from "lucide-react";
import Link from "next/link";
import { getSessionOrRedirect } from "@/lib/session";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { getImpactMetrics } from "@kivvi/core/src/domain/impact";

export async function ImpactOverview() {
  const session = await getSessionOrRedirect();
  const ti = await getTranslations("inventory");
  const metrics = await getImpactMetrics(db, session.user.companyId);

  if (metrics.itemsProcessed === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{ti("impact")}</h2>
        <Link
          href="/reports"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {ti("fullReport")} <ArrowRight className="ml-1 inline h-3 w-3" />
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4">
          <div className="mb-2 flex items-center gap-2 text-green-600">
            <Recycle className="h-5 w-5" />
            <span className="text-xs font-medium">{ti("itemsReused")}</span>
          </div>
          <div className="text-2xl font-bold">{metrics.itemsReused}</div>
          <p className="mt-1 text-xs text-muted-foreground">
            {metrics.reuseRatePercent}% {ti("reuseRate")}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <div className="mb-2 flex items-center gap-2 text-emerald-600">
            <Leaf className="h-5 w-5" />
            <span className="text-xs font-medium">{ti("co2Avoided")}</span>
          </div>
          <div className="text-2xl font-bold">
            {Number(metrics.co2AvoidedKg).toLocaleString()} kg
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            ~{Math.round(Number(metrics.co2AvoidedKg) / 1000)} t
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <div className="mb-2 flex items-center gap-2 text-blue-600">
            <Users className="h-5 w-5" />
            <span className="text-xs font-medium">{ti("itemsProcessed")}</span>
          </div>
          <div className="text-2xl font-bold">{metrics.itemsProcessed}</div>
          <p className="mt-1 text-xs text-muted-foreground">
            {metrics.wasteDiverted} {ti("divertedFromLandfill")}
          </p>
        </div>
      </div>
    </div>
  );
}
