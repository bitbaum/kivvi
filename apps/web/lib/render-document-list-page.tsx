import type { ReactNode } from "react";
import { listDocuments } from "@kivvi/core";
import type { DocumentStatus, DocumentType } from "@kivvi/database";
import { db } from "@/lib/db";
import { getSessionOrRedirect } from "@/lib/session";
import { DOCUMENT_TYPES, DEFAULT_PAGE_SIZE } from "@/lib/config/document-types";
import { DocumentList } from "@/components/documents/document-list";

interface SearchParams {
  search?: string;
  status?: string;
  page?: string;
}

interface RenderOptions {
  /**
   * Optional sort override. Most document lists sort by document number
   * (default in listDocuments); invoices sort by issueDate desc.
   */
  sortBy?: "issueDate" | "number";
  sortOrder?: "asc" | "desc";
  /** Header actions slot (e.g. an Export-CSV link on the invoices list) */
  headerActions?: ReactNode;
}

/**
 * Shared loader+renderer for document-list pages
 * (sales/{quotes,orders,invoices,delivery-notes,credit-notes},
 *  purchasing/{purchase-orders,purchase-invoices}, sales/dunning, …).
 *
 * Each route's page.tsx used to repeat the same 30-line block of:
 *   getSessionOrRedirect → parse searchParams → look up DOCUMENT_TYPES
 *   → call listDocuments → render <DocumentList>.
 * Centralised here so the only thing each page contributes is its
 * `DocumentType` (and any rare per-page tweaks like sort or header
 * actions).
 */
export async function renderDocumentListPage(
  type: DocumentType,
  searchParams: SearchParams,
  options: RenderOptions = {},
) {
  const session = await getSessionOrRedirect();
  const config = DOCUMENT_TYPES[type];
  const result = await listDocuments(db, session.user.companyId, {
    type,
    status: searchParams.status as DocumentStatus | undefined,
    search: searchParams.search,
    page: parseInt(searchParams.page || "1", 10),
    pageSize: DEFAULT_PAGE_SIZE,
    sortBy: options.sortBy,
    sortOrder: options.sortOrder,
  });
  return (
    <DocumentList
      config={config}
      result={result}
      search={searchParams.search}
      status={searchParams.status}
      headerActions={options.headerActions}
    />
  );
}
