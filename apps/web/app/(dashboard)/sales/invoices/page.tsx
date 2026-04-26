import { Download } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { renderDocumentListPage } from "@/lib/render-document-list-page";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    page?: string;
  }>;
}

export default async function InvoicesPage({ searchParams }: PageProps) {
  const tc = await getTranslations("common");
  return renderDocumentListPage("invoice", await searchParams, {
    sortBy: "issueDate",
    sortOrder: "desc",
    headerActions: (
      <a
        href="/api/export/invoices"
        className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent transition-colors"
      >
        <Download className="h-4 w-4" />
        {tc("exportCsv")}
      </a>
    ),
  });
}
