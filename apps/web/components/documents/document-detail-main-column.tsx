import { FileText } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { DocumentTypeConfig } from "@/lib/config/document-types";
import type { DocumentWithRelations } from "@kivvi/core/src/domain/documents";

interface DocumentDetailMainColumnProps {
  doc: DocumentWithRelations;
  config: DocumentTypeConfig;
}

export async function DocumentDetailMainColumn({ doc, config }: DocumentDetailMainColumnProps) {
  const t = await getTranslations("documents");
  const tc = await getTranslations("common");

  return (
    <div className="space-y-6 lg:col-span-2">
      {/* Dates */}
      <div className="rounded-xl border bg-card p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">{t("issueDate")}</p>
            <p className="font-medium">{formatDate(doc.issueDate)}</p>
          </div>
          {config.hasDueDate && (
            <div>
              <p className="text-sm text-muted-foreground">{t(config.dueDateLabel)}</p>
              <p className="font-medium">{doc.dueDate ? formatDate(doc.dueDate) : tc("notSet")}</p>
            </div>
          )}
          {config.hasDeliveryDate && (
            <div>
              <p className="text-sm text-muted-foreground">
                {config.hasDueDate ? t("deliveryDate") : t(config.dueDateLabel)}
              </p>
              <p className="font-medium">
                {doc.deliveryDate ? formatDate(doc.deliveryDate) : tc("notSet")}
              </p>
            </div>
          )}
        </div>
        {doc.convertedFrom && (
          <div className="mt-4 border-t pt-4">
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
                <th className="px-4 py-3 text-left font-medium">{tc("description")}</th>
                <th className="px-4 py-3 text-right font-medium">{t("quantity")}</th>
                <th className="px-4 py-3 text-right font-medium">{t("unitPrice")}</th>
                <th className="px-4 py-3 text-right font-medium">{t("discount")}</th>
                <th className="px-4 py-3 text-right font-medium">{t("vat")}</th>
                <th className="px-4 py-3 text-right font-medium">{tc("total")}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {doc.items?.map((item, index) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 text-muted-foreground">{index + 1}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{item.description}</p>
                    {item.product && (
                      <p className="text-xs text-muted-foreground">{item.product.name}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">{parseFloat(item.quantity)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(item.unitPrice)}</td>
                  <td className="px-4 py-3 text-right">
                    {parseFloat(item.discount || "0") > 0
                      ? `${parseFloat(item.discount || "0")}%`
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-right">{parseFloat(item.vatRate || "0")}%</td>
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
        <div className="space-y-4 rounded-xl border bg-card p-6">
          {doc.notes && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">{tc("notes")}</p>
              <p className="mt-1 whitespace-pre-wrap">{doc.notes}</p>
            </div>
          )}
          {doc.internalNotes && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t("internalNotes")}</p>
              <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{doc.internalNotes}</p>
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
  );
}
