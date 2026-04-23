"use client";

import { useState } from "react";
import { Loader2, Ban, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import Link from "next/link";
import type { DocumentIssue } from "@kivvi/core/src/domain/data-quality";
import { DOCUMENT_TYPES } from "@/lib/config/document-types";
import { formatCurrency } from "@/lib/utils";
import {
  cancelZeroTotalDocumentsAction,
  cancelStaleDraftsAction,
} from "@/app/actions/data-quality";

/** Locale-neutral document type abbreviations (intake uses i18n key). */
const DOC_TYPE_ABBREVS: Record<string, string> = {
  invoice: "RE",
  purchase_invoice: "ER",
  quote: "AN",
  order: "AU",
  order_confirmation: "AB",
  delivery_note: "LS",
  credit_note: "GU",
  dunning: "MA",
  purchase_order: "BE",
};

export function DocumentIssuesTable({
  issues,
  onFixed,
}: {
  issues: DocumentIssue[];
  onFixed: () => void;
}) {
  const tDQ = useTranslations("dataQuality");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);

  const zeroTotal = issues.filter((i) => i.issue === "zero_total");
  const staleDrafts = issues.filter((i) => i.issue === "stale_draft");
  const noContact = issues.filter((i) => i.issue === "no_contact");
  const noItems = issues.filter((i) => i.issue === "no_items");

  function toggleAll(ids: string[]) {
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = ids.every((id) => next.has(id));
      ids.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
      return next;
    });
  }

  async function cancelSelected(type: "zero_total" | "stale_draft") {
    const toCancel = issues
      .filter((i) => i.issue === type && selected.has(i.id))
      .map((i) => i.id);

    if (toCancel.length === 0) {
      toast.error(tDQ("noneSelected"));
      return;
    }

    setProcessing(true);
    const fn =
      type === "zero_total"
        ? cancelZeroTotalDocumentsAction
        : cancelStaleDraftsAction;
    const result = await fn(toCancel);
    if (result.success) {
      toast.success(tDQ("cancelSuccess", { count: result.data!.cancelled }));
      setSelected(new Set());
      onFixed();
    } else {
      toast.error(result.error);
    }
    setProcessing(false);
  }

  function IssueGroup({
    title,
    items,
    actionLabel,
    onAction,
  }: {
    title: string;
    items: DocumentIssue[];
    actionLabel?: string;
    onAction?: () => void;
  }) {
    if (items.length === 0) return null;
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {title} ({items.length})
          </p>
          {actionLabel && onAction && (
            <button
              onClick={() => toggleAll(items.map((i) => i.id))}
              className="text-xs text-primary hover:underline"
            >
              {tDQ("selectAll")}
            </button>
          )}
        </div>
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <tbody className="divide-y">
              {items.map((doc) => (
                <tr key={doc.id} className="hover:bg-muted/30">
                  {actionLabel && (
                    <td className="pl-3 py-2 w-8">
                      <input
                        type="checkbox"
                        checked={selected.has(doc.id)}
                        onChange={() =>
                          setSelected((prev) => {
                            const next = new Set(prev);
                            next.has(doc.id)
                              ? next.delete(doc.id)
                              : next.add(doc.id);
                            return next;
                          })
                        }
                        className="h-4 w-4 accent-primary"
                      />
                    </td>
                  )}
                  <td className="px-3 py-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {doc.type === "intake"
                        ? tDQ("docType_intake")
                        : (DOC_TYPE_ABBREVS[doc.type] ?? doc.type)}
                    </span>{" "}
                    <span className="font-medium">{doc.number}</span>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {doc.contactName ?? (
                      <span className="italic text-destructive">
                        {tDQ("noContactLabel")}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs">
                    {formatCurrency(doc.total)}
                  </td>
                  <td className="px-3 py-2">
                    <Link
                      href={`${(DOCUMENT_TYPES as Record<string, { basePath: string } | undefined>)[doc.type]?.basePath ?? "/documents"}/${doc.id}`}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {actionLabel && onAction && selected.size > 0 && (
          <button
            onClick={onAction}
            disabled={processing}
            className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/20 disabled:opacity-50 transition-colors"
          >
            {processing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Ban className="h-4 w-4" />
            )}
            {tDQ("cancelSelected", { count: selected.size })}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <IssueGroup
        title={tDQ("groupZeroTotal")}
        items={zeroTotal}
        actionLabel={tDQ("cancelLabel")}
        onAction={() => cancelSelected("zero_total")}
      />
      <IssueGroup title={tDQ("groupNoContact")} items={noContact} />
      <IssueGroup title={tDQ("groupNoItems")} items={noItems} />
      <IssueGroup
        title={tDQ("groupStaleDrafts")}
        items={staleDrafts}
        actionLabel={tDQ("cancelLabel")}
        onAction={() => cancelSelected("stale_draft")}
      />
    </div>
  );
}
