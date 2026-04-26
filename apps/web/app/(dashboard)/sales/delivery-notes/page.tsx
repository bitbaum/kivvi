import { renderDocumentListPage } from "@/lib/render-document-list-page";

interface PageProps {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>;
}

export default async function DeliveryNotesPage({ searchParams }: PageProps) {
  return renderDocumentListPage("delivery_note", await searchParams);
}
