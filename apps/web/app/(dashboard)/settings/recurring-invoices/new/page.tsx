import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSessionOrRedirect } from "@/lib/session";
import { db } from "@/lib/db";
import { getTranslations } from "next-intl/server";
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
      {/* Back link */}
      <Link
        href="/settings/recurring-invoices"
        className="inline-flex min-h-[44px] items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {tc("back")}
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{t("recurring.createNew")}</h1>
        <p className="text-muted-foreground">{t("recurring.createDesc")}</p>
      </div>

      {/* Form */}
      <RecurringConfigForm orderOptions={orderOptions} />
    </div>
  );
}
