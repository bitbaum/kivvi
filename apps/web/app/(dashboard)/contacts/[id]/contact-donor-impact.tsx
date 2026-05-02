import { Leaf, Recycle, PackageCheck } from "lucide-react";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { companies } from "@kivvi/database";
import type { CompanySettings } from "@kivvi/database";
import { getImpactMetrics } from "@kivvi/core/src/domain/impact";
import { DEFAULT_LOCALE } from "@kivvi/core/src/config/locale";
import { CardSection } from "@/components/card-section";

interface ContactDonorImpactProps {
  contactId: string;
  companyId: string;
}

export async function ContactDonorImpact({
  contactId,
  companyId,
}: ContactDonorImpactProps) {
  const t = await getTranslations("contacts");
  const ti = await getTranslations("inventory");

  // Fetch company CO2 factor overrides
  const company = await db.query.companies.findFirst({
    where: eq(companies.id, companyId),
    columns: { settings: true },
  });
  const settings = (company?.settings as CompanySettings) ?? {};

  const metrics = await getImpactMetrics(db, companyId, {
    donorContactId: contactId,
    co2FactorsKg: settings.co2FactorsKg,
  });

  // Only render if this contact has actually donated items
  if (metrics.itemsProcessed === 0) return null;

  const co2Kg = Number(metrics.co2AvoidedKg);
  const co2Display =
    co2Kg >= 1000
      ? `${(co2Kg / 1000).toFixed(1)} t`
      : `${co2Kg.toLocaleString(DEFAULT_LOCALE)} kg`;

  return (
    <CardSection
      title={t("donorImpact")}
      icon={<Leaf className="h-4 w-4 text-success" />}
    >
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <PackageCheck className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-xl font-bold tabular-nums">
            {metrics.itemsProcessed}
          </div>
          <p className="text-xs text-muted-foreground leading-tight">
            {t("donorItemsDonated")}
          </p>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <Recycle className="h-4 w-4 text-success" />
          </div>
          <div className="text-xl font-bold tabular-nums text-success">
            {metrics.reuseRatePercent}%
          </div>
          <p className="text-xs text-muted-foreground leading-tight">
            {ti("reuseRate")}
          </p>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <Leaf className="h-4 w-4 text-success" />
          </div>
          <div className="text-xl font-bold tabular-nums text-success">
            {co2Display}
          </div>
          <p className="text-xs text-muted-foreground leading-tight">
            {ti("co2Avoided")}
          </p>
        </div>
      </div>

      {metrics.itemsReused > 0 && (
        <p className="text-xs text-muted-foreground text-center mt-3 border-t pt-3">
          {t("donorImpactSummary", {
            reused: metrics.itemsReused,
            total: metrics.itemsProcessed,
            co2: co2Display,
          })}
        </p>
      )}
    </CardSection>
  );
}
