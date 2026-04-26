import { renderDocumentListPage } from "@/lib/render-document-list-page";

interface PageProps {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>;
}

export default async function OrdersPage({ searchParams }: PageProps) {
  return renderDocumentListPage("order", await searchParams);
}
