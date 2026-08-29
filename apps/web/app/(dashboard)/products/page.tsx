import Link from "next/link";
import { Plus, Package, Search } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { getTranslations } from "next-intl/server";
import { getSessionOrRedirect } from "@/lib/session";
import { db } from "@/lib/db";
import { listProducts } from "@kivvi/core";
import { products } from "@kivvi/database";
import { count, and, eq, sql } from "drizzle-orm";
import { DEFAULT_PAGE_SIZE } from "@/lib/config/document-types";
import { getProductTypeLabels } from "@/lib/config/products";
import { paginationRange } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { SelectableProductTable } from "@/components/products/selectable-product-table";
import { Pagination } from "@/components/pagination";
import { ProductExportButton } from "@/components/products/product-export-button";
import { ProductsFilterBar } from "./products-filter-bar";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    type?: string;
    page?: string;
    sort?: string;
    order?: string;
  }>;
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const session = await getSessionOrRedirect();
  const t = await getTranslations("products");
  const tc = await getTranslations("common");
  const tb = await getTranslations("bulkActions");

  const params = await searchParams;
  const search = params.search || "";
  const typeFilter = params.type as "product" | "service" | undefined;
  const page = Math.max(1, parseInt(params.page || "1", 10));
  const sort = (params.sort || "createdAt") as "name" | "articleNumber" | "unitPrice" | "createdAt";
  const order = (params.order || "desc") as "asc" | "desc";

  const [result, [{ activeCount }], [{ lowStockCount }]] = await Promise.all([
    listProducts(db, session.user.companyId, {
      search: search || undefined,
      type: typeFilter || undefined,
      page,
      pageSize: DEFAULT_PAGE_SIZE,
      sortBy: sort,
      sortOrder: order,
    }),
    db
      .select({ activeCount: count() })
      .from(products)
      .where(and(eq(products.companyId, session.user.companyId), eq(products.isActive, true))),
    db
      .select({ lowStockCount: count() })
      .from(products)
      .where(
        and(
          eq(products.companyId, session.user.companyId),
          eq(products.isActive, true),
          sql`${products.minStock} IS NOT NULL AND CAST(${products.stockQuantity} AS numeric) <= ${products.minStock}`,
        ),
      ),
  ]);

  // Pre-resolve translations for client component
  const bulkActionKeys = [
    "selected",
    "clearSelection",
    "delete",
    "deactivate",
    "confirmTitle",
    "confirmDelete",
    "confirmDeactivate",
    "cancel",
    "processing",
    "confirmAction",
    "successAll",
    "successPartial",
    "failedAll",
    "showErrors",
    "hideErrors",
  ];
  // Keys with ICU placeholders ({count}, {successCount}, etc.) must use
  // tb.raw() to avoid ICU parser errors — the client fills them via .replace()
  const rawKeys = new Set([
    "successAll",
    "successPartial",
    "failedAll",
    "confirmDelete",
    "confirmDeactivate",
    "confirmMessage",
  ]);
  const bulkLabels: Record<string, string> = {};
  for (const key of bulkActionKeys) {
    bulkLabels[key] = rawKeys.has(key) ? tb.raw(key) : tb(key);
  }

  const columnLabels = {
    articleNumber: t("articleNumber"),
    name: tc("name"),
    type: tc("type"),
    unitPrice: t("unitPrice"),
    vatRate: t("vatRate"),
    stock: t("stock"),
    status: tc("status"),
    active: tc("active"),
    inactive: tc("inactive"),
    sku: t("sku"),
    outOfStock: t("outOfStock"),
    lowStock: t("lowStock"),
  };

  const typeLabels = getProductTypeLabels(t);

  function buildFilterUrl(overrides: { search?: string; type?: string; page?: number }) {
    const searchParams = new URLSearchParams();
    if (overrides.search) searchParams.set("search", overrides.search);
    if (overrides.type) searchParams.set("type", overrides.type);
    if (sort !== "createdAt") searchParams.set("sort", sort);
    if (order !== "desc") searchParams.set("order", order);
    if (overrides.page && overrides.page > 1) searchParams.set("page", String(overrides.page));
    const qs = searchParams.toString();
    return `/products${qs ? `?${qs}` : ""}`;
  }

  function buildPageUrl(p: number): string {
    const searchParams = new URLSearchParams();
    if (search) searchParams.set("search", search);
    if (typeFilter) searchParams.set("type", typeFilter);
    if (sort !== "createdAt") searchParams.set("sort", sort);
    if (order !== "desc") searchParams.set("order", order);
    if (p > 1) searchParams.set("page", p.toString());
    const qs = searchParams.toString();
    return `/products${qs ? `?${qs}` : ""}`;
  }

  function buildSortUrl(s: string, o: "asc" | "desc"): string {
    const searchParams = new URLSearchParams();
    if (search) searchParams.set("search", search);
    if (typeFilter) searchParams.set("type", typeFilter);
    searchParams.set("sort", s);
    searchParams.set("order", o);
    return `/products?${searchParams.toString()}`;
  }

  // Pre-compute sort hrefs for client component (functions can't cross server→client boundary)
  const sortHrefs: Record<string, string> = {};
  for (const field of ["articleNumber", "name", "unitPrice"]) {
    const nextOrder = sort === field && order === "asc" ? "desc" : "asc";
    sortHrefs[field] = buildSortUrl(field, nextOrder);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <>
            <ProductExportButton
              totalCount={result.total}
              filters={{ search: search || undefined }}
            />
            <Button asChild>
              <Link href="/products/new">
                <Plus className="h-4 w-4" />
                {t("newProduct")}
              </Link>
            </Button>
          </>
        }
      />

      <ProductsFilterBar
        search={search}
        typeFilter={typeFilter}
        sort={sort}
        order={order}
        activeCount={activeCount}
        lowStockCount={lowStockCount}
      />

      {/* Table */}
      <div className="rounded-xl border bg-card">
        {result.data.length === 0 ? (
          <EmptyState
            icon={search ? Search : Package}
            title={search ? tc("noResults") : t("noProducts")}
            description={search ? tc("noResults") : t("createFirstProduct")}
            actionLabel={!search ? t("newProduct") : undefined}
            actionHref={!search ? "/products/new" : undefined}
          />
        ) : (
          <>
            <SelectableProductTable
              data={result.data.map((p) => ({
                id: p.id,
                articleNumber: p.articleNumber,
                name: p.name,
                sku: p.sku,
                type: p.type,
                unitPrice: p.unitPrice,
                currency: p.currency,
                unit: p.unit,
                vatRate: p.vatRate,
                stockQuantity: p.stockQuantity,
                minStock: p.minStock,
                isActive: p.isActive,
              }))}
              translations={{ columnLabels, typeLabels, bulkLabels }}
              sort={{ field: sort, order, hrefs: sortHrefs }}
            />

            <Pagination
              page={result.page}
              totalPages={result.totalPages}
              buildHref={buildPageUrl}
              labels={{
                showing: tc("showing", paginationRange(result.page, result.pageSize, result.total)),
                previous: tc("previous"),
                next: tc("next"),
                pageOf: tc("pageOf", {
                  page: result.page,
                  totalPages: result.totalPages,
                }),
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
