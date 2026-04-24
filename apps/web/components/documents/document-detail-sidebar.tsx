import Decimal from "decimal.js";
import Link from "next/link";
import { CheckCircle2, Mail } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PaymentForm } from "./payment-form";
import type { DocumentTypeConfig } from "@/lib/config/document-types";
import { TERMINAL_STATUSES, STATUS } from "@/lib/config/document-types";
import {
  calculateOutstandingAmount,
  type DocumentWithRelations,
} from "@kivvi/core/src/domain/documents";

interface DocumentDetailSidebarProps {
  doc: DocumentWithRelations;
  config: DocumentTypeConfig;
}

export async function DocumentDetailSidebar({
  doc,
  config,
}: DocumentDetailSidebarProps) {
  const t = await getTranslations("documents");
  const tc = await getTranslations("common");

  const outstandingDecimal = config.hasPayments
    ? calculateOutstandingAmount(doc)
    : new Decimal(0);
  const outstanding = outstandingDecimal.toFixed(2);
  const totalPaid = config.hasPayments
    ? new Decimal(doc.total || "0").minus(outstandingDecimal).toFixed(2)
    : "0.00";

  return (
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
                  className={outstandingDecimal.gt(0) ? "text-destructive" : ""}
                >
                  {formatCurrency(outstanding)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Payments */}
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

      {/* Last emailed */}
      {doc.lastEmailedAt && (
        <div className="rounded-xl border bg-card p-6">
          <h2 className="mb-3 font-semibold">{t("emailLog")}</h2>
          <div className="flex items-start gap-2 text-sm">
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="space-y-0.5">
              <p className="text-muted-foreground">
                {t("lastEmailedTo", { email: doc.lastEmailedTo || "—" })}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDate(doc.lastEmailedAt.toISOString())}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Contact */}
      {doc.contact && (
        <div className="rounded-xl border bg-card p-6">
          <h2 className="mb-4 font-semibold">
            {config.contactFilter === "vendor" ? t("vendor") : t("customer")}
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
  );
}
