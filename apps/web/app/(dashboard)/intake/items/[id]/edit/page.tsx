import { notFound } from "next/navigation";
import { getSessionOrRedirect } from "@/lib/session";
import { db } from "@/lib/db";
import { getInventoryItem } from "@kivvi/core";
import { isValidUUID } from "@/lib/utils";
import { DetailPageHeader } from "@/components/page-header";
import { getTranslations } from "next-intl/server";
import { ItemEditForm } from "./item-edit-form";
import { eq } from "drizzle-orm";
import { users, companies } from "@kivvi/database";
import type { CompanySettings } from "@kivvi/database";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditInventoryItemPage({ params }: PageProps) {
  const session = await getSessionOrRedirect();
  const tc = await getTranslations("common");
  const { id } = await params;
  if (!isValidUUID(id)) notFound();

  const [item, companyUsers, companyRow] = await Promise.all([
    getInventoryItem(db, session.user.companyId, id),
    db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.companyId, session.user.companyId)),
    db
      .select({ settings: companies.settings })
      .from(companies)
      .where(eq(companies.id, session.user.companyId))
      .then((r) => r[0]),
  ]);
  if (!item) notFound();

  const settings = (companyRow?.settings as CompanySettings | undefined) ?? {};

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <DetailPageHeader
        breadcrumbs={[
          { label: tc("intake"), href: "/intake" },
          { label: tc("items"), href: "/intake/items" },
          { label: item.itemNumber, href: `/intake/items/${id}` },
          { label: tc("edit") },
        ]}
        title={`${tc("edit")} ${item.itemNumber}`}
        subtitle={item.description}
        backHref={`/intake/items/${id}`}
      />

      <ItemEditForm
        item={{
          id: item.id,
          itemNumber: item.itemNumber,
          description: item.description,
          condition: item.condition,
          status: item.status,
          serialNumber: item.serialNumber,
          location: item.location,
          estimatedValue: item.estimatedValue,
          askingPrice: item.askingPrice,
          minPrice: item.minPrice,
          consignmentRate: item.consignmentRate,
          notes: item.notes,
          repairCost: item.repairCost,
          repairHours: item.repairHours,
          repairLog: item.repairLog,
          photoBase64: item.photoBase64,
          category: item.category ?? null,
          specs: (item.specs as Record<string, string>) || null,
          assignedToUserId: item.assignedToUserId ?? null,
        }}
        companyUsers={companyUsers.map((u) => ({
          id: u.id,
          label: u.name || u.email,
        }))}
        defaultRepairHourlyRate={settings.defaultRepairHourlyRate || ""}
      />
    </div>
  );
}
