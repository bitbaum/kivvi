import { notFound } from "next/navigation";
import Link from "next/link";
import { Tags, FileText, Package } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getSessionOrRedirect } from "@/lib/session";
import { db } from "@/lib/db";
import {
  getDocument,
  getInventoryItemCounts,
  listInventoryItems,
} from "@kivvi/core";
import { DOCUMENT_TYPES } from "@/lib/config/document-types";
import { DocumentDetail } from "@/components/documents/document-detail";
import { isValidUUID } from "@/lib/utils";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function IntakeDetailPage({ params }: PageProps) {
  const session = await getSessionOrRedirect();
  const { id } = await params;
  if (!isValidUUID(id)) notFound();
  const doc = await getDocument(db, session.user.companyId, id);

  if (!doc || doc.type !== "intake") notFound();

  // Count linked inventory items
  const linkedItems = await listInventoryItems(db, session.user.companyId, {
    intakeDocumentId: id,
    pageSize: 1,
  });

  const ti = await getTranslations("inventory");
  const isConfirmed = doc.status !== "draft" && doc.status !== "cancelled";
  const hasItems = linkedItems.total > 0;

  return (
    <div className="space-y-6">
      <DocumentDetail doc={doc} config={DOCUMENT_TYPES.intake} />

      {/* Intake-specific actions — shown after confirmation */}
      {isConfirmed && hasItems && (
        <div className="rounded-xl border bg-card p-4">
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">
            {ti("details")}
          </h3>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/intake/items?intakeDocumentId=${id}`}
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              <Package className="h-4 w-4" />
              {linkedItems.total} {ti("itemsTitle")}
            </Link>
            <Link
              href={`/intake/${id}/labels`}
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              <Tags className="h-4 w-4" />
              {ti("printLabels")}
            </Link>
            {doc.intakeSource === "donation" && (
              <a
                href={`/api/intake/${id}/receipt`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
              >
                <FileText className="h-4 w-4" />
                {ti("donationReceipt")}
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
