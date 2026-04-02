import { notFound } from "next/navigation";
import { getSessionOrRedirect } from "@/lib/session";
import { db } from "@/lib/db";
import { getDocument } from "@kivvi/core";
import { DOCUMENT_TYPES } from "@/lib/config/document-types";
import { DocumentDetail } from "@/components/documents/document-detail";
import { isValidUUID } from "@/lib/utils";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function QuoteDetailPage({ params }: PageProps) {
  const session = await getSessionOrRedirect();
  const { id } = await params;
  if (!isValidUUID(id)) notFound();
  const doc = await getDocument(db, session.user.companyId, id);

  if (!doc || doc.type !== "quote") notFound();

  return <DocumentDetail doc={doc} config={DOCUMENT_TYPES.quote} />;
}
