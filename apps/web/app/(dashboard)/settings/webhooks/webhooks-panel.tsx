"use client";

import { useState } from "react";
import {
  Plus,
  Trash2,
  Globe,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { WEBHOOK_EVENT_VALUES } from "@kivvi/database";
import type { WebhookEndpoint, WebhookEvent } from "@kivvi/database";
import {
  createWebhookEndpointAction,
  deleteWebhookEndpointAction,
  toggleWebhookEndpointAction,
} from "@/app/actions/webhooks";

function generateSecret(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

interface Props {
  initialEndpoints: WebhookEndpoint[];
}

export function WebhooksPanel({ initialEndpoints }: Props) {
  const t = useTranslations("settings.webhooks");
  const [endpoints, setEndpoints] = useState(initialEndpoints);
  const [showForm, setShowForm] = useState(false);
  const [formState, setFormState] = useState({
    name: "",
    url: "",
    secret: generateSecret(),
    events: [] as WebhookEvent[],
  });
  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const EVENT_LABELS: Record<WebhookEvent, string> = {
    "inventory_item.created": t("eventItemCreated"),
    "inventory_item.updated": t("eventItemUpdated"),
    "inventory_item.status_changed": t("eventItemStatusChanged"),
    "document.created": t("eventDocumentCreated"),
    "document.status_changed": t("eventDocumentStatusChanged"),
    "payment.received": t("eventPaymentReceived"),
  };

  async function handleCreate() {
    setSaving(true);
    setError(null);
    const result = await createWebhookEndpointAction(formState);
    setSaving(false);
    if (!result.success) {
      setError(result.error ?? t("createError"));
      return;
    }
    setEndpoints((prev) => [
      ...prev,
      {
        id: result.data!.id,
        companyId: "",
        name: formState.name,
        url: formState.url,
        secret: formState.secret,
        events: formState.events,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    setShowForm(false);
    setFormState({ name: "", url: "", secret: generateSecret(), events: [] });
  }

  async function handleToggle(id: string, current: boolean) {
    const result = await toggleWebhookEndpointAction(id, !current);
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

  function toggleEvent(event: WebhookEvent) {
    setFormState((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }));
  }

  return (
    <div className="space-y-4">
      {/* Explanation */}
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

      {/* Endpoint list */}
      {endpoints.length > 0 && (
        <div className="space-y-3">
          {endpoints.map((ep) => (
            <div key={ep.id} className="rounded-xl border bg-card p-5">
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
                        {EVENT_LABELS[ev] ?? ev}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggle(ep.id, ep.isActive)}
                  >
                    {ep.isActive ? t("deactivate") : t("activate")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(ep.id)}
                    disabled={deletingId === ep.id}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {endpoints.length === 0 && !showForm && (
        <div className="rounded-xl border bg-card p-10 text-center text-muted-foreground">
          <Globe className="mx-auto mb-3 h-8 w-8 opacity-40" />
          <p className="text-sm">{t("emptyState")}</p>
        </div>
      )}

      {/* Add form */}
      {showForm ? (
        <div className="space-y-4 rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{t("newEndpoint")}</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowForm(false)}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="webhook-name"
                className="mb-1 block text-sm font-medium"
              >
                Name
              </label>
              <input
                id="webhook-name"
                type="text"
                value={formState.name}
                onChange={(e) =>
                  setFormState((p) => ({ ...p, name: e.target.value }))
                }
                placeholder={t("namePlaceholder")}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label
                htmlFor="webhook-url"
                className="mb-1 block text-sm font-medium"
              >
                URL
              </label>
              <input
                id="webhook-url"
                type="url"
                value={formState.url}
                onChange={(e) =>
                  setFormState((p) => ({ ...p, url: e.target.value }))
                }
                placeholder="https://example.com/webhooks/kivvi"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="webhook-secret"
              className="mb-1 block text-sm font-medium"
            >
              Secret
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  id="webhook-secret"
                  type={showSecret ? "text" : "password"}
                  value={formState.secret}
                  onChange={(e) =>
                    setFormState((p) => ({ ...p, secret: e.target.value }))
                  }
                  className="w-full rounded-lg border bg-background px-3 py-2 pr-10 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showSecret ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setFormState((p) => ({ ...p, secret: generateSecret() }))
                }
              >
                {t("regenerate")}
              </Button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("secretHint")}
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Events</label>
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
                  {EVENT_LABELS[ev]}
                </label>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>
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
