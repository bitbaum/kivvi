import Link from "next/link";
import { FileText, Search } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { DOCUMENT_TYPES, STATUS_STYLES, toCamelCase } from "@/lib/config/document-types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";
import { SortableHeader } from "@/components/sortable-header";
import type { listDocuments } from "@kivvi/core";
import type { DocumentType } from "@kivvi/database";

type DocumentListItem = Awaited<ReturnType<typeof listDocuments>>["data"][number];

interface DocumentListTableProps {
  documents: DocumentListItem[];
  selectedType?: DocumentType;
  status?: string;
  search?: string;
  contactId?: string;
  dateFrom?: string;
  dateTo?: string;
  sort: string;
  order: "asc" | "desc";
}

export async function DocumentListTable({
  documents,
  selectedType,
  status,
  search,
  contactId,
  dateFrom,
  dateTo,
  sort,
  order,
}: DocumentListTableProps) {
  const td = await getTranslations("documents");
  const ts = await getTranslations("status");
  const tc = await getTranslations("common");

  function buildSortUrl(s: string, o: "asc" | "desc"): string {
    const p = new URLSearchParams();
    if (selectedType) p.set("type", selectedType);
    if (status) p.set("status", status);
    if (search) p.set("search", search);
    if (contactId) p.set("contactId", contactId);
    if (dateFrom) p.set("dateFrom", dateFrom);
    if (dateTo) p.set("dateTo", dateTo);
    p.set("sort", s);
    p.set("order", o);
    return `/documents?${p.toString()}`;
  }

  if (documents.length === 0) {
    return (
      <EmptyState
        icon={search || status || dateFrom || dateTo ? Search : FileText}
        title={
          selectedType
            ? td("noDocumentsFound", {
                type: td(DOCUMENT_TYPES[selectedType].labelPlural),
              })
            : td("noDocumentsFound", { type: tc("documents").toLowerCase() })
        }
        description={
          search || status || dateFrom || dateTo
            ? td("adjustFilters")
            : td("createFirst", { type: td("invoice") })
        }
        actionLabel={
          !(search || status || dateFrom || dateTo)
            ? td("createNew", { type: td("invoice") })
            : undefined
        }
        actionHref={
          !(search || status || dateFrom || dateTo) ? "/documents/new?type=invoice" : undefined
        }
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50 text-left text-muted-foreground">
            <th className="px-4 py-3 font-medium">
              <SortableHeader
                label={tc("number")}
                field="number"
                currentSort={sort}
                currentOrder={order}
                href={buildSortUrl("number", sort === "number" && order === "asc" ? "desc" : "asc")}
              />
            </th>
            {!selectedType && (
              <th className="hidden px-4 py-3 font-medium sm:table-cell">{tc("type")}</th>
            )}
            <th className="px-4 py-3 font-medium">{td("customer")}</th>
            <th className="px-4 py-3 text-right font-medium">
              <SortableHeader
                label={tc("total")}
                field="total"
                currentSort={sort}
                currentOrder={order}
                href={buildSortUrl("total", sort === "total" && order === "asc" ? "desc" : "asc")}
              />
            </th>
            <th className="px-4 py-3 font-medium">{tc("status")}</th>
            <th className="hidden px-4 py-3 font-medium md:table-cell">
              <SortableHeader
                label={tc("date")}
                field="issueDate"
                currentSort={sort}
                currentOrder={order}
                href={buildSortUrl(
                  "issueDate",
                  sort === "issueDate" && order === "asc" ? "desc" : "asc",
                )}
              />
            </th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => {
            const typeConfig = DOCUMENT_TYPES[doc.type];
            const detailHref = `${typeConfig.basePath}/${doc.id}`;
            return (
              <tr key={doc.id} className="border-b transition-colors hover:bg-muted/50">
                <td className="px-4 py-3">
                  <Link href={detailHref} className="font-medium text-primary hover:underline">
                    {doc.number}
                  </Link>
                </td>
                {!selectedType && (
                  <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                    {td(typeConfig.label)}
                  </td>
                )}
                <td className="px-4 py-3">
                  {doc.contact?.name || <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  {doc.total ? formatCurrency(doc.total) : "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                      STATUS_STYLES[doc.status] || "bg-neutral/10 text-neutral",
                    )}
                  >
                    {ts(toCamelCase(doc.status))}
                  </span>
                </td>
                <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                  {formatDate(doc.issueDate)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
