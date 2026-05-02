"use client";

import { useState } from "react";
import { Plus, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import type { WebhookEndpoint, WebhookEvent } from "@kivvi/database";
import {
  deleteWebhookEndpointAction,
  toggleWebhookEndpointAction,
} from "@/app/actions/webhooks";
import { WebhookEndpointCard } from "./_components/webhook-endpoint-card";
import { WebhookCreateForm } from "./_components/webhook-create-form";

interface Props {
  initialEndpoints: WebhookEndpoint[];
}

export function WebhooksPanel({ initialEndpoints }: Props) {
  const t = useTranslations("settings.webhooks");
  const [endpoints, setEndpoints] = useState(initialEndpoints);
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const eventLabels: Record<WebhookEvent, string> = {
    "inventory_item.created": t("eventItemCreated"),
    "inventory_item.updated": t("eventItemUpdated"),
    "inventory_item.status_changed": t("eventItemStatusChanged"),
    "document.created": t("eventDocumentCreated"),
    "document.status_changed": t("eventDocumentStatusChanged"),
    "payment.received": t("eventPaymentReceived"),
  };

  async function handleToggle(id: string, current: boolean) {
    const result = await toggleWebhookEndpointAction({
      endpointId: id,
      isActive: !current,
    });
    if (result.success) {
      setEndpoints((prev) =>
        prev.map((ep) => (ep.id === id ? { ...ep, isActive: !current } : ep)),
      );
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const result = await deleteWebhookEndpointAction(id);
    setDeletingId(null);
    if (result.success) {
      setEndpoints((prev) => prev.filter((ep) => ep.id !== id));
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-5">
        <h2 className="font-semibold">{t("howItWorks")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("howItWorksDesc")} (Header:{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            X-Kivvi-Signature
          </code>
          )
        </p>
      </div>

      {endpoints.length > 0 && (
        <div className="space-y-3">
          {endpoints.map((ep) => (
            <WebhookEndpointCard
              key={ep.id}
              ep={ep}
              eventLabels={eventLabels}
              deletingId={deletingId}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {endpoints.length === 0 && !showForm && (
        <div className="rounded-xl border bg-card p-10 text-center text-muted-foreground">
          <Globe className="mx-auto mb-3 h-8 w-8 opacity-40" />
          <p className="mb-4 text-sm">{t("emptyState")}</p>
          <Button
            variant="outline"
            onClick={() => setShowForm(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            {t("addEndpoint")}
          </Button>
        </div>
      )}

      {showForm ? (
        <WebhookCreateForm
          eventLabels={eventLabels}
          onCreated={(ep) => {
            setEndpoints((prev) => [...prev, ep]);
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
        />
      ) : (
        <Button
          variant="outline"
          onClick={() => setShowForm(true)}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          {t("addEndpoint")}
        </Button>
      )}
    </div>
  );
}
