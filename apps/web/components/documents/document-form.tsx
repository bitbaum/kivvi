"use client";

import { useTransition, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import {
  useSensor,
  useSensors,
  KeyboardSensor,
  PointerSensor,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { createDocumentAction } from "@/app/actions/documents";
import { listPriceListsAction } from "@/app/actions/pricing";
import { DOCUMENT_TYPES } from "@/lib/config/document-types";
import { CharCountTextarea } from "@/components/ui/char-count-textarea";
import type { DocumentType, PriceList } from "@kivvi/database";
import { IntakeQuickEntry } from "./intake-quick-entry";
import { useDocumentForm, decodePrefill } from "@/hooks/use-document-form";
import { LineItemsEditor } from "./line-items-editor";
import { DocumentSummaryPanel } from "./document-summary-panel";
import { DocumentContactDatesCard } from "./document-contact-dates-card";
import { PriceListApplySlot } from "./price-list-apply-slot";
import type { LineItem } from "./document-form-types";
import { emptyItem } from "./document-form-types";

interface DocumentFormProps {
  type: DocumentType;
}

export function DocumentForm({ type }: DocumentFormProps) {
  const config = DOCUMENT_TYPES[type];
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("documents");
  const tc = useTranslations("common");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isIntake = type === "intake";
  const [intakeSource, setIntakeSource] = useState<string>("donation");
  // Donations don't need pricing on line items. Everything else does.
  const hideLineItemPricing = isIntake && intakeSource === "donation";

  const prefill = decodePrefill(searchParams.get("prefill"));
  const form = useDocumentForm(
    config,
    {
      contactId: searchParams.get("contactId") || undefined,
      contactName: searchParams.get("contactName") || undefined,
      projectId: searchParams.get("projectId") || undefined,
    },
    prefill,
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Fetch price lists for the optional price-list apply slot
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  useEffect(() => {
    listPriceListsAction().then((r) => {
      if (r.success && r.data) setPriceLists(r.data);
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    setError(null);

    const validItems = form.items.filter((i) => i.description.trim());
    if (validItems.length === 0) {
      setError(t("atLeastOneItem"));
      return;
    }

    startTransition(async () => {
      const result = await createDocumentAction({
        type,
        contactId: form.contactId || null,
        issueDate: form.issueDate,
        dueDate: config.hasDueDate && form.dueDate ? form.dueDate : null,
        deliveryDate:
          config.hasDeliveryDate && form.deliveryDate
            ? form.deliveryDate
            : null,
        notes: form.notes || null,
        internalNotes: form.internalNotes || null,
        ...(isIntake && {
          intakeSource,
          donorId: form.contactId || null,
        }),
        items: validItems.map((item, index) => ({
          position: index,
          productId: item.productId || null,
          inventoryItemId: item.inventoryItemId || null,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          vatRate: item.vatRate,
        })),
      });

      if (result.success && result.data) {
        router.push(`${config.basePath}/${result.data.id}`);
      } else {
        setError(
          result.error || t("failedToCreate", { type: t(config.label) }),
        );
      }
    });
  }, [form, type, config, router, t, startTransition, isIntake, intakeSource]);

  // Cmd+Enter (Mac) / Ctrl+Enter (Win/Linux) to submit
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !isPending) {
        e.preventDefault();
        handleSubmit();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleSubmit, isPending]);

  // Auto-focus description field when a new line item is added
  const { lastAddedItemId, setLastAddedItemId } = form;
  useEffect(() => {
    if (lastAddedItemId) {
      requestAnimationFrame(() => {
        const input = document.querySelector<HTMLInputElement>(
          `input[data-item-id="${lastAddedItemId}"][data-field="description"]`,
        );
        input?.focus();
      });
      setLastAddedItemId(null);
    }
  }, [lastAddedItemId, setLastAddedItemId]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={config.basePath}
          className="min-h-[44px] min-w-[44px] rounded-lg p-2 hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold">
            {t("newDocument", { type: t(config.label) })}
          </h1>
          <p className="text-muted-foreground">{t("modifyDraft")}</p>
        </div>
      </div>

      {/* AI prefill banner */}
      {form.isPrefilled && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm text-primary">
          <svg
            className="h-4 w-4 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          {tc("prefilledByAI")}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: form */}
        <div className="lg:col-span-2 space-y-6">
          <DocumentContactDatesCard
            isIntake={isIntake}
            intakeSource={intakeSource}
            onIntakeSourceChange={setIntakeSource}
            contactId={form.contactId}
            contactName={form.contactName}
            onContactChange={(id, name, paymentTermsDays) => {
              form.setContactId(id);
              form.setContactName(name);
              if (config.hasDueDate && paymentTermsDays && form.issueDate) {
                const issue = new Date(form.issueDate);
                issue.setDate(issue.getDate() + paymentTermsDays);
                form.setDueDate(issue.toISOString().split("T")[0]);
              }
            }}
            contactFilter={config.contactFilter}
            issueDate={form.issueDate}
            onIssueDateChange={form.setIssueDate}
            hasDueDate={config.hasDueDate}
            dueDateLabel={t(config.dueDateLabel)}
            dueDate={form.dueDate}
            onDueDateChange={form.setDueDate}
            hasDeliveryDate={config.hasDeliveryDate}
            deliveryDate={form.deliveryDate}
            onDeliveryDateChange={form.setDeliveryDate}
          />

          {/* AI Quick Entry — available on all document types */}
          <IntakeQuickEntry onItemsExtracted={form.addItemsBulk} />

          {/* Line items */}
          <LineItemsEditor
            items={form.items}
            sensors={sensors}
            onDragEnd={form.handleDragEnd}
            onAddItem={form.addItem}
            onUpdateItem={(id, field, value) =>
              form.updateItem(id, field, value)
            }
            onRemoveItem={form.removeItem}
            hideFinancials={hideLineItemPricing}
            priceLabel={
              isIntake && !hideLineItemPricing
                ? t("acquisitionCost")
                : undefined
            }
            priceListSlot={
              !hideLineItemPricing && priceLists.length > 0 ? (
                <PriceListApplySlot
                  priceLists={priceLists}
                  items={form.items}
                  onApply={(updates) => {
                    Object.entries(updates).forEach(([productId, price]) => {
                      const item = form.items.find(
                        (i) => i.productId === productId,
                      );
                      if (item) form.updateItem(item.id, "unitPrice", price);
                    });
                  }}
                />
              ) : undefined
            }
            t={t}
            tc={tc}
          />

          {/* Notes */}
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium">{tc("notes")}</label>
              <CharCountTextarea
                value={form.notes}
                onChange={(e) => form.setNotes(e.target.value)}
                placeholder={t("notesOnDocument", { type: t(config.label) })}
                rows={3}
                maxLength={1000}
                className="mt-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">
                {t("internalNotes")}
              </label>
              <CharCountTextarea
                value={form.internalNotes}
                onChange={(e) => form.setInternalNotes(e.target.value)}
                placeholder={t("internalNotesHint", { type: t(config.label) })}
                rows={2}
                maxLength={1000}
                className="mt-1"
              />
            </div>
          </div>
        </div>

        {/* Right: summary */}
        <div className="space-y-6">
          <DocumentSummaryPanel
            config={config}
            subtotal={form.subtotal}
            vatAmount={form.vatAmount}
            total={form.total}
            hideFinancials={hideLineItemPricing}
            itemCount={form.items.filter((i) => i.description.trim()).length}
            totalQuantity={form.items.reduce(
              (sum, i) => sum + (parseFloat(i.quantity) || 0),
              0,
            )}
            error={error}
            isPending={isPending}
            onSubmit={handleSubmit}
            t={t}
            tc={tc}
          />
        </div>
      </div>
    </div>
  );
}
