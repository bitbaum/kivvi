import { Star } from "lucide-react";
import { notFound } from "next/navigation";
import { getSessionOrRedirect } from "@/lib/session";
import { db } from "@/lib/db";
import { getPriceList } from "@kivvi/core";
import { getTranslations } from "next-intl/server";
import { SettingsSubpageHeader } from "@/components/settings-subpage-header";
import { PriceListForm } from "../price-list-form";
import { PriceRulesTable } from "../price-rules-table";
import { AddRuleForm } from "../add-rule-form";

export default async function PriceListDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSessionOrRedirect();
  const t = await getTranslations("priceLists");
  const tc = await getTranslations("common");

  const list = await getPriceList(db, session.user.companyId, id);
  if (!list) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <SettingsSubpageHeader
        backHref="/settings/price-lists"
        title={list.name}
        badge={
          list.isDefault ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-sm font-medium text-primary">
              <Star className="h-3.5 w-3.5" />
              {t("defaultBadge")}
            </span>
          ) : undefined
        }
      />

      <section className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold">{tc("settings")}</h2>
        <PriceListForm list={list} />
      </section>

      <section className="rounded-xl border bg-card space-y-0">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">{t("rules")}</h2>
        </div>

        <PriceRulesTable rules={list.rules} priceListId={list.id} />

        <div className="border-t px-6 py-4">
          <h3 className="mb-3 text-sm font-medium">{t("addRule")}</h3>
          <AddRuleForm priceListId={list.id} />
        </div>
      </section>
    </div>
  );
}
