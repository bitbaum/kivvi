import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Pencil,
  Package,
  User,
  Warehouse,
  FileText,
  Receipt,
  Printer,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getSessionOrRedirect } from "@/lib/session";
import { db } from "@/lib/db";
import { getInventoryItem } from "@kivvi/core";
import { isValidUUID, formatCurrency, formatDate } from "@/lib/utils";
import { CardSection } from "@/components/card-section";
import { InfoRow } from "@/components/info-display";
import { ItemLabel } from "@/components/inventory/item-label";
import { generateQrDataUrl } from "@/lib/qr";
import { PrintLabelsButton } from "@/app/(dashboard)/intake/[id]/labels/print-button";
import { cn } from "@/lib/utils";

interface PageProps {
  params: Promise<{ id: string }>;
}

const STATUS_STYLES: Record<string, string> = {
  intake: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  testing:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  repair:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  ready_for_sale:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  listed:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  reserved:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  sold: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
  returned: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  donated: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400",
  recycled: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-500",
};

const CONDITION_STYLES: Record<string, string> = {
  untested: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  like_new:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  good: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  fair: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  poor: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  parts_only: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  scrap: "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-500",
};

const STATUS_LABELS: Record<string, string> = {
  intake: "Intake",
  testing: "Testing",
  repair: "Repair",
  ready_for_sale: "Ready for Sale",
  listed: "Listed",
  reserved: "Reserved",
  sold: "Sold",
  returned: "Returned",
  donated: "Donated",
  recycled: "Recycled",
};

const CONDITION_LABELS: Record<string, string> = {
  untested: "Untested",
  like_new: "Like New",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
  parts_only: "Parts Only",
  scrap: "Scrap",
};

