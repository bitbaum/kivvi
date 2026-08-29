import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Package, Tag } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { getPublicCompanyBySlug, getPublicItem } from "@kivvi/core/src/domain/shop";
import { formatCurrency } from "@/lib/utils";
import { ITEM_CONDITION_CONFIG, getConditionLabelKey } from "@/lib/config/inventory-items";
import { ShopInquiryForm } from "./inquiry-form";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { slug: string; itemId: string };
}

export default async function ShopItemPage({ params }: PageProps) {
  const company = await getPublicCompanyBySlug(db, params.slug);
  if (!company) notFound();

  const item = await getPublicItem(db, company.id, params.itemId);
  if (!item) notFound();

  const t = await getTranslations("shop");
  const tInventory = await getTranslations("inventory");
  const conditionCfg = ITEM_CONDITION_CONFIG[item.condition];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <Link
            href={`/shop/${params.slug}`}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {company.name}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="grid gap-8 md:grid-cols-2">
          {/* Photo */}
          <div className="aspect-square rounded-xl overflow-hidden border bg-muted">
            {item.photoBase64 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.photoBase64}
                alt={item.description}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Package className="h-16 w-16 text-muted-foreground/30" />
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-xs text-muted-foreground">{item.itemNumber}</p>
              <h1 className="mt-1 text-2xl font-bold leading-tight">{item.description}</h1>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold tabular-nums">
                {item.askingPrice
                  ? formatCurrency(item.askingPrice, item.currency)
                  : t("priceOnRequest")}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{t("conditionLabel")}</span>
              <span
                className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-bold ${conditionCfg?.style ?? "bg-muted text-muted-foreground"}`}
              >
                {conditionCfg?.shortLabel ?? "?"}
                {conditionCfg && (
                  <span className="font-normal">
                    {tInventory(getConditionLabelKey(item.condition))}
                  </span>
                )}
              </span>
            </div>

            {item.category && (
              <p className="text-sm text-muted-foreground capitalize">
                {t("categoryLabel", { category: item.category })}
              </p>
            )}

            {/* Inquiry form */}
            <div className="mt-2">
              <ShopInquiryForm
                companyId={company.id}
                companyName={company.name}
                itemId={item.id}
                itemDescription={item.description}
                slug={params.slug}
              />
            </div>
          </div>
        </div>
      </main>

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
