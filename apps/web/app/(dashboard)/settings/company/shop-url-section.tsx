"use client";

import { useState, useTransition } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { updateCompanySlugAction } from "@/app/actions/settings";

interface Props {
  currentSlug: string | null;
}

export function ShopUrlSection({ currentSlug }: Props) {
  const [isPending, startTransition] = useTransition();
  const [slug, setSlug] = useState(currentSlug ?? "");
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shopUrl = slug
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/shop/${slug}`
    : null;

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateCompanySlugAction(slug || null);
      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        setError(result.error ?? "Fehler beim Speichern.");
      }
    });
  }

  async function copyUrl() {
    if (!shopUrl) return;
    await navigator.clipboard.writeText(shopUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-xl border bg-card p-6">
      <h2 className="mb-1 text-lg font-semibold">Shop-URL</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Ihre öffentliche Shopseite — teilen Sie diese URL mit Kunden, damit sie
        Ihre verfügbaren Artikel durchsuchen können.
      </p>

      <div className="flex gap-2">
        <div className="flex flex-1 items-center rounded-lg border bg-background overflow-hidden">
          <span className="shrink-0 border-r bg-muted px-3 py-2 text-sm text-muted-foreground">
            /shop/
          </span>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="ihr-shop-name"
            className="flex-1 px-3 py-2 text-sm bg-transparent focus:outline-none"
          />
        </div>
        <button
          onClick={handleSave}
          disabled={isPending}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5 min-h-[44px]"
        >
          {saved ? (
            <>
              <Check className="h-4 w-4" />
              Gespeichert
            </>
          ) : isPending ? (
            "Speichern…"
          ) : (
            "Speichern"
          )}
        </button>
      </div>

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

      {slug && (
        <div className="mt-3 flex items-center gap-2">
          <code className="flex-1 truncate rounded bg-muted px-3 py-1.5 text-xs text-muted-foreground">
            /shop/{slug}
          </code>
          <button
            onClick={copyUrl}
            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="URL kopieren"
          >
            {copied ? (
              <Check className="h-4 w-4 text-success" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
          <a
            href={`/shop/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Shop öffnen"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      )}
    </div>
  );
}
