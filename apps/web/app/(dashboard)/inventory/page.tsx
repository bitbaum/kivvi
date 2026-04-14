import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import {
  Warehouse as WarehouseIcon,
  AlertTriangle,
  ArrowUpDown,
  MapPin,
  Star,
} from "lucide-react";
import { getSessionOrRedirect } from "@/lib/session";
import { db } from "@/lib/db";
import { listWarehouses, getLowStockProducts } from "@kivvi/core";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { AddWarehouseForm } from "./add-warehouse-form";

export default async function InventoryPage() {
  const session = await getSessionOrRedirect();
  const t = await getTranslations("inventory");

  const [warehouses, lowStockProducts] = await Promise.all([
    listWarehouses(db, session.user.companyId),
    getLowStockProducts(db, session.user.companyId),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <>
            <Link
              href="/inventory/movements"
              className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
            >
              <ArrowUpDown className="h-4 w-4" />
              {t("stockMovements")}
            </Link>
            <AddWarehouseForm />
          </>
        }
      />

      {/* Low Stock Alerts */}
      {lowStockProducts.length > 0 && (
        <div className="rounded-xl border border-warning/20 bg-warning/5">
          <div className="flex items-center gap-2 border-b border-warning/20 p-4">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <h2 className="font-semibold text-warning">
              {t("lowStockAlerts")}
            </h2>
            <span className="ml-auto inline-flex items-center rounded-full bg-warning/20 px-2 py-0.5 text-xs font-medium text-warning">
              {t("lowStockCount", { count: lowStockProducts.length })}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-warning/20 text-left text-sm text-warning">
                  <th className="whitespace-nowrap px-4 py-3 font-medium">
                    {t("productColumn")}
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium">
                    {t("articleNumberColumn")}
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-right">
                    {t("currentStock")}
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-right">
                    {t("minStockColumn")}
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-right">
                    {t("deficitColumn")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warning/20">
                {lowStockProducts.map((product) => {
                  const deficit = product.minStock - product.totalStock;
                  return (
                    <tr key={product.productId}>
                      <td className="whitespace-nowrap px-4 py-3">
                        <Link
                          href={`/products/${product.productId}`}
                          className="font-medium text-warning hover:underline"
                        >
                          {product.productName}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-sm text-warning">
                        {product.articleNumber || "-"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-destructive">
                        {product.totalStock}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-warning">
                        {product.minStock}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <span className="inline-flex items-center rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                          -{deficit}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Warehouse Cards */}
      {warehouses.length === 0 ? (
        <EmptyState
          icon={WarehouseIcon}
          title={t("noWarehouses")}
          description={t("noWarehouses")}
        />
      ) : (
        <div>
          <h2 className="mb-4 text-lg font-semibold">{t("warehouses")}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {warehouses.map((warehouse) => (
              <Link
                key={warehouse.id}
                href={`/inventory/${warehouse.id}`}
                className="group rounded-xl border bg-card p-6 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <WarehouseIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold group-hover:text-primary transition-colors">
                        {warehouse.name}
                      </h3>
                      {warehouse.address && (
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {warehouse.address}
                        </p>
                      )}
                    </div>
                  </div>
                  {warehouse.isDefault && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      <Star className="h-3 w-3" />
                      {t("defaultWarehouse")}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
