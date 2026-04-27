"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronUp,
  AlertCircle,
  AlertTriangle,
  Info,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useTranslations } from "next-intl";
import type { DashboardAlert } from "@kivvi/core/src/domain/dashboard";

interface AlertCardProps {
  alert: DashboardAlert;
}

export function AlertCard({ alert }: AlertCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const t = useTranslations("dashboard");

  const severityStyles = {
    urgent: {
      bg: "bg-destructive/5",
      border: "border-destructive/20",
      icon: "text-destructive",
      iconBg: "bg-destructive/10",
      badge: "bg-destructive/10 text-destructive",
    },
    warning: {
      bg: "bg-warning/5",
      border: "border-warning/20",
      icon: "text-warning",
      iconBg: "bg-warning/10",
      badge: "bg-warning/10 text-warning",
    },
    info: {
      bg: "bg-info/5",
      border: "border-info/20",
      icon: "text-info",
      iconBg: "bg-info/10",
      badge: "bg-info/10 text-info",
    },
  };

  const styles = severityStyles[alert.severity];

  const Icon =
    alert.severity === "urgent"
      ? AlertCircle
      : alert.severity === "warning"
        ? AlertTriangle
        : Info;

  // Extract items from metadata if available (for expandable alerts).
  // metadata is a discriminated union of `{ products }` or `{ breakdown }`.
  const items: Array<{
    name?: string;
    type?: string;
    articleNumber?: string | null;
    count?: number;
  }> = alert.metadata
    ? "products" in alert.metadata
      ? alert.metadata.products
      : alert.metadata.breakdown
    : [];
  const showExpandButton = items.length > 3;
  const displayItems = isExpanded ? items : items.slice(0, 3);

  return (
    <div className={`rounded-xl border ${styles.border} ${styles.bg} p-4`}>
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${styles.iconBg}`}
        >
          <Icon className={`h-5 w-5 ${styles.icon}`} />
        </div>
        <div className="flex-1 space-y-2">
          <div>
            <h3 className="font-semibold">{t(alert.titleKey)}</h3>
            <p className="text-sm text-muted-foreground">
              {t(alert.descriptionKey, alert.descriptionParams)}
            </p>
          </div>

          {alert.amount !== undefined && (
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles.badge}`}
              >
                {formatCurrency(alert.amount)}
              </span>
              {alert.count && (
                <span className="text-xs text-muted-foreground">
                  {alert.count}{" "}
                  {alert.count === 1 ? t("alerts.item") : t("alerts.items")}
                </span>
              )}
            </div>
          )}

          {/* Expandable items list */}
          {items.length > 0 && (
            <div className="space-y-2">
              <div className="space-y-1">
                {displayItems.map((item, index) => (
                  <div
                    key={index}
                    className="rounded-md border bg-card/50 p-2 text-sm"
                  >
                    {item.name || item.type}{" "}
                    {item.articleNumber && `(${item.articleNumber})`}
                    {item.count && ` - ${item.count} items`}
                  </div>
                ))}
              </div>
              {showExpandButton && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="h-4 w-4" />
                      {t("alerts.showLess")}
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4" />
                      {t("alerts.showMore", { count: items.length - 3 })}
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Link
              href={alert.linkTo}
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {t("alerts.viewDetails")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
