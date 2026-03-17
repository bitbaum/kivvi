import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRecurringConfig } from "@kivvi/core";
import { documents } from "@kivvi/database";
import { eq, and } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { RecurringConfigForm } from "../recurring-config-form";
import { isValidUUID } from "@/lib/utils";

export default async function EditRecurringInvoicePage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user?.companyId) redirect("/login");

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

  // Fetch all orders for dropdown (user might want to change base order)
  const orders = await db
    .select({
      id: documents.id,
      number: documents.number,
      contactId: documents.contactId,
    })
    .from(documents)
    .where(
      and(
        eq(documents.companyId, session.user.companyId),
        eq(documents.type, "order"),
      ),
    )
    .orderBy(documents.number);

  // Fetch contact names
  const contactIds = orders
    .map((o) => o.contactId)
    .filter((id): id is string => id !== null);

  const contacts =
    contactIds.length > 0
      ? await db.query.contacts.findMany({
          where: (contacts, { inArray }) => inArray(contacts.id, contactIds),
          columns: { id: true, name: true },
        })
      : [];

  const contactMap = new Map(contacts.map((c) => [c.id, c.name]));

  const orderOptions = orders.map((o) => ({
    id: o.id,
    number: o.number,
    contactName: o.contactId
      ? contactMap.get(o.contactId) || "Unknown"
      : "No Contact",
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Back link */}
      <Link
        href="/settings/recurring-invoices"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
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
