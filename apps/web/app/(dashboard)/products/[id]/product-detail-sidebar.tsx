import { Warehouse } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import type { getProduct } from "@kivvi/core";

type Product = NonNullable<Awaited<ReturnType<typeof getProduct>>>;

interface ProductDetailSidebarProps {
  product: Product;
}

export async function ProductDetailSidebar({
  product,
}: ProductDetailSidebarProps) {
  const t = await getTranslations("products");
  const tc = await getTranslations("common");

  return (
    <div className="space-y-6">
      {/* Stock (physical products only) */}
      {product.type === "product" && (
        <div className="rounded-xl border bg-card">
          <div className="flex items-center gap-2 border-b px-6 py-4">
            <Warehouse className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold">{t("stock")}</h2>
          </div>
          <div className="p-6">
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">{t("totalStock")}</p>
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
                      <span className="font-medium">{Number(sl.quantity)}</span>
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
              <p className="text-sm text-muted-foreground">{tc("noResults")}</p>
            )}
            <div className="mt-4 flex items-center gap-2">
              {product.serialNumberTracking && (
                <span className="inline-flex items-center rounded-full bg-info/10 px-2 py-0.5 text-xs font-medium text-info">
                  {t("serialNumberTracking")}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settings */}
      <div className="rounded-xl border bg-card">
        <div className="border-b px-6 py-4">
          <h2 className="font-semibold">{tc("settings")}</h2>
        </div>
        <div className="divide-y">
          <div className="flex items-center justify-between px-6 py-3">
            <span className="text-sm text-muted-foreground">
              {t("visibleInShop")}
            </span>
            <StatusBadge
              variant={product.shopVisible ? "active" : "inactive"}
              label={product.shopVisible ? tc("yes") : tc("no")}
            />
          </div>
          <div className="flex items-center justify-between px-6 py-3">
            <span className="text-sm text-muted-foreground">
              {t("serialNumberTracking")}
            </span>
            <StatusBadge
              variant={product.serialNumberTracking ? "active" : "inactive"}
              label={product.serialNumberTracking ? tc("yes") : tc("no")}
            />
          </div>
        </div>
      </div>

      {/* Metadata */}
      <div className="rounded-xl border bg-card">
        <div className="border-b px-6 py-4">
          <h2 className="font-semibold">{t("metadata")}</h2>
        </div>
        <div className="divide-y">
          <div className="flex items-center justify-between px-6 py-3">
            <span className="text-sm text-muted-foreground">{tc("date")}</span>
            <span className="text-sm">{formatDate(product.createdAt)}</span>
          </div>
          <div className="flex items-center justify-between px-6 py-3">
            <span className="text-sm text-muted-foreground">{tc("date")}</span>
            <span className="text-sm">{formatDate(product.updatedAt)}</span>
          </div>
          {product.kivitendoId && (
            <div className="flex items-center justify-between px-6 py-3">
              <span className="text-sm text-muted-foreground">
                {t("kivitendoId")}
              </span>
              <span className="font-mono text-sm">{product.kivitendoId}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
