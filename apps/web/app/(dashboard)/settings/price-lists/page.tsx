import Link from "next/link";
import { ArrowLeft, Plus, Tag } from "lucide-react";
import { getSessionOrRedirect } from "@/lib/session";
import { db } from "@/lib/db";
import { listPriceLists } from "@kivvi/core";
import { getTranslations } from "next-intl/server";
import { PriceListRow } from "./price-list-row";

export default async function PriceListsPage() {
  const session = await getSessionOrRedirect();
  const t = await getTranslations("priceLists");
  const tc = await getTranslations("common");

  const lists = await listPriceLists(db, session.user.companyId);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        href="/settings"
        className="inline-flex min-h-[44px] items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {tc("back")}
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Link
          href="/settings/price-lists/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          {t("createNew")}
        </Link>
      </div>

      <div className="rounded-xl border bg-card">
        {lists.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Tag className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">{tc("noResults")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t("noLists")}</p>
            <Link
              href="/settings/price-lists/new"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              {t("createFirst")}
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[2fr_1fr_1fr_auto] gap-4 border-b px-6 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <div>{t("fieldName")}</div>
              <div>{t("fieldCurrency")}</div>
              <div>{t("rules")}</div>
              <div />
            </div>
            <div className="divide-y">
              {lists.map((list) => (
                <PriceListRow
                  key={list.id}
                  list={list}
                  defaultBadge={t("defaultBadge")}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
