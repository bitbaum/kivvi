import Decimal from "decimal.js";
import { ArrowLeft, Pencil, AlertTriangle, Download } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { formatCurrency, formatDate } from "@/lib/utils";
import { StatusBadge } from "./status-badge";
import { DocumentStatusActions, DocumentConvertActions } from "./document-actions";
import { DocumentDeleteButton } from "./document-delete";
import { SendEmailButton } from "./send-email-dialog";
import { DocumentDuplicateButton } from "./document-duplicate";
import { PrintButton } from "./print-button";
import { SendAndMarkButton } from "./send-and-mark-button";
import { DocumentDetailMainColumn } from "./document-detail-main-column";
import { DocumentDetailSidebar } from "./document-detail-sidebar";
import type { DocumentTypeConfig } from "@/lib/config/document-types";
import { TERMINAL_STATUSES, STATUS } from "@/lib/config/document-types";
import {
  getOverdueInfo,
  calculateOutstandingAmount,
  type DocumentWithRelations,
} from "@kivvi/core/src/domain/documents";
import { RecentItemTracker } from "@/components/recent-item-tracker";
import type { RecentItem } from "@/hooks/use-recent-items";

interface DocumentDetailProps {
  doc: DocumentWithRelations;
  config: DocumentTypeConfig;
}

// Map document types to recent-item types (dunning/intake not tracked)
const DOC_TYPE_TO_RECENT: Partial<Record<string, RecentItem["type"]>> = {
  invoice: "invoice",
  quote: "quote",
  order: "order",
  order_confirmation: "order",
  delivery_note: "delivery_note",
  credit_note: "credit_note",
  purchase_order: "purchase_order",
  purchase_invoice: "purchase_invoice",
};

export async function DocumentDetail({ doc, config }: DocumentDetailProps) {
  const t = await getTranslations("documents");
  const tc = await getTranslations("common");

  const outstandingDecimal = config.hasPayments ? calculateOutstandingAmount(doc) : new Decimal(0);
  const outstanding = outstandingDecimal.toFixed(2);
  const { isOverdue, daysOverdue } = config.hasPayments
    ? getOverdueInfo(doc)
    : { isOverdue: false, daysOverdue: 0 };

  const recentType = DOC_TYPE_TO_RECENT[doc.type];

  return (
    <div className="space-y-6">
      {recentType && (
        <RecentItemTracker
          id={doc.id}
          type={recentType}
          label={doc.number}
          href={`${config.basePath}/${doc.id}`}
        />
      )}
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={config.basePath}
            className="min-h-[44px] min-w-[44px] rounded-lg p-2 hover:bg-muted"
            aria-label={tc("back")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{doc.number}</h1>
              <StatusBadge status={doc.status} isOverdue={!!isOverdue} size="md" />
            </div>
            {doc.contact && (
              <Link
                href={`/contacts/${doc.contact.id}`}
                className="text-muted-foreground hover:underline"
              >
                {doc.contact.name}
              </Link>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 max-sm:w-full max-sm:justify-start">
          <a
            href={`/api/documents/${doc.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted"
          >
            <Download className="h-4 w-4" />
            PDF
          </a>
          <PrintButton documentId={doc.id} />
          <DocumentDuplicateButton documentId={doc.id} documentType={doc.type} />
          {!TERMINAL_STATUSES.includes(doc.status) && doc.status !== STATUS.DRAFT && (
            <SendEmailButton documentId={doc.id} defaultEmail={doc.contact?.email || undefined} />
          )}
          {doc.status === STATUS.DRAFT && (
            <>
              <Link
                href={`${config.basePath}/${doc.id}/edit`}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted"
              >
                <Pencil className="h-4 w-4" />
                {tc("edit")}
              </Link>
              <SendAndMarkButton
                documentId={doc.id}
                contactEmail={doc.contact?.email || undefined}
              />
            </>
          )}
          <DocumentStatusActions documentId={doc.id} currentStatus={doc.status} config={config} />
          {!TERMINAL_STATUSES.includes(doc.status) && doc.status !== STATUS.DRAFT && (
            <DocumentConvertActions documentId={doc.id} config={config} />
          )}
          {doc.status === STATUS.DRAFT && (
            <DocumentDeleteButton documentId={doc.id} redirectTo={config.basePath} />
          )}
        </div>
      </div>

      {/* Overdue alert */}
      {isOverdue && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <div>
            <p className="font-medium text-destructive">
              {t("overdueAlert", { type: t(config.label), days: daysOverdue })}
            </p>
            <p className="text-sm text-destructive/80">
              {t("overdueDetail", {
                date: doc.dueDate ? formatDate(doc.dueDate) : "",
                amount: formatCurrency(outstanding),
              })}
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <DocumentDetailMainColumn doc={doc} config={config} />
        <DocumentDetailSidebar doc={doc} config={config} />
      </div>
    </div>
  );
}
