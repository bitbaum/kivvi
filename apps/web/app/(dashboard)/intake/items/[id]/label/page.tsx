import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getSessionOrRedirect } from "@/lib/session";
import { db } from "@/lib/db";
import { getInventoryItem } from "@kivvi/core";
import { isValidUUID } from "@/lib/utils";
import { ItemLabel } from "@/components/inventory/item-label";
import { generateQrDataUrl } from "@/lib/qr";
import { PrintLabelsButton } from "@/app/(dashboard)/intake/[id]/labels/print-button";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ItemLabelPage({ params }: PageProps) {
  const session = await getSessionOrRedirect();
  const ti = await getTranslations("inventory");
  const { id } = await params;
  if (!isValidUUID(id)) notFound();

  const item = await getInventoryItem(db, session.user.companyId, id);
  if (!item) notFound();

  const baseUrl = process.env.NEXTAUTH_URL || "https://kivvi.orangecat.ch";
  const qrDataUrl = await generateQrDataUrl(`${baseUrl}/intake/items/${id}`);

  return (
    <div>
      {/* Screen header — hidden when printing */}
      <div className="no-print mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/intake/items/${id}`}
            className="min-h-[44px] min-w-[44px] rounded-lg p-2 hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{ti("printLabel")}</h1>
            <p className="text-sm text-muted-foreground">
              {item.itemNumber} — {item.description}
            </p>
          </div>
        </div>
        <PrintLabelsButton />
      </div>

      {/* Single label — print-optimized */}
      <div className="flex justify-center">
        <ItemLabel
          itemNumber={item.itemNumber}
          description={item.description}
          condition={item.condition}
          qrDataUrl={qrDataUrl}
          askingPrice={item.askingPrice}
        />
      </div>
    </div>
  );
}
