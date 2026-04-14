import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getSessionOrRedirect } from "@/lib/session";
import { db } from "@/lib/db";
import { getInventoryItem } from "@kivvi/core";
import { isValidUUID } from "@/lib/utils";
import {
  getChecklistTemplate,
  ITEM_CATEGORIES,
} from "@kivvi/core/src/config/checklist-templates";
import type { ChecklistData } from "@kivvi/core/src/config/checklist-templates";
import { ChecklistForm } from "./checklist-form";
import { DetailPageHeader } from "@/components/page-header";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ category?: string }>;
}

/**
 * Testing page — checklist-driven quality assessment for an inventory item.
 *
 * If the item has no category yet, shows a category selector first.
 * The category determines which checklist template to load.
 */
export default async function TestItemPage({
  params,
  searchParams,
}: PageProps) {
  const session = await getSessionOrRedirect();
  const tc = await getTranslations("inventory");
  const tl = await getTranslations("checklist");
  const { id } = await params;
  const { category: categoryParam } = await searchParams;
  if (!isValidUUID(id)) notFound();

  const item = await getInventoryItem(db, session.user.companyId, id);
  if (!item) notFound();

  // Only items in testing or intake status can be tested
  if (!["intake", "testing"].includes(item.status)) {
    redirect(`/intake/items/${id}`);
  }

  const checklistData = item.checklistData as ChecklistData | null;
  // Category resolution: query param > saved on item > from existing checklist data
  const category =
    (categoryParam && ITEM_CATEGORIES.includes(categoryParam)
      ? categoryParam
      : null) ??
    item.category ??
    checklistData?.category ??
    null;

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-6">
      <DetailPageHeader
        breadcrumbs={[
          { label: tc("itemsTitle"), href: "/intake/items" },
          { label: item.itemNumber, href: `/intake/items/${id}` },
          { label: tc("testItem") },
        ]}
        title={tc("checklistTitle")}
        subtitle={item.description}
        backHref={`/intake/items/${id}`}
      />

      {/* Category selector — shown when no category is set */}
      {!category ? (
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">{tc("selectCategory")}</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            {tl("noCategorySelected")}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ITEM_CATEGORIES.map((cat) => {
              const template = getChecklistTemplate(cat);
              return (
                <Link
                  key={cat}
                  href={`/intake/items/${id}/test?category=${cat}`}
                  className="rounded-xl border bg-background p-3 text-center text-sm font-medium hover:bg-muted hover:border-primary transition-colors"
                >
                  {tl(template.labelKey)}
                </Link>
              );
            })}
          </div>
        </div>
      ) : (
        <ChecklistForm
          itemId={id}
          userId={session.user.id}
          category={category}
          template={getChecklistTemplate(category)}
          existingData={checklistData}
          currentCondition={item.condition}
          currentStatus={item.status}
        />
      )}
    </div>
  );
}
