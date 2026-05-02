"use client";

import { Globe, CheckCircle2, XCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import type { WebhookEndpoint, WebhookEvent } from "@kivvi/database";
import { WebhookDeliveryLog } from "../webhook-delivery-log";

interface Props {
  ep: WebhookEndpoint;
  eventLabels: Record<WebhookEvent, string>;
  deletingId: string | null;
  onToggle: (id: string, current: boolean) => void;
  onDelete: (id: string) => void;
}

export function WebhookEndpointCard({
  ep,
  eventLabels,
  deletingId,
  onToggle,
  onDelete,
}: Props) {
  const t = useTranslations("settings.webhooks");

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="font-medium">{ep.name}</span>
            {ep.isActive ? (
              <span className="flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                <CheckCircle2 className="h-3 w-3" />
                {t("statusActive")}
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                <XCircle className="h-3 w-3" />
                {t("statusInactive")}
              </span>
            )}
          </div>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {ep.url}
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {(ep.events as WebhookEvent[]).map((ev) => (
              <span
                key={ev}
                className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground"
              >
                {eventLabels[ev] ?? ev}
              </span>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onToggle(ep.id, ep.isActive)}
          >
            {ep.isActive ? t("deactivate") : t("activate")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(ep.id)}
            disabled={deletingId === ep.id}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <WebhookDeliveryLog endpointId={ep.id} />
    </div>
  );
}
