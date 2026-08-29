import { FileText } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { STATUS_STYLES as DOC_STATUS_STYLES, toCamelCase } from "@/lib/config/document-types";
import type { getProjectDocuments } from "@kivvi/core";

type ProjectDocument = Awaited<ReturnType<typeof getProjectDocuments>>[number];

interface ProjectLinkedDocumentsProps {
  documents: ProjectDocument[];
}

export async function ProjectLinkedDocuments({ documents }: ProjectLinkedDocumentsProps) {
  const t = await getTranslations("projects");
  const tc = await getTranslations("common");
  const td = await getTranslations("documents");
  const ts = await getTranslations("status");

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center gap-2 border-b px-6 py-4">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-semibold">{t("linkedDocuments")}</h2>
      </div>
      {documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <FileText className="h-8 w-8 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">{t("noLinkedDocuments")}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="px-4 py-3 text-left font-medium">{tc("type")}</th>
                <th className="px-4 py-3 text-left font-medium">{tc("number")}</th>
                <th className="px-4 py-3 text-left font-medium">{tc("name")}</th>
                <th className="px-4 py-3 text-left font-medium">{tc("date")}</th>
                <th className="px-4 py-3 text-left font-medium">{tc("status")}</th>
                <th className="px-4 py-3 text-right font-medium">{tc("total")}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {documents.map((doc) => (
                <tr key={doc.id} className="transition-colors hover:bg-muted/50">
                  <td className="whitespace-nowrap px-4 py-3">{td(toCamelCase(doc.type))}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono">{doc.number}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {doc.contactName || "-"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {formatDate(doc.issueDate)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span
                      className={cn(
                        "inline-block rounded-full px-2 py-0.5 text-xs font-medium",
                        DOC_STATUS_STYLES[doc.status] || DOC_STATUS_STYLES.draft,
                      )}
                    >
                      {ts(toCamelCase(doc.status))}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-medium">
                    {formatCurrency(doc.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
