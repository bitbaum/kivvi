import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { listDocuments } from '@kivvi/core';
import { db } from '@/lib/db';
import { DOCUMENT_TYPES } from '@/lib/config/document-types';
import { DocumentList } from '@/components/documents/document-list';
import type { DocumentStatus } from '@kivvi/database';

interface PageProps {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>;
}

export default async function DeliveryNotesPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.companyId) redirect('/login');

  const params = await searchParams;
  const config = DOCUMENT_TYPES.delivery_note;

  const result = await listDocuments(db, session.user.companyId, {
    type: 'delivery_note',
    status: params.status as DocumentStatus | undefined,
    search: params.search,
    page: parseInt(params.page || '1', 10),
    pageSize: 25,
  });

  return (
    <DocumentList
      config={config}
      result={result}
      search={params.search}
      status={params.status}
    />
  );
}
