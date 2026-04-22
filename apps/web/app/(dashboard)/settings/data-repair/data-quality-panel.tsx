"use client";

import { useState } from "react";
import {
  Users,
  FileText,
  Package,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ChevronDown,
  ChevronRight,
  Merge,
  Ban,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type {
  DataQualityReport,
  DuplicateContactGroup,
  DocumentIssue,
  ContactIssue,
  ProductIssue,
} from "@kivvi/core/src/domain/data-quality";
import { DOCUMENT_TYPES } from "@/lib/config/document-types";
import { formatCurrency } from "@/lib/utils";
import {
  mergeContactsAction,
  cancelZeroTotalDocumentsAction,
  cancelStaleDraftsAction,
  reactivateContactAction,
  getDataQualityReportAction,
} from "@/app/actions/data-quality";

// ============================================================================
// DOC TYPE LABELS (locale-neutral abbreviations; intake translated via i18n)
// ============================================================================

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

// ============================================================================
// SECTION WRAPPER
// ============================================================================

function Section({
  icon: Icon,
  title,
  count,
  children,
  defaultOpen = false,
}: {
  icon: React.ElementType;
  title: string;
  count: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const tDQ = useTranslations("dataQuality");
  const [open, setOpen] = useState(defaultOpen || count > 0);
  const hasIssues = count > 0;

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 p-5 text-left hover:bg-muted/30 transition-colors"
      >
        <div
          className={`rounded-lg border p-2 ${hasIssues ? "border-warning/30 bg-warning/10" : "bg-background"}`}
        >
          <Icon
            className={`h-4 w-4 ${hasIssues ? "text-warning" : "text-muted-foreground"}`}
          />
        </div>
        <div className="flex-1">
          <span className="font-semibold">{title}</span>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            hasIssues
              ? "bg-warning/15 text-warning"
              : "bg-success/15 text-success"
          }`}
        >
          {hasIssues
            ? tDQ("sectionBadgeIssues", { count })
            : tDQ("sectionBadgeOk")}
        </span>
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {open && <div className="border-t p-5">{children}</div>}
    </div>
  );
}

// ============================================================================
// DUPLICATE CONTACTS
// ============================================================================

function DuplicateGroup({
  group,
  onMerged,
}: {
  group: DuplicateContactGroup;
  onMerged: () => void;
}) {
  const tDQ = useTranslations("dataQuality");
  const [primaryId, setPrimaryId] = useState(
    group.contacts.reduce((a, b) => (b.documentCount > a.documentCount ? b : a))
      .id,
  );
  const [merging, setMerging] = useState(false);

  const duplicates = group.contacts.filter((c) => c.id !== primaryId);

  async function handleMerge(duplicateId: string) {
    setMerging(true);
    const result = await mergeContactsAction(primaryId, duplicateId);
    if (result.success) {
      toast.success(
        tDQ("mergeSuccess", { count: result.data!.documentsReassigned }),
      );
      onMerged();
    } else {
      toast.error(result.error);
    }
    setMerging(false);
  }

  return (
    <div className="rounded-lg border bg-background p-4 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {tDQ("duplicateName")} &ldquo;{group.normalizedName}&rdquo;
      </p>
      <div className="space-y-2">
        {group.contacts.map((c) => {
          const isPrimary = c.id === primaryId;
          return (
            <div
              key={c.id}
              className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                isPrimary ? "border-primary/40 bg-primary/5" : ""
              }`}
            >
              <input
                type="radio"
                name={`primary-${group.normalizedName}`}
                checked={isPrimary}
                onChange={() => setPrimaryId(c.id)}
                className="h-4 w-4 accent-primary"
                title={tDQ("keepPrimary")}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{c.name}</p>
                <p className="text-xs text-muted-foreground">
                  {c.contactNumber ?? "–"} · {c.type} ·{" "}
                  {c.email ?? tDQ("noEmail")} ·{" "}
                  {tDQ("docCount", { count: c.documentCount })}
                </p>
              </div>
              {isPrimary ? (
                <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
                  {tDQ("keep")}
                </span>
              ) : (
                <button
                  onClick={() => handleMerge(c.id)}
                  disabled={merging}
                  className="shrink-0 flex items-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/20 disabled:opacity-50 transition-colors"
                >
                  {merging ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Merge className="h-3 w-3" />
                  )}
                  {tDQ("merge")}
                </button>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">{tDQ("mergeDescription")}</p>
    </div>
  );
}

// ============================================================================
// DOCUMENT ISSUES TABLE
// ============================================================================

