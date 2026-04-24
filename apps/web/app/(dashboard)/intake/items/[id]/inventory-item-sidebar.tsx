import Link from "next/link";
import { User, FileText, Recycle } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { formatDate } from "@/lib/utils";
import { CardSection } from "@/components/card-section";
import { ItemLabel } from "@/components/inventory/item-label";
import { ItemTimeline } from "@/components/inventory/item-timeline";
import { ItemPricingCard } from "@/components/inventory/item-pricing-card";
import { PrintLabelsButton } from "@/app/(dashboard)/intake/[id]/labels/print-button";
import { getConditionLabelKey } from "@/lib/config/inventory-items";
import { getCo2Factor } from "@kivvi/core/src/config/co2-factors";
import type { getInventoryItem, listRepairParts } from "@kivvi/core";

type InventoryItem = NonNullable<Awaited<ReturnType<typeof getInventoryItem>>>;
type RepairParts = Awaited<ReturnType<typeof listRepairParts>>;

interface InventoryItemSidebarProps {
  item: InventoryItem;
  repairParts: RepairParts;
  qrDataUrl: string;
  itemId: string;
}

export async function InventoryItemSidebar({
  item,
  repairParts,
  qrDataUrl,
  itemId,
}: InventoryItemSidebarProps) {
  const ti = await getTranslations("inventory");

  const co2Kg = getCo2Factor(item.category);
  const showImpact = item.status === "sold" || item.status === "donated";

  return (
    <div className="space-y-6">
      {/* Impact callout — shown when item is sold or donated */}
      {showImpact && (
        <div className="rounded-xl border border-success/30 bg-success/5 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Recycle className="h-4 w-4 text-success" />
            <span className="text-sm font-semibold text-success">
              {ti("itemImpactTitle")}
            </span>
          </div>
          <p className="mb-3 text-sm text-muted-foreground">
            {item.status === "sold"
              ? ti("itemImpactTaglineSold")
              : ti("itemImpactTaglineDonated")}
          </p>
          <p className="text-sm font-semibold text-success">
            {ti("itemImpactCo2", { kg: co2Kg })}
          </p>
          <p className="text-xs text-muted-foreground">
            {ti("itemImpactCo2Hint")}
          </p>
        </div>
      )}

      {/* Pricing */}
      <ItemPricingCard item={item} repairParts={repairParts} />

      {/* Item lifecycle timeline */}
      <CardSection title={ti("lifecycle")}>
        <ItemTimeline
          createdAt={item.createdAt}
          donorName={item.donorName}
          repairLog={item.repairLog}
          repairCost={item.repairCost}
          status={item.status}
          soldPrice={item.soldPrice}
          condition={item.condition}
          conditionLabel={ti(getConditionLabelKey(item.condition))}
          dataErasuredAt={item.dataErasuredAt}
          dataErasureMethod={item.dataErasureMethod}
          erasureMethodLabel={
            item.dataErasureMethod
              ? ti(
                  `erasureMethod_${item.dataErasureMethod}` as Parameters<
                    typeof ti
                  >[0],
                )
              : null
          }
          labels={{
            intake: ti("timelineIntake"),
            from: ti("timelineFrom"),
            repair: ti("timelineRepair"),
            ready: ti("timelineReady"),
            condition: ti("timelineCondition"),
            invested: ti("timelineInvested"),
            erasure: ti("timelineErasure"),
            sold: ti("timelineSold"),
          }}
        />
      </CardSection>

      {/* Provenance */}
      <CardSection title={ti("provenance")}>
        <div className="space-y-3">
          {item.donorName && (
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>
                {ti("donor")}:{" "}
                <span className="font-medium">{item.donorName}</span>
              </span>
            </div>
          )}
          {item.assignedToName && (
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>
                {ti("assignedTo")}:{" "}
                <span className="font-medium">{item.assignedToName}</span>
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
                {ti("viewIntakeDocument")}
              </Link>
            </div>
          )}
          <div className="text-xs text-muted-foreground">
            {ti("created")} {formatDate(item.createdAt)}
          </div>
        </div>
      </CardSection>

      {/* Printable label */}
      <CardSection title={ti("label")}>
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
  );
}
