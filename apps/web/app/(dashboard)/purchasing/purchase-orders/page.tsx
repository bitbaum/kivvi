import { renderDocumentListPage } from "@/lib/render-document-list-page";

interface PageProps {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>;
}

export default async function PurchaseOrdersPage({ searchParams }: PageProps) {
  return renderDocumentListPage("purchase_order", await searchParams);
}
