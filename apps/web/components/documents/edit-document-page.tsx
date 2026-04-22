import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getDocument } from "@kivvi/core";
import { DOCUMENT_TYPES, STATUS } from "@/lib/config/document-types";
import { DEFAULT_VAT_RATE } from "@/lib/config/vat-rates";
import { Breadcrumb } from "@/components/breadcrumb";
import { EditDocumentForm } from "@/components/documents/edit-document-form";
import { getTranslations } from "next-intl/server";
import type { DocumentType } from "@kivvi/database";

interface EditDocumentPageProps {
  documentId: string;
  /** Document types accepted on this page (e.g. ['invoice'] or ['order', 'order_confirmation']) */
  allowedTypes: DocumentType[];
}

/**
 * Shared server component for all document edit pages.
 * Handles auth, doc fetch, draft validation, breadcrumbs, and form rendering.
 */
export async function EditDocumentPage({
  documentId,
  allowedTypes,
}: EditDocumentPageProps) {
  const session = await auth();
  if (!session?.user?.companyId) {
    redirect("/login");
  }

  const td = await getTranslations("documents");
  const tc = await getTranslations("common");

  const doc = await getDocument(db, session.user.companyId, documentId);

  if (!doc || !allowedTypes.includes(doc.type)) {
    notFound();
  }

  const config = DOCUMENT_TYPES[doc.type];

  // Only drafts can be edited
  if (doc.status !== STATUS.DRAFT) {
    redirect(`${config.basePath}/${documentId}`);
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: tc("dashboard"), href: "/dashboard" },
          { label: td(config.labelPlural), href: config.basePath },
          { label: doc.number, href: `${config.basePath}/${documentId}` },
          { label: tc("edit") },
        ]}
      />
      <EditDocumentForm
        documentId={doc.id}
        documentType={doc.type}
        config={config}
        initialData={{
          contactId: doc.contactId,
          contactName: doc.contact?.name || "",
          issueDate: doc.issueDate
            ? new Date(doc.issueDate).toISOString().split("T")[0]
            : "",
          dueDate: doc.dueDate
            ? new Date(doc.dueDate).toISOString().split("T")[0]
            : "",
          deliveryDate: doc.deliveryDate
            ? new Date(doc.deliveryDate).toISOString().split("T")[0]
            : "",
          notes: doc.notes || "",
          internalNotes: doc.internalNotes || "",
          items: doc.items.map(
            (item: {
              id: string;
              productId: string | null;
              inventoryItemId: string | null;
              description: string;
              quantity: string;
              unitPrice: string;
              discount: string | null;
              vatRate: string | null;
            }) => ({
              id: item.id,
              productId: item.productId || null,
              inventoryItemId: item.inventoryItemId || null,
              description: item.description,
              quantity: item.quantity.replace(/\.?0+$/, "") || "0",
              unitPrice: item.unitPrice.replace(/\.?0+$/, "") || "0",
              discount: (item.discount || "0").replace(/\.?0+$/, "") || "0",
              vatRate:
                (item.vatRate || DEFAULT_VAT_RATE).replace(/\.?0+$/, "") || "0",
              stockQuantity: null,
            }),
          ),
        }}
      />
    </div>
  );
}
