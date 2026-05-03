import { notFound } from "next/navigation";
import Link from "next/link";
import { Package, MapPin } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { DEFAULT_COUNTRY } from "@kivvi/core/src/config/locale";
import { SHOP_CONDITION_VALUES } from "@kivvi/core/src/config/item-status-sets";
import { db } from "@/lib/db";
import {
  getPublicCompanyBySlug,
  listPublicItems,
} from "@kivvi/core/src/domain/shop";
import { formatCurrency } from "@/lib/utils";
import { ITEM_CONDITION_CONFIG } from "@/lib/config/inventory-items";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { slug: string };
  searchParams: {
    category?: string;
    condition?: string;
    search?: string;
    page?: string;
  };
}

export default async function ShopPage({ params, searchParams }: PageProps) {
  const company = await getPublicCompanyBySlug(db, params.slug);
  if (!company) notFound();

  const t = await getTranslations("shop");
  const tInventory = await getTranslations("inventory");

  const page = Math.max(1, Number(searchParams.page ?? "1"));
  const { data: items, total } = await listPublicItems(db, company.id, {
    category: searchParams.category,
    condition: searchParams.condition,
    search: searchParams.search,
    page,
    pageSize: 24,
  });

  const totalPages = Math.ceil(total / 24);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">{company.name}</h1>
              {company.city && (
                <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {company.city}
                  {company.country && company.country !== DEFAULT_COUNTRY
                    ? `, ${company.country}`
                    : ""}
                </p>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {t("itemsAvailable", { count: total })}
            </p>
          </div>

          {/* Filter bar */}
          <form className="mt-4 flex flex-wrap gap-2" method="GET">
            <input
              type="search"
              name="search"
              defaultValue={searchParams.search ?? ""}
              placeholder={t("searchPlaceholder")}
              className="rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-auto sm:flex-1 max-w-xs"
            />
            <select
              name="condition"
              defaultValue={searchParams.condition ?? ""}
              className="rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">{t("allConditions")}</option>
              {SHOP_CONDITION_VALUES.map((c) => (
                <option key={c} value={c}>
                  {tInventory(
                    ITEM_CONDITION_CONFIG[c]!.labelKey as Parameters<
                      typeof tInventory
                    >[0],
                  )}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {t("filter")}
            </button>
            {(searchParams.search ||
              searchParams.condition ||
              searchParams.category) && (
              <Link
                href={`/shop/${params.slug}`}
                className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                {t("reset")}
              </Link>
            )}
          </form>
        </div>
      </header>

      {/* Item grid */}
      <main className="mx-auto max-w-6xl px-4 py-8">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
            <Package className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">
              {searchParams.search || searchParams.condition
                ? t("noItemsFound")
                : t("noItemsYet")}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => {
              const conditionCfg = ITEM_CONDITION_CONFIG[item.condition];
              return (
                <Link
                  key={item.id}
                  href={`/shop/${params.slug}/${item.id}`}
                  className="group flex flex-col rounded-xl border bg-card overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Photo */}
                  <div className="aspect-square bg-muted relative overflow-hidden">
                    {item.photoBase64 ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.photoBase64}
                        alt={item.description}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Package className="h-10 w-10 text-muted-foreground/30" />
                      </div>
                    )}
                    {/* Condition badge */}
                    <span
                      className={`absolute top-2 left-2 inline-flex h-6 w-6 items-center justify-center rounded text-xs font-bold ${conditionCfg?.style ?? "bg-muted text-muted-foreground"}`}
                    >
                      {conditionCfg?.shortLabel ?? "?"}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex flex-1 flex-col gap-1 p-3">
                    <p className="line-clamp-2 text-sm font-medium leading-tight">
                      {item.description}
                    </p>
                    <p className="mt-auto text-base font-bold tabular-nums">
                      {item.askingPrice
                        ? formatCurrency(item.askingPrice, item.currency)
                        : t("priceOnRequest")}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            {page > 1 && (
              <Link
                href={`/shop/${params.slug}?page=${page - 1}${searchParams.search ? `&search=${encodeURIComponent(searchParams.search)}` : ""}${searchParams.condition ? `&condition=${searchParams.condition}` : ""}`}
                className="rounded-lg border px-4 py-2 text-sm hover:bg-muted"
              >
                {t("previous")}
              </Link>
            )}
            <span className="text-sm text-muted-foreground">
              {t("pageOf", { page, total: totalPages })}
            </span>
            {page < totalPages && (
              <Link
                href={`/shop/${params.slug}?page=${page + 1}${searchParams.search ? `&search=${encodeURIComponent(searchParams.search)}` : ""}${searchParams.condition ? `&condition=${searchParams.condition}` : ""}`}
                className="rounded-lg border px-4 py-2 text-sm hover:bg-muted"
              >
                {t("next")}
              </Link>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t mt-16 py-8 text-center text-xs text-muted-foreground">
        {t("poweredBy")}{" "}
        <a
          href="/"
          className="underline hover:text-foreground"
          target="_blank"
          rel="noopener noreferrer"
        >
          Kivvi
        </a>
      </footer>
    </div>
  );
}
