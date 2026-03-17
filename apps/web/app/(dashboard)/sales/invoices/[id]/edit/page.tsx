import { notFound } from "next/navigation";
import { EditDocumentPage } from "@/components/documents/edit-document-page";
import { isValidUUID } from "@/lib/utils";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditInvoicePage({ params }: PageProps) {
  const { id } = await params;
  if (!isValidUUID(id)) notFound();
  return <EditDocumentPage documentId={id} allowedTypes={["invoice"]} />;
}
