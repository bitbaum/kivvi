import Decimal from "decimal.js";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Package,
  Wrench,
  Warehouse,
  Info,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getProduct } from "@kivvi/core";
import { formatCurrency, formatDate, isValidUUID } from "@/lib/utils";
import { SWISS_VAT_RATES, DEFAULT_VAT_RATE } from "@/lib/config/vat-rates";
import { getProductTypeLabels } from "@/lib/config/products";
import { deleteProductAction } from "@/app/actions/products";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.companyId) {
    redirect("/login");
  }

  const t = await getTranslations("products");
  const tc = await getTranslations("common");

  const { id } = await params;
  if (!isValidUUID(id)) notFound();
  const product = await getProduct(db, session.user.companyId, id);

  if (!product) {
    notFound();
  }

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link
            href="/products"
            className="mt-1 min-h-[44px] min-w-[44px] rounded-lg border p-2 hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{product.name}</h1>
              <span
                className={
                  product.isActive
                    ? "inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400"
                    : "inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-400"
                }
              >
                {product.isActive ? tc("active") : tc("inactive")}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
              <span className="font-mono">{product.articleNumber}</span>
              {product.sku && (
                <>
                  <span>-</span>
                  <span>
                    {t("sku")}: {product.sku}
                  </span>
                </>
              )}
              {product.ean && (
                <>
                  <span>-</span>
                  <span>
                    {t("ean")}: {product.ean}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/products/${product.id}/edit`}
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            <Pencil className="h-4 w-4" />
            {tc("edit")}
          </Link>
          <DeleteButton
            productId={product.id}
            productName={product.name}
            deleteLabel={tc("delete")}
          />
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Info -- 2 columns */}
        <div className="space-y-6 lg:col-span-2">
          {/* Overview Card */}
          <div className="rounded-xl border bg-card">
            <div className="flex items-center gap-2 border-b px-6 py-4">
              <Info className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold">{t("overview")}</h2>
            </div>
            <div className="p-6">
              <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm text-muted-foreground">
                    {tc("type")}
                  </dt>
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
                    {UNIT_LABELS[product.unit || "piece"] || product.unit}
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

          {/* Pricing Card */}
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
                      product.currency || "CHF",
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
                          product.currency || "CHF",
                        )
                      : "-"}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm text-muted-foreground">
                    {t("margin")}
                  </dt>
                  <dd className="mt-1 text-2xl font-bold">
                    {margin ? `${margin}%` : "-"}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm text-muted-foreground">
                    {t("vatRate")}
                  </dt>
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
                    {product.currency || "CHF"}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Dimensions Card (only for physical products) */}
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
                        <dd className="mt-1 font-medium">
                          {product.weight} kg
                        </dd>
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
                        <dd className="mt-1 font-medium">
                          {product.height} cm
                        </dd>
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

        {/* Sidebar -- 1 column */}
        <div className="space-y-6">
          {/* Stock Card (only for products) */}
          {product.type === "product" && (
            <div className="rounded-xl border bg-card">
              <div className="flex items-center gap-2 border-b px-6 py-4">
                <Warehouse className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold">{t("stock")}</h2>
              </div>
              <div className="p-6">
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">
                    {t("totalStock")}
                  </p>
                  <p className="text-3xl font-bold">
                    {Number(product.stockQuantity || "0")}
                  </p>
                  {product.minStock !== null && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("minStock")}: {product.minStock}
                    </p>
                  )}
                </div>

                {product.stockLevels && product.stockLevels.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-muted-foreground">
                      {t("perWarehouse")}
                    </p>
                    {product.stockLevels.map((sl) => (
                      <div
                        key={sl.id}
                        className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2"
                      >
                        <span className="text-sm">
                          {sl.warehouse?.name || "Unknown"}
                        </span>
                        <div className="text-right text-sm">
                          <span className="font-medium">
                            {Number(sl.quantity)}
                          </span>
                          {Number(sl.reservedQuantity) > 0 && (
                            <span className="ml-1 text-muted-foreground">
                              {t("reservedQuantity", {
                                count: Number(sl.reservedQuantity),
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {tc("noResults")}
                  </p>
                )}

                <div className="mt-4 flex items-center gap-2">
                  {product.serialNumberTracking && (
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                      {t("serialNumberTracking")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Settings Card */}
          <div className="rounded-xl border bg-card">
            <div className="border-b px-6 py-4">
              <h2 className="font-semibold">{tc("settings")}</h2>
            </div>
            <div className="divide-y">
              <div className="flex items-center justify-between px-6 py-3">
                <span className="text-sm text-muted-foreground">
                  {t("visibleInShop")}
                </span>
                <span
                  className={
                    product.shopVisible
                      ? "inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400"
                      : "inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-400"
                  }
                >
                  {product.shopVisible ? tc("yes") : tc("no")}
                </span>
              </div>
              <div className="flex items-center justify-between px-6 py-3">
                <span className="text-sm text-muted-foreground">
                  {t("serialNumberTracking")}
                </span>
                <span
                  className={
                    product.serialNumberTracking
                      ? "inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400"
                      : "inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-400"
                  }
                >
                  {product.serialNumberTracking ? tc("yes") : tc("no")}
                </span>
              </div>
            </div>
          </div>

          {/* Metadata Card */}
          <div className="rounded-xl border bg-card">
            <div className="border-b px-6 py-4">
              <h2 className="font-semibold">{t("metadata")}</h2>
            </div>
            <div className="divide-y">
              <div className="flex items-center justify-between px-6 py-3">
                <span className="text-sm text-muted-foreground">
                  {tc("date")}
                </span>
                <span className="text-sm">{formatDate(product.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between px-6 py-3">
                <span className="text-sm text-muted-foreground">
                  {tc("date")}
                </span>
                <span className="text-sm">{formatDate(product.updatedAt)}</span>
              </div>
              {product.kivitendoId && (
                <div className="flex items-center justify-between px-6 py-3">
                  <span className="text-sm text-muted-foreground">
                    {t("kivitendoId")}
                  </span>
                  <span className="font-mono text-sm">
                    {product.kivitendoId}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// DELETE BUTTON (Client Component via form action)
// ============================================================================

function DeleteButton({
  productId,
  productName,
  deleteLabel,
}: {
  productId: string;
  productName: string;
  deleteLabel: string;
}) {
  return (
    <form
      action={async () => {
        "use server";
        const result = await deleteProductAction(productId);
        if (result.success) {
          redirect("/products");
        }
      }}
    >
      <button
        type="submit"
        className="inline-flex items-center gap-2 rounded-lg border border-destructive/30 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
        title={`${deleteLabel} ${productName}`}
      >
        <Trash2 className="h-4 w-4" />
        {deleteLabel}
      </button>
    </form>
  );
}
