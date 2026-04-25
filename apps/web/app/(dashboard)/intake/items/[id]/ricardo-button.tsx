"use client";

import { useState, useTransition } from "react";
import { ExternalLink, Upload, X, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  publishToRicardoAction,
  unpublishFromRicardoAction,
} from "@/app/actions/integrations";

interface Props {
  itemId: string;
  externalListingUrl: string | null;
  externalListingStatus: string | null;
}

export function RicardoButton({
  itemId,
  externalListingUrl,
  externalListingStatus,
}: Props) {
  const t = useTranslations("ricardo");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [listingUrl, setListingUrl] = useState(externalListingUrl);
  const [listingStatus, setListingStatus] = useState(externalListingStatus);

  const isActive = listingStatus === "active";
  const isSold = listingStatus === "sold";
  const isExpired = listingStatus === "expired" || listingStatus === "removed";

  function handlePublish() {
    setError(null);
    startTransition(async () => {
      const result = await publishToRicardoAction(itemId);
      if (result.success && result.data) {
        setListingUrl(result.data.listingUrl);
        setListingStatus("active");
      } else {
        setError(result.error ?? t("publishError"));
      }
    });
  }

  function handleUnpublish() {
    setError(null);
    startTransition(async () => {
      const result = await unpublishFromRicardoAction(itemId);
      if (result.success) {
        setListingStatus("removed");
      } else {
        setError(result.error ?? t("unpublishError"));
      }
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      {isActive && listingUrl ? (
        <div className="flex items-center gap-2">
          <a
            href={listingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-success/30 bg-success/5 px-3 py-2 text-sm font-medium text-success hover:bg-success/10 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            {t("viewListing")}
          </a>
          <button
            onClick={handleUnpublish}
            disabled={isPending}
            className="rounded-lg border px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-destructive transition-colors"
            title={t("removeListing")}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <X className="h-4 w-4" />
            )}
          </button>
        </div>
      ) : isSold ? (
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
          {t("sold")}
        </span>
      ) : (
        <button
          onClick={handlePublish}
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {isExpired ? t("republish") : t("publish")}
        </button>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
