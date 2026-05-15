import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSessionOrRedirect } from "@/lib/session";
import { db } from "@/lib/db";
import { getRecurringConfig } from "@kivvi/core";
import { getOrderOptionsForRecurring } from "@kivvi/core/src/domain/recurring-invoices";
import { getTranslations } from "next-intl/server";
import { RecurringConfigForm } from "../recurring-config-form";
import { isValidUUID } from "@/lib/utils";

export default async function EditRecurringInvoicePage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getSessionOrRedirect();
  if (!isValidUUID(params.id)) notFound();

  const t = await getTranslations("settings");
  const tc = await getTranslations("common");

  // Fetch config
  let config;
  try {
    config = await getRecurringConfig(db, session.user.companyId, params.id);
  } catch (error) {
    notFound();
  }

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
        <h1 className="text-3xl font-bold">{t("recurring.edit")}</h1>
        <p className="text-muted-foreground">{t("recurring.editDesc")}</p>
      </div>

      {/* Form */}
      <RecurringConfigForm
        orderOptions={orderOptions}
        initialData={{
          id: config.id,
          orderId: config.orderId,
          periodicity: config.periodicity,
          startDate: config.startDate,
          endDate: config.endDate,
          autoExtensionMonths: config.autoExtensionMonths,
          emailRecipients: config.emailRecipients,
          notes: config.notes,
          isActive: config.isActive,
        }}
      />
    </div>
  );
}
