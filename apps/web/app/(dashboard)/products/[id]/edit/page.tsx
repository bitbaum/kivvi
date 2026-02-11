import { redirect, notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getProduct } from '@kivvi/core';
import { EditProductForm } from './edit-form';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.companyId) {
    redirect('/login');
  }

  const { id } = await params;
  const product = await getProduct(db, session.user.companyId, id);

  if (!product) {
    notFound();
  }

  return <EditProductForm product={product} />;
}
