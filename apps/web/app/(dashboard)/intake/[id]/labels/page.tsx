import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getSessionOrRedirect } from "@/lib/session";
import { db } from "@/lib/db";
import { getDocument, listInventoryItems } from "@kivvi/core";
import { isValidUUID } from "@/lib/utils";
import { ItemLabel } from "@/components/inventory/item-label";
import { generateQrDataUrl } from "@/lib/qr";
import { PrintLabelsButton } from "./print-button";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function IntakeLabelsPage({ params }: PageProps) {
  const session = await getSessionOrRedirect();
  const ti = await getTranslations("inventory");
  const { id } = await params;
  if (!isValidUUID(id)) notFound();

  const doc = await getDocument(db, session.user.companyId, id);
  if (!doc || doc.type !== "intake") notFound();

  // Fetch inventory items linked to this intake
  const items = await listInventoryItems(db, session.user.companyId, {
    intakeDocumentId: id,
    pageSize: 500,
  });

  if (items.data.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href={`/intake/${id}`}
            className="min-h-[44px] min-w-[44px] rounded-lg p-2 hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold">{ti("noItemsToLabel")}</h1>
        </div>
        <p className="text-muted-foreground">{ti("confirmIntakeFirst")}</p>
      </div>
    );
  }

  // Generate QR codes server-side (parallel for speed)
  const baseUrl = process.env.NEXTAUTH_URL || "https://app.kivvi.ch";
  const qrCodes = await Promise.all(
    items.data.map((item) =>
      generateQrDataUrl(`${baseUrl}/intake/items/${item.id}`),
    ),
  );

  return (
    <div>
      {/* Screen header — hidden when printing */}
      <div className="no-print mb-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/intake/${id}`}
              className="min-h-[44px] min-w-[44px] rounded-lg p-2 hover:bg-muted"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold">{ti("printLabels")}</h1>
              <p className="text-sm text-muted-foreground">
                {doc.number} — {items.data.length} items
              </p>
            </div>
          </div>
          <PrintLabelsButton />
        </div>
        <p className="text-sm text-muted-foreground">{ti("labelSheetHint")}</p>
      </div>

      {/* Label grid — print-optimized */}
      <div
        className="mx-auto flex flex-wrap justify-center gap-0"
        style={{ maxWidth: "210mm" }}
      >
        {items.data.map((item, i) => (
          <ItemLabel
            key={item.id}
            itemNumber={item.itemNumber}
            description={item.description}
            condition={item.condition}
            qrDataUrl={qrCodes[i]}
          />
        ))}
      </div>
    </div>
  );
}
