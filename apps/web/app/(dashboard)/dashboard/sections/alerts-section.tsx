import { getDashboardAlerts } from "@kivvi/core/src/domain/dashboard";
import { db } from "@/lib/db";
import { getSessionOrRedirect } from "@/lib/session";
import { AlertCard } from "./alert-card";
import { getTranslations } from "next-intl/server";

export async function AlertsSection() {
  const session = await getSessionOrRedirect();
  const companyId = session.user.companyId;
  const alerts = await getDashboardAlerts(db, companyId);

  const t = await getTranslations("dashboard");

  // Sort alerts by severity: urgent > warning > info
  const severityOrder = { urgent: 0, warning: 1, info: 2 };
  const sortedAlerts = alerts.sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
  );

  if (sortedAlerts.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <svg
            className="h-6 w-6 text-green-600 dark:text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h3 className="font-semibold">{t("alerts.allCaughtUp")}</h3>
        <p className="text-sm text-muted-foreground">{t("alerts.noAlerts")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{t("alerts.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("alerts.subtitle")}</p>
      </div>
      <div className="space-y-3">
        {sortedAlerts.map((alert) => (
          <AlertCard key={alert.id} alert={alert} />
        ))}
      </div>
    </div>
  );
}
