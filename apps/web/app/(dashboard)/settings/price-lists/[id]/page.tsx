import Link from "next/link";
import { ArrowLeft, Plus, Star } from "lucide-react";
import { notFound } from "next/navigation";
import { getSessionOrRedirect } from "@/lib/session";
import { db } from "@/lib/db";
import { getPriceList } from "@kivvi/core";
import { getTranslations } from "next-intl/server";
import { PriceListForm } from "../price-list-form";
import { PriceRulesTable } from "../price-rules-table";
import { AddRuleForm } from "../add-rule-form";

export default async function PriceListDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSessionOrRedirect();
  const t = await getTranslations("priceLists");
  const tc = await getTranslations("common");

  const list = await getPriceList(db, session.user.companyId, id);
  if (!list) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <Link
        href="/settings/price-lists"
        className="inline-flex min-h-[44px] items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {tc("back")}
      </Link>

      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-bold">{list.name}</h1>
        {list.isDefault && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-sm font-medium text-primary">
            <Star className="h-3.5 w-3.5" />
            {t("defaultBadge")}
          </span>
        )}
      </div>

      {/* Edit basic settings */}
      <section className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold">{tc("settings")}</h2>
        <PriceListForm list={list} />
      </section>

      {/* Price rules */}
      <section className="rounded-xl border bg-card space-y-0">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">{t("rules")}</h2>
        </div>

        <PriceRulesTable rules={list.rules} priceListId={list.id} />

        <div className="px-6 py-4 border-t">
          <h3 className="text-sm font-medium mb-3">{t("addRule")}</h3>
          <AddRuleForm priceListId={list.id} />
        </div>
      </section>
    </div>
  );
}
