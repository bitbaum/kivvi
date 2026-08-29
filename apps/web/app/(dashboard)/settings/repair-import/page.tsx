import { getTranslations } from "next-intl/server";
import { SettingsSubpageHeader } from "@/components/settings-subpage-header";
import { RepairImportForm } from "./repair-import-form";
import { ProductImportPanel } from "./product-import-panel";

export default async function RepairImportPage() {
  const t = await getTranslations("settings");

  return (
    <div className="space-y-10">
      <SettingsSubpageHeader
        title={t("repairImport.title")}
        description={t("repairImport.description")}
      />

      {/* Product import from kivitendo CSV */}
      <section className="space-y-4">
        <ProductImportPanel />
      </section>

      {/* Document line-item repair */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">{t("repairImport.lineItemTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("repairImport.lineItemDescription")}</p>
        </div>
        <RepairImportForm />
      </section>
    </div>
  );
}
