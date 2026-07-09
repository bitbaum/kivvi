import { getTranslations } from "next-intl/server";
import { SettingsSubpageHeader } from "@/components/settings-subpage-header";
import { PriceListForm } from "../price-list-form";

export default async function NewPriceListPage() {
  const t = await getTranslations("priceLists");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <SettingsSubpageHeader
        backHref="/settings/price-lists"
        title={t("createNew")}
        description={t("subtitle")}
      />

      <PriceListForm />
    </div>
  );
}
