import { notFound } from "next/navigation";
import { getSessionOrRedirect } from "@/lib/session";
import { db } from "@/lib/db";
import { getInventoryItem } from "@kivvi/core";
import { isValidUUID } from "@/lib/utils";
import { DetailPageHeader } from "@/components/page-header";
import { getTranslations } from "next-intl/server";
import { ItemEditForm } from "./item-edit-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditInventoryItemPage({ params }: PageProps) {
  const session = await getSessionOrRedirect();
  const tc = await getTranslations("common");
  const { id } = await params;
  if (!isValidUUID(id)) notFound();

  const item = await getInventoryItem(db, session.user.companyId, id);
  if (!item) notFound();

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
          notes: item.notes,
          repairCost: item.repairCost,
          repairHours: item.repairHours,
          repairLog: item.repairLog,
          photoBase64: item.photoBase64,
        }}
      />
    </div>
  );
}
