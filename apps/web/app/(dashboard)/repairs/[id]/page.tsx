import { renderDocumentDetailPage } from "@/lib/render-document-detail-page";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function RepairOrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  return renderDocumentDetailPage(id, ["repair_order"]);
}
