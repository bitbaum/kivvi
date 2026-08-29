"use client";

import { useState, useCallback } from "react";
import { ChevronDown, ChevronRight, CheckCircle2, XCircle, Clock, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { DEFAULT_LOCALE } from "@kivvi/core/src/config/locale";
import { Button } from "@/components/ui/button";
import { listWebhookDeliveriesAction } from "@/app/actions/webhooks";
import type { WebhookDelivery as Delivery } from "@kivvi/database";

function DeliveryRow({ delivery }: { delivery: Delivery }) {
  const t = useTranslations("settings.webhooks.deliveryLog");
  const [expanded, setExpanded] = useState(false);

  const isSuccess =
    delivery.deliveredAt !== null ||
    (delivery.statusCode !== null && delivery.statusCode >= 200 && delivery.statusCode < 300);
  const isPendingRetry = !isSuccess && delivery.nextRetryAt !== null;

  return (
    <div className="border-b last:border-0">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
      >
        <span className="shrink-0">
          {isSuccess ? (
            <CheckCircle2 className="h-4 w-4 text-success" />
          ) : isPendingRetry ? (
            <Clock className="h-4 w-4 text-warning" />
          ) : (
            <XCircle className="h-4 w-4 text-destructive" />
          )}
        </span>
        <span className="flex-1 min-w-0">
          <span className="font-mono text-xs text-muted-foreground">{delivery.event}</span>
        </span>
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
          {delivery.statusCode !== null ? (
            <span className={isSuccess ? "text-success" : "text-destructive"}>
              {delivery.statusCode}
            </span>
          ) : (
            <span className="text-destructive">{t("noResponse")}</span>
          )}
        </span>
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums w-32 text-right">
          {new Date(delivery.createdAt).toLocaleString(DEFAULT_LOCALE, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        <span className="shrink-0 text-muted-foreground">
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </span>
      </button>
      {expanded && (
        <div className="bg-muted/20 px-4 pb-3 space-y-2 text-xs">
          <div className="flex gap-4 text-muted-foreground pt-1">
            <span>
              {t("attempts")}: {delivery.attemptCount}
            </span>
            {delivery.deliveredAt && (
              <span>
                {t("deliveredAt")}: {new Date(delivery.deliveredAt).toLocaleString(DEFAULT_LOCALE)}
              </span>
            )}
            {isPendingRetry && delivery.nextRetryAt && (
              <span>
                {t("nextRetry")}: {new Date(delivery.nextRetryAt).toLocaleString(DEFAULT_LOCALE)}
              </span>
            )}
          </div>
          {delivery.responseBody && (
            <pre className="overflow-x-auto rounded bg-muted p-2 font-mono text-xs leading-relaxed max-h-32">
              {delivery.responseBody.slice(0, 500)}
              {delivery.responseBody.length > 500 ? "…" : ""}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

interface Props {
  endpointId: string;
}

export function WebhookDeliveryLog({ endpointId }: Props) {
  const t = useTranslations("settings.webhooks.deliveryLog");
  const [deliveries, setDeliveries] = useState<Delivery[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await listWebhookDeliveriesAction(endpointId);
    if (result.success && result.data) {
      setDeliveries(result.data);
    }
    setLoading(false);
  }, [endpointId]);

  const toggle = async () => {
    if (!open && deliveries === null) {
      await load();
    }
    setOpen((v) => !v);
  };

  return (
    <div className="mt-3 border-t pt-3">
      <div className="flex items-center justify-between">
        <button
          onClick={toggle}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          {t("title")}
          {deliveries !== null && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs">{deliveries.length}</span>
          )}
        </button>
        {open && (
          <Button
            variant="ghost"
            size="sm"
            onClick={load}
            disabled={loading}
            className="h-6 gap-1 px-2 text-xs text-muted-foreground"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            {t("refresh")}
          </Button>
        )}
      </div>

      {open && (
        <div className="mt-2 rounded-lg border bg-card overflow-hidden">
          {loading && deliveries === null ? (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">{t("loading")}</p>
          ) : deliveries && deliveries.length > 0 ? (
            deliveries.map((d) => <DeliveryRow key={d.id} delivery={d} />)
          ) : (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">{t("empty")}</p>
          )}
        </div>
      )}
    </div>
  );
}
