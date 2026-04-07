import Link from "next/link";
import { Package } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getSessionOrRedirect } from "@/lib/session";
import { listDocuments, getInventoryItemCounts } from "@kivvi/core";
import { db } from "@/lib/db";
import { DOCUMENT_TYPES, DEFAULT_PAGE_SIZE } from "@/lib/config/document-types";
import { DocumentList } from "@/components/documents/document-list";
import type { DocumentStatus } from "@kivvi/database";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    page?: string;
  }>;
}

export default async function IntakePage({ searchParams }: PageProps) {
  const session = await getSessionOrRedirect();
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const status = params.status as DocumentStatus | undefined;
  const search = params.search;

  const result = await listDocuments(db, session.user.companyId, {
    type: "intake",
    status,
    search,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
    sortBy: "issueDate",
    sortOrder: "desc",
  });

  const tc = await getTranslations("common");
  const counts = await getInventoryItemCounts(db, session.user.companyId);
  const totalItems = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <DocumentList
      config={DOCUMENT_TYPES.intake}
      result={result}
      search={search}
      status={status}
      headerActions={
        <Link
          href="/intake/items"
          className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent transition-colors"
        >
          <Package className="h-4 w-4" />
          {totalItems} {tc("items")}
        </Link>
      }
    />
  );
}
