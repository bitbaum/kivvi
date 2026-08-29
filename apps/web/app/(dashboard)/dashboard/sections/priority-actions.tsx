"use client";

import { useState } from "react";
import Link from "next/link";
import { formatCurrency, cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import type { DashboardAlert, WorkflowSuggestion } from "@kivvi/core/src/domain/dashboard";
import {
  ArrowRight,
  AlertCircle,
  AlertTriangle,
  Info,
  FileText,
  ShoppingCart,
  Truck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface PriorityAction {
  id: string;
  priority: number; // 1 = highest
  icon: React.ReactNode;
  title: string;
  description: string;
  amount?: number;
  linkTo: string;
  actionLabel: string;
  severity: "urgent" | "warning" | "info";
}

function alertToPriorityAction(
  alert: DashboardAlert,
  t: (key: string, params?: Record<string, string | number>) => string,
): PriorityAction {
  const priorityMap = { urgent: 1, warning: 2, info: 3 };
  const iconMap = {
    urgent: <AlertCircle className="h-5 w-5" />,
    warning: <AlertTriangle className="h-5 w-5" />,
    info: <Info className="h-5 w-5" />,
  };

  return {
    id: alert.id,
    priority: priorityMap[alert.severity],
    icon: iconMap[alert.severity],
    title: t(alert.titleKey),
    description: t(alert.descriptionKey, alert.descriptionParams),
    amount: alert.amount,
    linkTo: alert.linkTo,
    actionLabel: t("alerts.viewDetails"),
    severity: alert.severity,
  };
}

function workflowToPriorityAction(
  suggestion: WorkflowSuggestion,
  t: (key: string, params?: Record<string, string | number>) => string,
): PriorityAction {
  const iconMap: Record<string, React.ReactNode> = {
    convert_quote: <FileText className="h-5 w-5" />,
    invoice_order: <ShoppingCart className="h-5 w-5" />,
    confirm_delivery: <Truck className="h-5 w-5" />,
    start_dunning: <AlertCircle className="h-5 w-5" />,
  };
  const severityMap: Record<number, "urgent" | "warning" | "info"> = {
    1: "urgent",
    2: "warning",
    3: "info",
  };

  return {
    id: suggestion.id,
    priority: suggestion.priority,
    icon: iconMap[suggestion.type] || <ArrowRight className="h-5 w-5" />,
    title: `${t(suggestion.titleKey)} — ${suggestion.entityNumber}`,
    description: t(suggestion.descriptionKey, suggestion.descriptionParams),
    amount: suggestion.amount,
    linkTo: suggestion.actionUrl,
    actionLabel: t(suggestion.actionLabelKey),
    severity: severityMap[suggestion.priority] || "info",
  };
}

interface PriorityActionsClientProps {
  alerts: DashboardAlert[];
  suggestions: WorkflowSuggestion[];
}

export function PriorityActionsClient({ alerts, suggestions }: PriorityActionsClientProps) {
  const [showAll, setShowAll] = useState(false);
  const t = useTranslations("dashboard");

  // Convert both to unified format and merge
  const actions: PriorityAction[] = [
    ...alerts.map((a) => alertToPriorityAction(a, t)),
    ...suggestions.map((s) => workflowToPriorityAction(s, t)),
  ].sort((a, b) => a.priority - b.priority);

  const maxVisible = 5;
  const displayedActions = showAll ? actions : actions.slice(0, maxVisible);
  const hasMore = actions.length > maxVisible;

  if (actions.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
          <svg
            className="h-6 w-6 text-success"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="font-semibold">{t("priorities.allClear")}</h3>
        <p className="text-sm text-muted-foreground">{t("priorities.noActions")}</p>
      </div>
    );
  }

  const severityStyles = {
    urgent: {
      border: "border-destructive/20",
      iconBg: "bg-destructive/10",
      iconColor: "text-destructive",
    },
    warning: {
      border: "border-warning/20",
      iconBg: "bg-warning/10",
      iconColor: "text-warning",
    },
    info: {
      border: "",
      iconBg: "bg-info/10",
      iconColor: "text-info",
    },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t("priorities.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("priorities.subtitle")}</p>
        </div>
        {hasMore && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            {showAll ? (
              <>
                {t("priorities.showLess")}
                <ChevronUp className="h-4 w-4" />
              </>
            ) : (
              <>
                {t("priorities.showAll", { count: actions.length })}
                <ChevronDown className="h-4 w-4" />
              </>
            )}
          </button>
        )}
      </div>
      <div className="space-y-3">
        {displayedActions.map((action) => {
          const styles = severityStyles[action.severity];
          return (
            <div
              key={action.id}
              className={cn(
                "rounded-xl border bg-card p-4 transition-colors hover:bg-accent",
                action.severity === "urgent" && styles.border,
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                    styles.iconBg,
                  )}
                >
                  <div className={styles.iconColor}>{action.icon}</div>
                </div>
                <div className="flex-1 space-y-1">
                  <h3 className="font-medium leading-tight">{action.title}</h3>
                  <p className="text-sm text-muted-foreground">{action.description}</p>
                  {action.amount !== undefined && action.amount > 0 && (
                    <p className="text-sm font-medium">{formatCurrency(action.amount)}</p>
                  )}
                </div>
                <Link
                  href={action.linkTo}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                >
                  {action.actionLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
