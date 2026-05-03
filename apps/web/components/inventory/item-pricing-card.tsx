import Link from "next/link";
import { Receipt } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Decimal from "decimal.js";
import { formatCurrency } from "@/lib/utils";
import { CardSection } from "@/components/card-section";

interface RepairPart {
  quantity: number | string;
  unitCost: number | string;
}

interface PricingItem {
  estimatedValue?: string | null;
  repairCost?: string | null;
  effectiveCost?: string | null;
  askingPrice?: string | null;
  minPrice?: string | null;
  soldPrice?: string | null;
  saleDocumentId?: string | null;
}

interface ItemPricingCardProps {
  item: PricingItem;
  repairParts: RepairPart[];
}

export async function ItemPricingCard({
  item,
  repairParts,
}: ItemPricingCardProps) {
  const ti = await getTranslations("inventory");

  const partsTotal = repairParts.reduce((sum, p) => {
    try {
      return sum.plus(new Decimal(p.quantity).times(new Decimal(p.unitCost)));
    } catch {
      return sum;
    }
  }, new Decimal(0));
  const hasPartsTotal = partsTotal.greaterThan(0);
  const hasRepairCost = !!item.repairCost && new Decimal(item.repairCost).gt(0);
  const showEffectiveCost =
    !!item.effectiveCost && (hasPartsTotal || hasRepairCost);

  const margin =
    item.soldPrice && item.effectiveCost
      ? new Decimal(item.soldPrice).minus(item.effectiveCost)
      : null;

  return (
    <CardSection title={ti("pricing")}>
      <div className="space-y-3">
        {item.estimatedValue && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {ti("acquisitionCost")}
            </span>
            <span>{formatCurrency(item.estimatedValue)}</span>
          </div>
        )}
        {hasRepairCost && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {hasPartsTotal ? ti("labourCostLabel") : ti("repairCostLabel")}
            </span>
            <span>+{formatCurrency(item.repairCost ?? "0")}</span>
          </div>
        )}
        {hasPartsTotal && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {ti("repairPartsTotal")}
            </span>
            <span>+{formatCurrency(partsTotal.toFixed(2))}</span>
          </div>
        )}
        {showEffectiveCost && (
          <div className="flex justify-between text-sm border-t pt-2">
            <span className="text-muted-foreground font-medium">
              {ti("effectiveCost")}
            </span>
            <span className="font-medium">
              {formatCurrency(item.effectiveCost ?? "0")}
            </span>
          </div>
        )}
        {item.askingPrice && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{ti("askingPrice")}</span>
            <span className="font-medium">
              {formatCurrency(item.askingPrice)}
            </span>
          </div>
        )}
        {item.minPrice && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{ti("minPrice")}</span>
            <span>{formatCurrency(item.minPrice)}</span>
          </div>
        )}
        {item.soldPrice && (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{ti("soldFor")}</span>
              <span className="font-medium text-success">
                {formatCurrency(item.soldPrice)}
              </span>
            </div>
            {margin && (
              <div className="flex justify-between text-sm border-t pt-2">
                <span className="text-muted-foreground font-medium">
                  {ti("margin")}
                </span>
                <span
                  className={`font-medium ${margin.gte(0) ? "text-success" : "text-destructive"}`}
                >
                  {margin.gte(0) ? "+" : ""}
                  {formatCurrency(margin.toFixed(2))}
                </span>
              </div>
            )}
            {item.saleDocumentId && (
              <div className="border-t pt-2">
                <Link
                  href={`/sales/invoices/${item.saleDocumentId}`}
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                >
                  <Receipt className="h-3.5 w-3.5" />
                  {ti("viewSaleInvoice")}
                </Link>
              </div>
            )}
          </>
        )}
        {!item.estimatedValue && !item.askingPrice && !item.soldPrice && (
          <p className="text-sm text-muted-foreground">{ti("noPricingSet")}</p>
        )}
      </div>
    </CardSection>
  );
}
