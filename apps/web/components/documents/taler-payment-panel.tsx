"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ExternalLink, Loader2, RefreshCw, WalletCards } from "lucide-react";
import {
  createTalerPaymentOrderAction,
  refreshTalerPaymentOrderAction,
} from "@/app/actions/documents";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/copy-button";
import { formatCurrency, formatDate } from "@/lib/utils";

interface TalerOrder {
  id: string;
  orderId: string;
  status: string;
  amount: string;
  currency: string;
  talerPayUri?: string | null;
  orderStatusUrl?: string | null;
  payDeadline?: Date | string | null;
  paidAt?: Date | string | null;
  lastCheckedAt?: Date | string | null;
  lastError?: string | null;
}

export function TalerPaymentPanel({
  documentId,
  order,
  isConfigured,
}: {
  documentId: string;
  order?: TalerOrder | null;
  isConfigured: boolean;
}) {
  const router = useRouter();
  const t = useTranslations("documents.taler");
  const tc = useTranslations("common");
  const [message, setMessage] = useState<string | null>(order?.lastError || null);
  const [isCreating, createTransition] = useTransition();
  const [isRefreshing, refreshTransition] = useTransition();
  const paymentUrl = order?.orderStatusUrl || order?.talerPayUri || "";

  function createOrder() {
    setMessage(null);
    createTransition(async () => {
      const result = await createTalerPaymentOrderAction(documentId);
      if (result.success) {
        setMessage(t("created"));
        router.refresh();
      } else {
        setMessage(result.error || tc("error"));
      }
    });
  }

  function refreshOrder() {
    if (!order) return;
    setMessage(null);
    refreshTransition(async () => {
      const result = await refreshTalerPaymentOrderAction(order.id);
      if (result.success) {
        const status = result.data?.status || "unpaid";
        setMessage(
          t("refreshed", {
            status: t(`status.${status}`),
          }),
        );
        router.refresh();
      } else {
        setMessage(result.error || tc("error"));
      }
    });
  }

  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">{t("title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {isConfigured ? t("description") : t("notConfigured")}
          </p>
        </div>
        <WalletCards className="h-5 w-5 text-muted-foreground" />
      </div>

      {order ? (
        <div className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">{t("statusLabel")}</span>
            <span className="font-medium">{t(`status.${order.status}`)}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">{t("amount")}</span>
            <span>{formatCurrency(order.amount, order.currency)}</span>
          </div>
          {order.payDeadline && (
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">{t("payDeadline")}</span>
              <span>{formatDate(order.payDeadline)}</span>
            </div>
          )}
          {order.lastCheckedAt && (
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">{t("lastChecked")}</span>
              <span>{formatDate(order.lastCheckedAt)}</span>
            </div>
          )}
          {paymentUrl && (
            <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                {paymentUrl}
              </span>
              <CopyButton value={paymentUrl} label={t("copyLink")} />
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {paymentUrl && (
              <Button asChild variant="secondary">
                <a href={paymentUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  {t("openLink")}
                </a>
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              onClick={refreshOrder}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {t("refresh")}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          className="mt-4 w-full"
          onClick={createOrder}
          disabled={!isConfigured || isCreating}
        >
          {isCreating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <WalletCards className="h-4 w-4" />
          )}
          {t("createLink")}
        </Button>
      )}

      {message && <p className="mt-3 text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}
