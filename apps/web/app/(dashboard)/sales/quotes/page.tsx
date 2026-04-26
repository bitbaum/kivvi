import { renderDocumentListPage } from "@/lib/render-document-list-page";

interface PageProps {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>;
}

export default async function QuotesPage({ searchParams }: PageProps) {
  return renderDocumentListPage("quote", await searchParams);
}
