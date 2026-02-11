import { redirect, notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getDocument } from '@kivvi/core';
import { DOCUMENT_TYPES } from '@/lib/config/document-types';
import { EditDocumentForm } from './edit-form';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditInvoicePage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.companyId) {
    redirect('/login');
  }

  const { id } = await params;
  const doc = await getDocument(db, session.user.companyId, id);

  if (!doc) {
    notFound();
  }

  // Only drafts can be edited
  if (doc.status !== 'draft') {
    redirect(`/sales/invoices/${id}`);
  }

  const config = DOCUMENT_TYPES[doc.type];

  return (
    <EditDocumentForm
      documentId={doc.id}
      documentType={doc.type}
      config={config}
      initialData={{
        contactId: doc.contactId,
        contactName: doc.contact?.name || '',
        issueDate: doc.issueDate ? new Date(doc.issueDate).toISOString().split('T')[0] : '',
        dueDate: doc.dueDate ? new Date(doc.dueDate).toISOString().split('T')[0] : '',
        deliveryDate: doc.deliveryDate ? new Date(doc.deliveryDate).toISOString().split('T')[0] : '',
        notes: doc.notes || '',
        internalNotes: doc.internalNotes || '',
        items: doc.items.map((item: any) => ({
          id: item.id,
          productId: item.productId || null,
          description: item.description,
          quantity: String(Number(item.quantity)),
          unitPrice: String(Number(item.unitPrice)),
          discount: String(Number(item.discount || 0)),
          vatRate: String(Number(item.vatRate || 8.1)),
        })),
      }}
    />
  );
}
