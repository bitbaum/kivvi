import { getSessionOrRedirect } from "@/lib/session";
import { db } from "@/lib/db";
import { getTranslations } from "next-intl/server";
import { SettingsSubpageHeader } from "@/components/settings-subpage-header";
import { getOrderOptionsForRecurring } from "@kivvi/core/src/domain/recurring-invoices";
import { RecurringConfigForm } from "../recurring-config-form";

export default async function NewRecurringInvoicePage() {
  const session = await getSessionOrRedirect();
  const t = await getTranslations("settings");
  const tc = await getTranslations("common");

  const rawOptions = await getOrderOptionsForRecurring(
    db,
    session.user.companyId,
  );
  const orderOptions = rawOptions.map((o) => ({
    ...o,
    contactName: o.contactName ?? tc("noContact"),
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <SettingsSubpageHeader
        backHref="/settings/recurring-invoices"
        title={t("recurring.createNew")}
        description={t("recurring.createDesc")}
      />

      {/* Form */}
      <RecurringConfigForm orderOptions={orderOptions} />
    </div>
  );
}
