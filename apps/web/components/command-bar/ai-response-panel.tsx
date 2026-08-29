"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Sparkles, Loader2, AlertCircle } from "lucide-react";
import { ActionPreviewCard } from "./action-preview-card";
import type { CommandBarAction, CommandBarToolResult } from "@/hooks/use-command-bar-ai";

/** Map tool names to i18n keys in commandPalette namespace */
const TOOL_LABEL_KEYS: Record<string, string> = {
  search_customers: "toolSearchingContacts",
  search_invoices: "toolSearchingInvoices",
  search_products: "toolSearchingProducts",
  search_projects: "toolSearchingProjects",
  prepare_document: "toolPreparingDocument",
  create_document: "toolCreatingDocument",
  get_invoice_details: "toolLoadingInvoice",
  get_customer_details: "toolLoadingContact",
  get_financial_summary: "toolLoadingFinancials",
  record_payment: "toolRecordingPayment",
  update_document_status: "toolUpdatingStatus",
  search_inventory: "toolSearchingInventory",
  get_inventory_dashboard: "toolLoadingDashboard",
};

interface AIResponsePanelProps {
  isProcessing: boolean;
  message: string;
  actions: CommandBarAction[];
  toolProgress: string | null;
  toolResults: CommandBarToolResult[];
  error: string | null;
  onClose: () => void;
}

export function AIResponsePanel({
  isProcessing,
  message,
  actions,
  toolProgress,
  toolResults,
  error,
  onClose,
}: AIResponsePanelProps) {
  const router = useRouter();
  const t = useTranslations("commandPalette");

  function handleAction(action: CommandBarAction) {
    const url = action.params?.url as string | undefined;
    if (!url) return;
    onClose();
    router.push(url);
  }

  const toolLabel = toolProgress ? t(TOOL_LABEL_KEYS[toolProgress] || toolProgress) : null;

  return (
    <div className="border-t p-3 space-y-2">
      {isProcessing && toolLabel && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>{toolLabel}...</span>
        </div>
      )}

      {toolResults.map((tr, i) => (
        <ActionPreviewCard key={i} toolResult={tr} />
      ))}

      {message && (
        <div className="flex items-start gap-2 text-sm">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
          <span className="text-foreground">{message}</span>
        </div>
      )}

      {error && (
        <div role="alert" className="flex items-start gap-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {actions.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {actions.map((action, i) => (
            <button
              key={i}
              onClick={() => handleAction(action)}
              className={
                action.variant === "primary"
                  ? "inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  : action.variant === "destructive"
                    ? "inline-flex items-center gap-1.5 rounded-lg bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
                    : "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted"
              }
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      {isProcessing && !toolProgress && !message && toolResults.length === 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>{t("aiThinking")}</span>
        </div>
      )}
    </div>
  );
}
