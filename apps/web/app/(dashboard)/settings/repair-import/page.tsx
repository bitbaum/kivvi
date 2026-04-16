import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { RepairImportForm } from "./repair-import-form";
import { ProductImportPanel } from "./product-import-panel";

export default async function RepairImportPage() {
  const t = await getTranslations("settings");

  return (
    <div className="space-y-10">
      <div className="flex items-center gap-4">
        <Link
          href="/settings"
          className="min-h-[44px] min-w-[44px] rounded-lg border p-2 hover:bg-muted/50"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{t("repairImport.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("repairImport.description")}
          </p>
        </div>
      </div>

      {/* Product import from kivitendo CSV */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Artikelstamm importieren</h2>
          <p className="text-sm text-muted-foreground">
            Kompletten Artikelstamm aus einem Kivitendo-Export laden — einmalig
            nach Migration oder wenn neue Produkte extern erfasst wurden.
          </p>
        </div>
        <ProductImportPanel />
      </section>

      {/* Document line-item repair */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">{t("repairImport.title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("repairImport.description")}
          </p>
        </div>
        <RepairImportForm />
      </section>
    </div>
  );
}
