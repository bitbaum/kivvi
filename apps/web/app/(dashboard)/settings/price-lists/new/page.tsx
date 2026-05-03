import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PriceListForm } from "../price-list-form";

export default async function NewPriceListPage() {
  const t = await getTranslations("priceLists");
  const tc = await getTranslations("common");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/settings/price-lists"
        className="inline-flex min-h-[44px] items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {tc("back")}
      </Link>

      <div>
        <h1 className="text-3xl font-bold">{t("createNew")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <PriceListForm />
    </div>
  );
}
