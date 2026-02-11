import { redirect, notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getContact } from '@kivvi/core';
import { EditContactForm } from './edit-form';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditContactPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.companyId) {
    redirect('/login');
  }

  const { id } = await params;
  const data = await getContact(db, session.user.companyId, id);

  if (!data) {
    notFound();
  }

  return <EditContactForm contact={data.contact} />;
}
