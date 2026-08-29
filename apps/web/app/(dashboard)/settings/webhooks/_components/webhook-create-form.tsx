"use client";

import { useState } from "react";
import { ChevronUp, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
// enums.ts has zero drizzle/postgres deps — safe to import in a client component
import { WEBHOOK_EVENT_VALUES } from "@kivvi/database/src/enums";
import type { WebhookEndpoint, WebhookEvent } from "@kivvi/database";
import { createWebhookEndpointAction } from "@/app/actions/webhooks";

function generateSecret(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

interface Props {
  eventLabels: Record<WebhookEvent, string>;
  onCreated: (endpoint: WebhookEndpoint) => void;
  onCancel: () => void;
}

export function WebhookCreateForm({ eventLabels, onCreated, onCancel }: Props) {
  const t = useTranslations("settings.webhooks");
  const [formState, setFormState] = useState({
    name: "",
    url: "",
    secret: generateSecret(),
    events: [] as WebhookEvent[],
  });
  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setSaving(true);
    setError(null);
    const result = await createWebhookEndpointAction(formState);
    setSaving(false);
    if (!result.success || !result.data) {
      setError(result.error ?? t("createError"));
      return;
    }
    onCreated({
      id: result.data.id,
      companyId: "",
      name: formState.name,
      url: formState.url,
      secret: formState.secret,
      events: formState.events,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  function toggleEvent(event: WebhookEvent) {
    setFormState((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }));
  }

  return (
    <div className="space-y-4 rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{t("newEndpoint")}</h3>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <ChevronUp className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="webhook-name" className="mb-1 block text-sm font-medium">
            Name
          </label>
          <input
            id="webhook-name"
            type="text"
            value={formState.name}
            onChange={(e) => setFormState((p) => ({ ...p, name: e.target.value }))}
            placeholder={t("namePlaceholder")}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label htmlFor="webhook-url" className="mb-1 block text-sm font-medium">
            URL
          </label>
          <input
            id="webhook-url"
            type="url"
            value={formState.url}
            onChange={(e) => setFormState((p) => ({ ...p, url: e.target.value }))}
            placeholder="https://example.com/webhooks/kivvi"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div>
        <label htmlFor="webhook-secret" className="mb-1 block text-sm font-medium">
          Secret
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              id="webhook-secret"
              type={showSecret ? "text" : "password"}
              value={formState.secret}
              onChange={(e) => setFormState((p) => ({ ...p, secret: e.target.value }))}
              className="w-full rounded-lg border bg-background px-3 py-2 pr-10 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="button"
              onClick={() => setShowSecret((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFormState((p) => ({ ...p, secret: generateSecret() }))}
          >
            {t("regenerate")}
          </Button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{t("secretHint")}</p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">{t("events")}</label>
        <div className="grid gap-2 sm:grid-cols-2">
          {WEBHOOK_EVENT_VALUES.map((ev) => (
            <label
              key={ev}
              className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted/50"
            >
              <input
                type="checkbox"
                checked={formState.events.includes(ev)}
                onChange={() => toggleEvent(ev)}
                className="h-4 w-4 rounded border"
              />
              {eventLabels[ev]}
            </label>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          {t("cancel")}
        </Button>
        <Button
          onClick={handleCreate}
          disabled={
            saving ||
            !formState.name ||
            !formState.url ||
            !formState.secret ||
            formState.events.length === 0
          }
        >
          {saving ? t("saving") : t("save")}
        </Button>
      </div>
    </div>
  );
}
