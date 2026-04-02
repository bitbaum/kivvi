import { getSessionOrRedirect } from "@/lib/session";
import { listDocuments } from "@kivvi/core";
import { db } from "@/lib/db";
import { DOCUMENT_TYPES, DEFAULT_PAGE_SIZE } from "@/lib/config/document-types";
import { DocumentList } from "@/components/documents/document-list";
import type { DocumentStatus } from "@kivvi/database";

interface PageProps {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>;
}

export default async function CreditNotesPage({ searchParams }: PageProps) {
  const session = await getSessionOrRedirect();
  const params = await searchParams;
  const config = DOCUMENT_TYPES.credit_note;

  const result = await listDocuments(db, session.user.companyId, {
    type: "credit_note",
    status: params.status as DocumentStatus | undefined,
    search: params.search,
    page: parseInt(params.page || "1", 10),
    pageSize: DEFAULT_PAGE_SIZE,
  });

  return (
    <DocumentList
      config={config}
      result={result}
      search={params.search}
      status={params.status}
    />
  );
}
