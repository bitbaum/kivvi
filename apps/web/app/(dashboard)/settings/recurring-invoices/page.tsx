import Link from "next/link";
import { Plus, RepeatIcon } from "lucide-react";
import { getSessionOrRedirect } from "@/lib/session";
import { db } from "@/lib/db";
import { listRecurringConfigs } from "@kivvi/core";
import { getTranslations } from "next-intl/server";
import { SettingsSubpageHeader } from "@/components/settings-subpage-header";
import { Button } from "@/components/ui/button";
import { RecurringConfigRow } from "./recurring-config-row";

export default async function RecurringInvoicesPage() {
  const session = await getSessionOrRedirect();
  const t = await getTranslations("settings");
  const tc = await getTranslations("common");

  const configs = await listRecurringConfigs(db, session.user.companyId);

  const PERIODICITY_LABELS: Record<string, string> = {
    monthly: t("recurring.periodicity.monthly"),
    quarterly: t("recurring.periodicity.quarterly"),
    annual: t("recurring.periodicity.annual"),
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <SettingsSubpageHeader
        title={t("recurring.title")}
        description={t("recurring.subtitle")}
        actions={
          <Button asChild>
            <Link href="/settings/recurring-invoices/new">
              <Plus className="h-4 w-4" />
              {t("recurring.createNew")}
            </Link>
          </Button>
        }
      />

      <div className="rounded-xl border bg-card">
        {configs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <RepeatIcon className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">{tc("noResults")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t("recurring.noConfigs")}</p>
            <Button asChild className="mt-4">
              <Link href="/settings/recurring-invoices/new">
                <Plus className="h-4 w-4" />
                {t("recurring.createFirst")}
              </Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto] gap-4 border-b px-6 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <div>{t("recurring.baseOrder")}</div>
              <div>{t("recurring.customer")}</div>
              <div>{t("recurring.periodicity.label")}</div>
              <div>{t("recurring.nextGeneration")}</div>
              <div>{t("recurring.status")}</div>
              <div />
            </div>
            <div className="divide-y">
              {configs.map((config) => (
                <RecurringConfigRow
                  key={config.id}
                  config={config}
                  periodicityLabel={PERIODICITY_LABELS[config.periodicity] || config.periodicity}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
