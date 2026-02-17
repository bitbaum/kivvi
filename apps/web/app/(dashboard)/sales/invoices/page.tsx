import { Download } from 'lucide-react';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { listDocuments } from '@kivvi/core';
import { db } from '@/lib/db';
import { DOCUMENT_TYPES, DEFAULT_PAGE_SIZE } from '@/lib/config/document-types';
import { DocumentList } from '@/components/documents/document-list';
import type { DocumentStatus } from '@kivvi/database';

interface PageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    page?: string;
  }>;
}

export default async function InvoicesPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.companyId) redirect('/login');

  const params = await searchParams;
  const page = parseInt(params.page || '1', 10);
  const status = params.status as DocumentStatus | undefined;
  const search = params.search;

  const result = await listDocuments(db, session.user.companyId, {
    type: 'invoice',
    status,
    search,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
    sortBy: 'issueDate',
    sortOrder: 'desc',
  });

  return (
    <DocumentList
      config={DOCUMENT_TYPES.invoice}
      result={result}
      search={search}
      status={status}
      headerActions={
        <a
          href="/api/export/invoices"
          className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent transition-colors"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </a>
      }
    />
  );
}
