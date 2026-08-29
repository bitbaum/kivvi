import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  KeyRound,
  RotateCcw,
  Webhook,
  XCircle,
} from "lucide-react";
import { getIntegrationHealth } from "@kivvi/core/src/domain/integration-health";
import type { IntegrationHealthStatus } from "@kivvi/core/src/domain/integration-health";
import { DEFAULT_LOCALE } from "@kivvi/core/src/config/locale";
import { db } from "@/lib/db";
import { getSessionOrRedirect } from "@/lib/session";
import { Button } from "@/components/ui/button";

const statusStyles: Record<
  IntegrationHealthStatus,
  { icon: typeof CheckCircle2; className: string }
> = {
  healthy: {
    icon: CheckCircle2,
    className: "bg-success/10 text-success",
  },
  warning: {
    icon: AlertTriangle,
    className: "bg-warning/10 text-warning",
  },
  error: {
    icon: XCircle,
    className: "bg-destructive/10 text-destructive",
  },
};

export async function RevampitIntegrationHealth() {
  const session = await getSessionOrRedirect();
  const t = await getTranslations("dashboard.revampitIntegrationHealth");
  const health = await getIntegrationHealth(db, session.user.companyId);
  const status = statusStyles[health.status];
  const StatusIcon = status.icon;

  return (
    <section className="rounded-xl border bg-card p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div
            className={`mb-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${status.className}`}
          >
            <StatusIcon className="h-3.5 w-3.5" />
            {t(`status.${health.status}`)}
          </div>
          <h2 className="text-lg font-semibold">{t("title")}</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild variant="outline" size="sm">
            <Link href="/settings/webhooks">
              <Webhook className="h-4 w-4" />
              {t("webhooks")}
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/settings/api-tokens">
              <KeyRound className="h-4 w-4" />
              {t("apiTokens")}
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <HealthMetric
          icon={<KeyRound className="h-4 w-4" />}
          label={t("metrics.tokens")}
          value={health.activeApiTokens.toString()}
          detail={t("metrics.tokensDetail")}
        />
        <HealthMetric
          icon={<Webhook className="h-4 w-4" />}
          label={t("metrics.endpoints")}
          value={`${health.activeWebhookEndpoints}/${health.totalWebhookEndpoints}`}
          detail={t("metrics.endpointsDetail")}
        />
        <HealthMetric
          icon={<RotateCcw className="h-4 w-4" />}
          label={t("metrics.retries")}
          value={health.pendingWebhookRetries.toString()}
          detail={t("metrics.failures", {
            count: health.failedWebhookDeliveries,
          })}
          tone={health.failedWebhookDeliveries > 0 ? "error" : undefined}
        />
        <HealthMetric
          icon={<Clock3 className="h-4 w-4" />}
          label={t("metrics.replay")}
          value={health.completedIdempotencyKeys24h.toString()}
          detail={t("metrics.pendingReplay", {
            count: health.pendingIdempotencyKeys,
          })}
          tone={health.pendingIdempotencyKeys > 0 ? "warning" : undefined}
        />
      </div>

      <div className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
        <p>{t("lastWebhook", { value: formatDateTime(health.lastWebhookAt) })}</p>
        <p>{t("lastApiWrite", { value: formatDateTime(health.lastApiWriteAt) })}</p>
      </div>
    </section>
  );
}

function HealthMetric({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  tone?: "warning" | "error";
}) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div
        className={
          tone === "error"
            ? "mt-2 text-2xl font-semibold text-destructive"
            : tone === "warning"
              ? "mt-2 text-2xl font-semibold text-warning"
              : "mt-2 text-2xl font-semibold"
        }
      >
        {value}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function formatDateTime(value: Date | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString(DEFAULT_LOCALE, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
