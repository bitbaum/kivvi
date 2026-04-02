import { notFound } from "next/navigation";
import { getSessionOrRedirect } from "@/lib/session";
import { db } from "@/lib/db";
import { getProduct } from "@kivvi/core";
import { EditProductForm } from "./edit-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: PageProps) {
  const session = await getSessionOrRedirect();
  const { id } = await params;
  const product = await getProduct(db, session.user.companyId, id);

  if (!product) {
    notFound();
  }

  return <EditProductForm product={product} />;
}
