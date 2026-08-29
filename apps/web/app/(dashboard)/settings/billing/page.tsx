import { redirect } from "next/navigation";
import { getSessionOrRedirect } from "@/lib/session";
import { db } from "@/lib/db";
import { companies } from "@kivvi/database";
import type { CompanySettings } from "@kivvi/database";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { SettingsSubpageHeader } from "@/components/settings-subpage-header";
import { isPlanActive, isTrialing, getTrialDaysRemaining } from "@kivvi/core/src/domain/billing";
import { StatusBadge } from "@/components/status-badge";
import { BillingActions } from "./billing-actions";

export default async function BillingPage() {
  const session = await getSessionOrRedirect();
  const t = await getTranslations("settings.billing");

  const [company] = await db
    .select()
    .from(companies)
    .where(eq(companies.id, session.user.companyId));

  if (!company) redirect("/login");

  const settings = (company.settings as CompanySettings) || {};
  const active = isPlanActive(settings);
  const trialing = isTrialing(settings);
  const trialDays = getTrialDaysRemaining(settings);
  const plan = settings.plan ?? "free";
  const status = settings.subscriptionStatus;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <SettingsSubpageHeader title={t("title")} description={t("subtitle")} />

      {/* Current Plan */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold">{t("currentPlan")}</h2>

        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold capitalize">{plan}</span>
          {active && <StatusBadge variant="active" label={t("active")} />}
          {status === "past_due" && (
            <StatusBadge
              status="past_due"
              label={t("pastDue")}
              styleMap={{
                past_due: "bg-destructive/10 text-destructive",
              }}
            />
          )}
          {status === "cancelled" && <StatusBadge variant="inactive" label={t("cancelled")} />}
        </div>

        {trialing && (
          <p className="text-sm text-muted-foreground">
            {t("trialRemaining", { days: trialDays })}
          </p>
        )}

        {status === "past_due" && <p className="text-sm text-destructive">{t("pastDueMessage")}</p>}
      </div>

      {/* Actions */}
      <BillingActions plan={plan} hasSubscription={!!settings.stripeSubscriptionId} />
    </div>
  );
}
