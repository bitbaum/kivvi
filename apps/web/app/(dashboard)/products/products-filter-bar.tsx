import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { SearchInput } from "@/components/search-input";

interface ProductsFilterBarProps {
  search: string;
  typeFilter: string | undefined;
  sort: string;
  order: string;
  activeCount: number;
  lowStockCount: number;
}

export async function ProductsFilterBar({
  search,
  typeFilter,
  sort,
  order,
  activeCount,
  lowStockCount,
}: ProductsFilterBarProps) {
  const t = await getTranslations("products");
  const tc = await getTranslations("common");

  function buildFilterUrl(overrides: { search?: string; type?: string; page?: number }) {
    const params = new URLSearchParams();
    if (overrides.search) params.set("search", overrides.search);
    if (overrides.type) params.set("type", overrides.type);
    if (sort !== "createdAt") params.set("sort", sort);
    if (order !== "desc") params.set("order", order);
    if (overrides.page && overrides.page > 1) params.set("page", String(overrides.page));
    const qs = params.toString();
    return `/products${qs ? `?${qs}` : ""}`;
  }

  return (
    <>
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <SearchInput
          basePath="/products"
          placeholder={t("searchProducts")}
          preserveParams={["type", "sort", "order"]}
        />

        <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
          <TypeFilterLink
            href={buildFilterUrl({ search, type: undefined })}
            active={!typeFilter}
            label={tc("all")}
          />
          <TypeFilterLink
            href={buildFilterUrl({ search, type: "product" })}
            active={typeFilter === "product"}
            label={t("product")}
          />
          <TypeFilterLink
            href={buildFilterUrl({ search, type: "service" })}
            active={typeFilter === "service"}
            label={t("service")}
          />
        </div>
      </div>

      {/* Summary */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="rounded-full bg-muted px-3 py-1 font-medium">
          {t("summaryActive", { count: activeCount })}
        </span>
        {lowStockCount > 0 && (
          <span className="rounded-full bg-warning/10 px-3 py-1 font-medium text-warning">
            {t("summaryLowStock", { count: lowStockCount })}
          </span>
        )}
      </div>
    </>
  );
}

function TypeFilterLink({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-md bg-background px-3 py-1.5 text-sm font-medium shadow-sm"
          : "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      }
    >
      {label}
    </Link>
  );
}
