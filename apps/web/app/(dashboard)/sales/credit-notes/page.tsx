import { renderDocumentListPage } from "@/lib/render-document-list-page";

interface PageProps {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>;
}

export default async function CreditNotesPage({ searchParams }: PageProps) {
  return renderDocumentListPage("credit_note", await searchParams);
}
