import { Info, Package, Wrench } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Decimal from "decimal.js";
import { formatCurrency } from "@/lib/utils";
import { DEFAULT_CURRENCY } from "@kivvi/core/src/config/locale";
import { SWISS_VAT_RATES, DEFAULT_VAT_RATE } from "@/lib/config/vat-rates";
import { getProductTypeLabels, DEFAULT_UNIT } from "@/lib/config/products";
import type { getProduct } from "@kivvi/core";

type Product = NonNullable<Awaited<ReturnType<typeof getProduct>>>;

interface ProductDetailMainProps {
  product: Product;
}

export async function ProductDetailMain({ product }: ProductDetailMainProps) {
  const t = await getTranslations("products");
  const tc = await getTranslations("common");

  const TYPE_LABELS = getProductTypeLabels(t);
  const UNIT_LABELS: Record<string, string> = {
    piece: t("units.piece"),
    hour: t("units.hour"),
    kg: t("units.kg"),
    m: t("units.m"),
    m2: t("units.m2"),
    m3: t("units.m3"),
    liter: t("units.liter"),
  };
  const VAT_LABELS: Record<string, string> = Object.fromEntries(
    SWISS_VAT_RATES.map((rate) => [rate.value, t(`vatRates.${rate.labelKey}`)]),
  );
  const margin =
    product.purchasePrice && new Decimal(product.purchasePrice).greaterThan(0)
      ? new Decimal(product.unitPrice)
          .minus(new Decimal(product.purchasePrice))
          .div(new Decimal(product.unitPrice))
          .times(100)
          .toFixed(1)
      : null;

  return (
    <div className="space-y-6 lg:col-span-2">
      {/* Overview */}
      <div className="rounded-xl border bg-card">
        <div className="flex items-center gap-2 border-b px-6 py-4">
          <Info className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold">{t("overview")}</h2>
        </div>
        <div className="p-6">
          <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-muted-foreground">{tc("type")}</dt>
              <dd className="mt-1 flex items-center gap-1.5 font-medium">
                {product.type === "product" ? (
                  <Package className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Wrench className="h-4 w-4 text-muted-foreground" />
                )}
                {TYPE_LABELS[product.type]}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">{t("unit")}</dt>
              <dd className="mt-1 font-medium">
                {UNIT_LABELS[product.unit || DEFAULT_UNIT] || product.unit}
              </dd>
            </div>
            {product.manufacturer && (
              <div>
                <dt className="text-sm text-muted-foreground">
                  {t("manufacturer")}
                </dt>
                <dd className="mt-1 font-medium">
                  {(product.manufacturer as { name: string }).name}
                </dd>
              </div>
            )}
            {product.productGroup && (
              <div>
                <dt className="text-sm text-muted-foreground">
                  {t("productGroup")}
                </dt>
                <dd className="mt-1 font-medium">
                  {(product.productGroup as { name: string }).name}
                </dd>
              </div>
            )}
            {product.description && (
              <div className="sm:col-span-2">
                <dt className="text-sm text-muted-foreground">
                  {tc("description")}
                </dt>
                <dd className="mt-1 whitespace-pre-wrap text-sm">
                  {product.description}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Pricing */}
      <div className="rounded-xl border bg-card">
        <div className="border-b px-6 py-4">
          <h2 className="font-semibold">{t("pricing")}</h2>
        </div>
        <div className="p-6">
          <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-3">
            <div>
              <dt className="text-sm text-muted-foreground">
                {t("unitPrice")}
              </dt>
              <dd className="mt-1 text-2xl font-bold">
                {formatCurrency(
                  Number(product.unitPrice),
                  product.currency || DEFAULT_CURRENCY,
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">
                {t("purchasePrice")}
              </dt>
              <dd className="mt-1 text-2xl font-bold">
                {product.purchasePrice
                  ? formatCurrency(
                      Number(product.purchasePrice),
                      product.currency || DEFAULT_CURRENCY,
                    )
                  : "-"}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">{t("margin")}</dt>
              <dd className="mt-1 text-2xl font-bold">
                {margin ? `${margin}%` : "-"}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">{t("vatRate")}</dt>
              <dd className="mt-1 font-medium">
                {VAT_LABELS[product.vatRate || DEFAULT_VAT_RATE] ||
                  `${product.vatRate}%`}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">
                {tc("currency")}
              </dt>
              <dd className="mt-1 font-medium">
                {product.currency || DEFAULT_CURRENCY}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Dimensions (physical products only) */}
      {product.type === "product" &&
        (product.weight ||
          product.width ||
          product.height ||
          product.depth) && (
          <div className="rounded-xl border bg-card">
            <div className="border-b px-6 py-4">
              <h2 className="font-semibold">{t("dimensions")}</h2>
            </div>
            <div className="p-6">
              <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-4">
                {product.weight && (
                  <div>
                    <dt className="text-sm text-muted-foreground">
                      {t("weight")}
                    </dt>
                    <dd className="mt-1 font-medium">{product.weight} kg</dd>
                  </div>
                )}
                {product.width && (
                  <div>
                    <dt className="text-sm text-muted-foreground">
                      {t("width")}
                    </dt>
                    <dd className="mt-1 font-medium">{product.width} cm</dd>
                  </div>
                )}
                {product.height && (
                  <div>
                    <dt className="text-sm text-muted-foreground">
                      {t("height")}
                    </dt>
                    <dd className="mt-1 font-medium">{product.height} cm</dd>
                  </div>
                )}
                {product.depth && (
                  <div>
                    <dt className="text-sm text-muted-foreground">
                      {t("depth")}
                    </dt>
                    <dd className="mt-1 font-medium">{product.depth} cm</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        )}
    </div>
  );
}
