import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getDocument } from '@kivvi/core';
import { DOCUMENT_TYPES } from '@/lib/config/document-types';
import { DocumentDetail } from '@/components/documents/document-detail';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DeliveryNoteDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.companyId) redirect('/login');

  const { id } = await params;
  const doc = await getDocument(db, session.user.companyId, id);

  if (!doc || doc.type !== 'delivery_note') notFound();

  return <DocumentDetail doc={doc} config={DOCUMENT_TYPES.delivery_note} />;
}
