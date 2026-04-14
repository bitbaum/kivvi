import Decimal from "decimal.js";
import {
  ArrowLeft,
  Pencil,
  AlertTriangle,
  CheckCircle2,
  Download,
  Printer,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { formatCurrency, formatDate } from "@/lib/utils";
import { StatusBadge } from "./status-badge";
import {
  DocumentStatusActions,
  DocumentConvertActions,
} from "./document-actions";
import { DocumentDeleteButton } from "./document-delete";
import { SendEmailButton } from "./send-email-dialog";
import { PaymentForm } from "./payment-form";
import { DocumentDuplicateButton } from "./document-duplicate";
import { PrintButton } from "./print-button";
import { SendAndMarkButton } from "./send-and-mark-button";
import type { DocumentTypeConfig } from "@/lib/config/document-types";
import { TERMINAL_STATUSES, STATUS } from "@/lib/config/document-types";
import {
  getOverdueInfo,
  calculateOutstandingAmount,
  type DocumentWithRelations,
} from "@kivvi/core/src/domain/documents";

interface DocumentDetailProps {
  doc: DocumentWithRelations;
  config: DocumentTypeConfig;
}

export async function DocumentDetail({ doc, config }: DocumentDetailProps) {
  const t = await getTranslations("documents");
  const tc = await getTranslations("common");

  const outstandingDecimal = config.hasPayments
    ? calculateOutstandingAmount(doc)
    : new Decimal(0);
  const outstanding = outstandingDecimal.toFixed(2);
  const totalPaid = config.hasPayments
    ? new Decimal(doc.total || "0").minus(outstandingDecimal).toFixed(2)
    : "0.00";
  const { isOverdue, daysOverdue } = config.hasPayments
    ? getOverdueInfo(doc)
    : { isOverdue: false, daysOverdue: 0 };

  return (
    <div className="space-y-6">
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
              <StatusBadge
                status={doc.status}
                isOverdue={!!isOverdue}
                size="md"
              />
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
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted min-h-[44px]"
          >
            <Download className="h-4 w-4" />
            PDF
          </a>
          <PrintButton documentId={doc.id} />
          <DocumentDuplicateButton
            documentId={doc.id}
            documentType={doc.type}
          />
          {!TERMINAL_STATUSES.includes(doc.status) && doc.status !== STATUS.DRAFT && (
            <SendEmailButton
              documentId={doc.id}
              defaultEmail={doc.contact?.email || undefined}
            />
          )}
          {doc.status === STATUS.DRAFT && (
            <>
              <Link
                href={`${config.basePath}/${doc.id}/edit`}
                className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted min-h-[44px]"
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
          <DocumentStatusActions
            documentId={doc.id}
            currentStatus={doc.status}
            config={config}
          />
          {!TERMINAL_STATUSES.includes(doc.status) && doc.status !== STATUS.DRAFT && (
            <DocumentConvertActions documentId={doc.id} config={config} />
          )}
          {doc.status === STATUS.DRAFT && (
            <DocumentDeleteButton
              documentId={doc.id}
              redirectTo={config.basePath}
            />
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
                date: formatDate(doc.dueDate!),
                amount: formatCurrency(outstanding),
              })}
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dates */}
          <div className="rounded-xl border bg-card p-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("issueDate")}
                </p>
                <p className="font-medium">{formatDate(doc.issueDate)}</p>
              </div>
              {config.hasDueDate && (
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t(config.dueDateLabel)}
                  </p>
                  <p className="font-medium">
                    {doc.dueDate ? formatDate(doc.dueDate) : tc("notSet")}
                  </p>
                </div>
              )}
              {config.hasDeliveryDate && (
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t("deliveryDate")}
                  </p>
                  <p className="font-medium">
                    {doc.deliveryDate
                      ? formatDate(doc.deliveryDate)
                      : tc("notSet")}
                  </p>
                </div>
              )}
            </div>
            {doc.convertedFrom && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  {t("sourceDocument")}{" "}
                  <Link
                    href={`${config.basePath}/${doc.convertedFrom.id}`}
                    className="text-primary hover:underline"
                  >
                    {doc.convertedFrom.number}
                  </Link>
                </p>
              </div>
            )}
          </div>

          {/* Line items */}
          <div className="rounded-xl border bg-card">
            <div className="border-b p-4">
              <h2 className="font-semibold">{t("lineItems")}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="px-4 py-3 text-left font-medium">#</th>
                    <th className="px-4 py-3 text-left font-medium">
                      {tc("description")}
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      {t("quantity")}
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      {t("unitPrice")}
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      {t("discount")}
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      {t("vat")}
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      {tc("total")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {doc.items?.map((item, index) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 text-muted-foreground">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{item.description}</p>
                        {item.product && (
                          <p className="text-xs text-muted-foreground">
                            {item.product.name}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {parseFloat(item.quantity)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {parseFloat(item.discount || "0") > 0
                          ? `${parseFloat(item.discount || "0")}%`
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {parseFloat(item.vatRate || "0")}%
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatCurrency(item.total || "0")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes */}
          {(doc.notes || doc.internalNotes) && (
            <div className="rounded-xl border bg-card p-6 space-y-4">
              {doc.notes && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {tc("notes")}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{doc.notes}</p>
                </div>
              )}
              {doc.internalNotes && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {t("internalNotes")}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                    {doc.internalNotes}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* PDF Preview */}
          <div className="rounded-xl border bg-card">
            <div className="flex items-center gap-2 border-b p-4">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold">{t("pdfPreview")}</h2>
            </div>
            <div className="p-4">
              <iframe
                src={`/api/documents/${doc.id}/pdf`}
                className="h-[400px] w-full rounded-lg border sm:h-[600px]"
                title={`${doc.number} PDF`}
              />
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Totals */}
          <div className="rounded-xl border bg-card p-6">
            <h2 className="mb-4 font-semibold">{t("summary")}</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{tc("subtotal")}</span>
                <span>{formatCurrency(doc.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("vat")}</span>
                <span>{formatCurrency(doc.vatAmount)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 text-base font-bold">
                <span>{tc("total")}</span>
                <span>{formatCurrency(doc.total)}</span>
              </div>
              {config.hasPayments && doc.payments?.length > 0 && (
                <>
                  <div className="flex justify-between text-success">
                    <span>{t("paidLabel")}</span>
                    <span>-{formatCurrency(totalPaid)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 font-bold">
                    <span>{t("outstanding")}</span>
                    <span
                      className={
                        outstandingDecimal.gt(0) ? "text-destructive" : ""
                      }
                    >
                      {formatCurrency(outstanding)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Payments section */}
          {config.hasPayments && (
            <div className="rounded-xl border bg-card p-6">
              <h2 className="mb-4 font-semibold">{t("payments")}</h2>
              {!doc.payments || doc.payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("noPaymentsYet")}
                </p>
              ) : (
                <div className="space-y-3">
                  {doc.payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-start justify-between text-sm"
                    >
                      <div>
                        <p className="font-medium">
                          {formatCurrency(payment.amount)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(payment.date)}
                          {payment.method &&
                            ` · ${payment.method.replace("_", " ")}`}
                        </p>
                      </div>
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    </div>
                  ))}
                </div>
              )}
              {!TERMINAL_STATUSES.includes(doc.status) &&
                doc.status !== STATUS.DRAFT && (
                  <div className="mt-4 border-t pt-4">
                    <PaymentForm
                      documentId={doc.id}
                      outstanding={outstanding}
                      currency={doc.currency}
                    />
                  </div>
                )}
            </div>
          )}

          {/* Contact card */}
          {doc.contact && (
            <div className="rounded-xl border bg-card p-6">
              <h2 className="mb-4 font-semibold">
                {config.contactFilter === "vendor"
                  ? t("vendor")
                  : t("customer")}
              </h2>
              <div className="space-y-1 text-sm">
                <p className="font-medium">{doc.contact.name}</p>
                {doc.contact.email && (
                  <p className="text-muted-foreground">{doc.contact.email}</p>
                )}
                {doc.contact.address && (
                  <p className="text-muted-foreground">{doc.contact.address}</p>
                )}
                {(doc.contact.postalCode || doc.contact.city) && (
                  <p className="text-muted-foreground">
                    {doc.contact.postalCode} {doc.contact.city}
                  </p>
                )}
              </div>
              <Link
                href={`/contacts/${doc.contact.id}`}
                className="mt-3 inline-block text-sm text-primary hover:underline"
              >
                {t("viewContact")}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