export default async function InventoryItemDetailPage({ params }: PageProps) {
  const session = await getSessionOrRedirect();
  const tc = await getTranslations("common");
  const { id } = await params;
  if (!isValidUUID(id)) notFound();

  const item = await getInventoryItem(db, session.user.companyId, id);
  if (!item) notFound();

  const specs = (item.specs as Record<string, string>) || {};

  // Generate QR code for label
  const baseUrl = process.env.NEXTAUTH_URL || "https://app.kivvi.ch";
  const qrDataUrl = await generateQrDataUrl(`${baseUrl}/intake/items/${id}`);

  // Build prefill URL for the "Sell" button: creates an invoice pre-filled with this item
  const isSellable = ["ready_for_sale", "listed", "reserved"].includes(
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
          vatRate: "8.1",
          discount: "0",
        },
      ],
      notes: `${item.itemNumber}${item.condition !== "untested" ? ` — ${CONDITION_LABELS[item.condition]}` : ""}`,
    };
    const encoded = Buffer.from(JSON.stringify(prefillData)).toString(
      "base64url",
    );
    sellHref = `/sales/invoices/new?prefill=${encoded}`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/intake/items"
            className="min-h-[44px] min-w-[44px] rounded-lg p-2 hover:bg-muted"
            aria-label={tc("back")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{item.itemNumber}</h1>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-medium",
                  STATUS_STYLES[item.status],
                )}
              >
                {STATUS_LABELS[item.status] || item.status}
              </span>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-medium",
                  CONDITION_STYLES[item.condition],
                )}
              >
                {CONDITION_LABELS[item.condition] || item.condition}
              </span>
            </div>
            <p className="mt-1 text-muted-foreground">{item.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
              Sell
            </Link>
          )}
        </div>
      </div>

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
          <CardSection title="Details" icon={<Package className="h-4 w-4" />}>
            <div className="grid gap-4 sm:grid-cols-2">
              {item.productName && (
                <InfoRow
                  icon={<Package className="h-4 w-4" />}
                  label="Product"
                  value={item.productName}
                />
              )}
              {item.serialNumber && (
                <InfoRow
                  icon={<FileText className="h-4 w-4" />}
                  label="Serial Number"
                  value={item.serialNumber}
                  copyable
                />
              )}
              {item.location && (
                <InfoRow
                  icon={<Warehouse className="h-4 w-4" />}
                  label="Location"
                  value={item.location}
                />
              )}
              {item.warehouseName && (
                <InfoRow
                  icon={<Warehouse className="h-4 w-4" />}
                  label="Warehouse"
                  value={item.warehouseName}
                />
              )}
            </div>
          </CardSection>

          {/* Specs */}
          {Object.keys(specs).length > 0 && (
            <CardSection title="Specifications">
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
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Pricing */}
          <CardSection title="Pricing">
            <div className="space-y-3">
              {item.estimatedValue && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Acquisition Cost
                  </span>
                  <span>{formatCurrency(item.estimatedValue)}</span>
                </div>
              )}
              {item.repairCost && parseFloat(item.repairCost) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Repair Cost</span>
                  <span>+{formatCurrency(item.repairCost)}</span>
                </div>
              )}
              {item.effectiveCost &&
                item.repairCost &&
                parseFloat(item.repairCost) > 0 && (
                  <div className="flex justify-between text-sm border-t pt-2">
                    <span className="text-muted-foreground font-medium">
                      Effective Cost
                    </span>
                    <span className="font-medium">
                      {formatCurrency(item.effectiveCost)}
                    </span>
                  </div>
                )}
              {item.askingPrice && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Asking Price</span>
                  <span className="font-medium">
                    {formatCurrency(item.askingPrice)}
                  </span>
                </div>
              )}
              {item.minPrice && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Min Price</span>
                  <span>{formatCurrency(item.minPrice)}</span>
                </div>
              )}
              {item.soldPrice && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Sold For</span>
                    <span className="font-medium text-green-600">
                      {formatCurrency(item.soldPrice)}
                    </span>
                  </div>
                  {item.effectiveCost &&
                    (() => {
                      const margin =
                        parseFloat(item.soldPrice) -
                        parseFloat(item.effectiveCost);
                      const marginClass =
                        margin >= 0 ? "text-green-600" : "text-red-600";
                      return (
                        <div className="flex justify-between text-sm border-t pt-2">
                          <span className="text-muted-foreground font-medium">
                            Margin
                          </span>
                          <span className={`font-medium ${marginClass}`}>
                            {margin >= 0 ? "+" : ""}
                            {formatCurrency(margin.toFixed(2))}
                          </span>
                        </div>
                      );
                    })()}
                </>
              )}
              {!item.estimatedValue && !item.askingPrice && !item.soldPrice && (
                <p className="text-sm text-muted-foreground">No pricing set</p>
              )}
            </div>
          </CardSection>

          {/* Repair log */}
          {item.repairLog && (
            <CardSection title="Repair Log">
              <div className="space-y-1 text-xs">
                {item.repairHours && parseFloat(item.repairHours) > 0 && (
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Total Hours</span>
                    <span className="font-medium">{item.repairHours}h</span>
                  </div>
                )}
                <pre className="whitespace-pre-wrap rounded bg-muted/30 p-2 font-mono text-[11px]">
                  {item.repairLog}
                </pre>
              </div>
            </CardSection>
          )}

          {/* Provenance */}
          <CardSection title="Provenance">
            <div className="space-y-3">
              {item.donorName && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Donor: <span className="font-medium">{item.donorName}</span>
                  </span>
                </div>
              )}
              {item.intakeDocumentId && (
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <Link
                    href={`/intake/${item.intakeDocumentId}`}
                    className="text-primary hover:underline"
                  >
                    View Intake Document
                  </Link>
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                Created {formatDate(item.createdAt)}
              </div>
            </div>
          </CardSection>

          {/* Printable label */}
          <CardSection title="Label">
            <div className="flex flex-col items-center gap-3">
              <ItemLabel
                itemNumber={item.itemNumber}
                description={item.description}
                condition={item.condition}
                qrDataUrl={qrDataUrl}
              />
              <div className="no-print">
                <PrintLabelsButton />
              </div>
            </div>
          </CardSection>
        </div>
      </div>
    </div>
  );
}
