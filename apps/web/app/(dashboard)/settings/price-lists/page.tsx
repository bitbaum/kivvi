import Link from "next/link";
import { Plus, Tag } from "lucide-react";
import { getSessionOrRedirect } from "@/lib/session";
import { db } from "@/lib/db";
import { listPriceLists } from "@kivvi/core";
import { getTranslations } from "next-intl/server";
import { SettingsSubpageHeader } from "@/components/settings-subpage-header";
import { Button } from "@/components/ui/button";
import { PriceListRow } from "./price-list-row";

export default async function PriceListsPage() {
  const session = await getSessionOrRedirect();
  const t = await getTranslations("priceLists");
  const tc = await getTranslations("common");

  const lists = await listPriceLists(db, session.user.companyId);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <SettingsSubpageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          <Button asChild>
            <Link href="/settings/price-lists/new">
              <Plus className="h-4 w-4" />
              {t("createNew")}
            </Link>
          </Button>
        }
      />

      <div className="rounded-xl border bg-card">
        {lists.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Tag className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">{tc("noResults")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t("noLists")}</p>
            <Button asChild className="mt-4">
              <Link href="/settings/price-lists/new">
                <Plus className="h-4 w-4" />
                {t("createFirst")}
              </Link>
            </Button>
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
