"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Sparkles, Loader2, AlertCircle } from "lucide-react";
import { ActionPreviewCard } from "./action-preview-card";
import type {
  CommandBarAction,
  CommandBarToolResult,
} from "@/hooks/use-command-bar-ai";

/** Friendly tool name labels */
const TOOL_LABELS: Record<string, string> = {
  search_customers: "Searching contacts",
  search_invoices: "Searching invoices",
  search_products: "Searching products",
  search_projects: "Searching projects",
  prepare_document: "Preparing document",
  create_document: "Creating document",
  get_invoice_details: "Loading invoice",
  get_customer_details: "Loading contact",
  get_financial_summary: "Loading financials",
  record_payment: "Recording payment",
  update_document_status: "Updating status",
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

  return (
    <div className="border-t p-3 space-y-2">
      {/* Processing indicator */}
      {isProcessing && toolProgress && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>{TOOL_LABELS[toolProgress] || toolProgress}...</span>
        </div>
      )}

      {/* Tool result previews */}
      {toolResults.map((tr, i) => (
        <ActionPreviewCard key={i} toolResult={tr} />
      ))}

      {/* AI message */}
      {message && (
        <div className="flex items-start gap-2 text-sm">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="text-foreground">{message}</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Action buttons */}
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

      {/* Processing with no content yet */}
      {isProcessing &&
        !toolProgress &&
        !message &&
        toolResults.length === 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>{t("aiThinking")}</span>
          </div>
        )}
    </div>
  );
}
