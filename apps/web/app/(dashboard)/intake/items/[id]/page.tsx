import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Pencil,
  Package,
  Warehouse,
  FileText,
  Receipt,
  ClipboardList,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getSessionOrRedirect } from "@/lib/session";
import { db } from "@/lib/db";
import { getInventoryItem, listRepairParts } from "@kivvi/core";
import { isValidUUID } from "@/lib/utils";
import { DEFAULT_VAT_RATE } from "@/lib/config/vat-rates";
import { SELLABLE_ITEM_STATUSES } from "@/lib/config/inventory-items";
import { CardSection } from "@/components/card-section";
import { InfoRow } from "@/components/info-display";
import { generateQrDataUrl } from "@/lib/qr";
import { cn } from "@/lib/utils";
import { DetailPageHeader } from "@/components/page-header";
import {
  getStatusStyle,
  getConditionStyle,
  getStatusLabelKey,
  getConditionLabelKey,
} from "@/lib/config/inventory-items";
import { RepairPartsSection } from "@/components/inventory/repair-parts-section";
import { ItemChecklistDisplay } from "@/components/inventory/item-checklist-display";
import type { ChecklistData } from "@kivvi/core/src/config/checklist-templates";
import { getChecklistTemplate } from "@kivvi/core/src/config/checklist-templates";
import { InventoryItemSidebar } from "./inventory-item-sidebar";

interface PageProps {
  params: Promise<{ id: string }>;
}

// Status/condition styles and labels imported from @/lib/config/inventory-items (SSOT)

export default async function InventoryItemDetailPage({ params }: PageProps) {
  const session = await getSessionOrRedirect();
  const tc = await getTranslations("common");
  const ti = await getTranslations("inventory");
  const tck = await getTranslations("checklist");
  const { id } = await params;
  if (!isValidUUID(id)) notFound();

  const [item, repairPartsList] = await Promise.all([
    getInventoryItem(db, session.user.companyId, id),
    listRepairParts(db, session.user.companyId, id),
  ]);
  if (!item) notFound();

  const specs = (item.specs as Record<string, string>) || {};

  // Generate QR code for label
  const baseUrl = process.env.NEXTAUTH_URL || "https://kivvi.vercel.app";
  const qrDataUrl = await generateQrDataUrl(`${baseUrl}/intake/items/${id}`);

  // Build prefill URL for the "Sell" button: creates an invoice pre-filled with this item
  const isSellable = (SELLABLE_ITEM_STATUSES as readonly string[]).includes(
    item.status,
  );
  let sellHref = "";
  if (isSellable) {
    const prefillData = {
      items: [
        {
          productId: item.productId || undefined,
          inventoryItemId: item.id,
          description: item.description,
          quantity: "1",
          unitPrice: item.askingPrice || item.estimatedValue || "0",
          vatRate: DEFAULT_VAT_RATE,
          discount: "0",
        },
      ],
      notes: `${item.itemNumber}${item.condition !== "untested" ? ` — ${ti(getConditionLabelKey(item.condition))}` : ""}`,
    };
    const encoded = Buffer.from(JSON.stringify(prefillData)).toString(
      "base64url",
    );
    sellHref = `/sales/invoices/new?prefill=${encoded}`;
  }

  return (
    <div className="space-y-6">
      <DetailPageHeader
        breadcrumbs={[
          { label: tc("intake"), href: "/intake" },
          { label: tc("items"), href: "/intake/items" },
          { label: item.itemNumber },
        ]}
        title={item.itemNumber}
        subtitle={item.description}
        backHref="/intake/items"
        badge={
          <>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium",
                getStatusStyle(item.status),
              )}
            >
              {ti(getStatusLabelKey(item.status))}
            </span>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium",
                getConditionStyle(item.condition),
              )}
            >
              {ti(getConditionLabelKey(item.condition))}
            </span>
          </>
        }
        actions={
          <div className="flex items-center gap-2">
            {/* Test button: shown when item is in intake or testing status */}
            {(item.status === "intake" || item.status === "testing") && (
              <Link
                href={`/intake/items/${id}/test`}
                className="inline-flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/5 px-4 py-2 text-sm font-medium text-warning hover:bg-warning/10 transition-colors"
              >
                <ClipboardList className="h-4 w-4" />
                {item.checklistData
                  ? ti("continueTesting")
                  : ti("startTesting")}
              </Link>
            )}
            <Link
              href={`/intake/items/${id}/edit`}
              className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              <Pencil className="h-4 w-4" />
              {tc("edit")}
            </Link>
            {isSellable && (
              <Link
                href={sellHref}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Receipt className="h-4 w-4" />
                {ti("sell")}
              </Link>
            )}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Photo */}
          {item.photoBase64 && (
            <div className="rounded-xl border bg-card p-4">
              {/* eslint-disable-next-line @next/next/no-img-element -- base64 data URI */}
              <img
                src={item.photoBase64}
                alt={item.description}
                className="mx-auto max-h-96 rounded-lg object-contain"
              />
            </div>
          )}
          {/* Details */}
          <CardSection
            title={ti("details")}
            icon={<Package className="h-4 w-4" />}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {item.category && (
                <InfoRow
                  icon={<ClipboardList className="h-4 w-4" />}
                  label={ti("category")}
                  value={tck(
                    getChecklistTemplate(item.category).labelKey as Parameters<
                      typeof tck
                    >[0],
                  )}
                />
              )}
              {item.productName && (
                <InfoRow
                  icon={<Package className="h-4 w-4" />}
                  label={ti("product")}
                  value={item.productName}
                />
              )}
              {item.serialNumber && (
                <InfoRow
                  icon={<FileText className="h-4 w-4" />}
                  label={ti("serialNumber")}
                  value={item.serialNumber}
                  copyable
                />
              )}
              {item.location && (
                <InfoRow
                  icon={<Warehouse className="h-4 w-4" />}
                  label={ti("locationShelf")}
                  value={item.location}
                />
              )}
              {item.warehouseName && (
                <InfoRow
                  icon={<Warehouse className="h-4 w-4" />}
                  label={ti("warehouseLabel")}
                  value={item.warehouseName}
                />
              )}
            </div>
          </CardSection>

          {/* Specs */}
          {Object.keys(specs).length > 0 && (
            <CardSection title={ti("specifications")}>
              <div className="grid gap-2 sm:grid-cols-2">
                {Object.entries(specs).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm"
                  >
                    <span className="text-muted-foreground">{key}</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </CardSection>
          )}

          {/* Notes */}
          {item.notes && (
            <CardSection title={tc("notes")}>
              <p className="whitespace-pre-wrap text-sm">{item.notes}</p>
            </CardSection>
          )}

          {/* Checklist results */}
          <ItemChecklistDisplay
            checklistData={item.checklistData as ChecklistData | null}
          />
          {/* Repair Parts */}
          <RepairPartsSection itemId={id} initialParts={repairPartsList} />
        </div>

        {/* Sidebar */}
        <InventoryItemSidebar
          item={item}
          repairParts={repairPartsList}
          qrDataUrl={qrDataUrl}
          itemId={id}
        />
      </div>
    </div>
  );
}