function DocumentIssuesTable({
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

// ============================================================================
// CONTACT ISSUES TABLE
// ============================================================================

function ContactIssuesTable({
  issues,
  onFixed,
}: {
  issues: ContactIssue[];
  onFixed: () => void;
}) {
  const tDQ = useTranslations("dataQuality");
  const [reactivating, setReactivating] = useState<string | null>(null);

  async function handleReactivate(id: string) {
    setReactivating(id);
    const result = await reactivateContactAction(id);
    if (result.success) {
      toast.success(tDQ("contactReactivated"));
      onFixed();
    } else {
      toast.error(result.error);
    }
    setReactivating(null);
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full text-sm">
        <tbody className="divide-y">
          {issues.map((c) => (
            <tr key={`${c.id}-${c.issue}`} className="hover:bg-muted/30">
              <td className="px-4 py-3">
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">
                  {c.contactNumber ?? "–"} · {c.type}
                </p>
              </td>
              <td className="px-4 py-3 text-sm text-warning">
                {tDQ(`contactIssue_${c.issue}` as Parameters<typeof tDQ>[0])}
              </td>
              <td className="px-4 py-3 text-right">
                {c.issue === "inactive_with_open_docs" ? (
                  <button
                    onClick={() => handleReactivate(c.id)}
                    disabled={reactivating === c.id}
                    className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50 transition-colors ml-auto"
                  >
                    {reactivating === c.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3" />
                    )}
                    {tDQ("reactivate")}
                  </button>
                ) : (
                  <Link
                    href={`/contacts/${c.id}`}
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {tDQ("editLink")}
                  </Link>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// PRODUCT ISSUES TABLE
// ============================================================================

function ProductIssuesTable({ issues }: { issues: ProductIssue[] }) {
  const tDQ = useTranslations("dataQuality");

  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full text-sm">
        <tbody className="divide-y">
          {issues.map((p) => (
            <tr key={`${p.id}-${p.issue}`} className="hover:bg-muted/30">
              <td className="px-4 py-3">
                <p className="font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground font-mono">
                  {p.articleNumber ?? "–"}
                </p>
              </td>
              <td className="px-4 py-3 text-sm text-warning">
                {tDQ(`productIssue_${p.issue}` as Parameters<typeof tDQ>[0])}
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/products/${p.id}`}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  {tDQ("editLink")}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// MAIN PANEL
// ============================================================================

export function DataQualityPanel({
  initialReport,
}: {
  initialReport: DataQualityReport | null;
}) {
  const tDQ = useTranslations("dataQuality");
  const [report, setReport] = useState<DataQualityReport | null>(initialReport);
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    setRefreshing(true);
    const result = await getDataQualityReportAction();
    if (result.success) setReport(result.data!);
    setRefreshing(false);
  }

  if (!report) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
        <AlertTriangle className="mx-auto mb-3 h-8 w-8" />
        <p>{tDQ("loadError")}</p>
      </div>
    );
  }

  const { summary } = report;

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {summary.total === 0 ? (
            <CheckCircle2 className="h-5 w-5 text-success" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-warning" />
          )}
          <span className="font-medium">
            {summary.total === 0
              ? tDQ("noProblemsFound")
              : tDQ("problemsFound", { count: summary.total })}
          </span>
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50 transition-colors"
        >
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {tDQ("checkAgain")}
        </button>
      </div>

      {/* Duplicates */}
      <Section
        icon={Users}
        title={tDQ("duplicateContactsTitle")}
        count={summary.duplicateContactGroups}
      >
        {report.duplicateContactGroups.length === 0 ? (
          <p className="text-sm text-muted-foreground">{tDQ("noDuplicates")}</p>
        ) : (
          <div className="space-y-4">
            {report.duplicateContactGroups.map((group) => (
              <DuplicateGroup
                key={group.normalizedName}
                group={group}
                onMerged={refresh}
              />
            ))}
          </div>
        )}
      </Section>

      {/* Contact issues */}
      <Section
        icon={Users}
        title={tDQ("contactIssuesTitle")}
        count={summary.contactIssues}
      >
        {report.contactIssues.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {tDQ("allContactsOk")}
          </p>
        ) : (
          <ContactIssuesTable issues={report.contactIssues} onFixed={refresh} />
        )}
      </Section>

      {/* Document issues */}
      <Section
        icon={FileText}
        title={tDQ("documentIssuesTitle")}
        count={summary.documentIssues}
      >
        {report.documentIssues.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {tDQ("allDocumentsOk")}
          </p>
        ) : (
          <DocumentIssuesTable
            issues={report.documentIssues}
            onFixed={refresh}
          />
        )}
      </Section>

      {/* Product issues */}
      <Section
        icon={Package}
        title={tDQ("productIssuesTitle")}
        count={summary.productIssues}
      >
        {report.productIssues.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {tDQ("allProductsOk")}
          </p>
        ) : (
          <ProductIssuesTable issues={report.productIssues} />
        )}
      </Section>
    </div>
  );
}
