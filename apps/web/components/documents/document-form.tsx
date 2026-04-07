"use client";

import { useTransition, useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import Decimal from "decimal.js";
import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { createDocumentAction } from "@/app/actions/documents";
import { DOCUMENT_TYPES } from "@/lib/config/document-types";
import { DEFAULT_VAT_RATE } from "@/lib/config/vat-rates";
import { ContactPicker } from "@/components/contacts/contact-picker";
import { CharCountTextarea } from "@/components/ui/char-count-textarea";
import { FormInput, FormSelect } from "@/components/ui/form-field";
import type { DocumentType } from "@kivvi/database";
import { SortableLineItem } from "./sortable-line-item";
import { IntakeQuickEntry } from "./intake-quick-entry";
import { useDocumentForm, decodePrefill } from "@/hooks/use-document-form";

// ============================================================================
// LINE ITEM TYPES (exported for use by SortableLineItem + useDocumentForm)
// ============================================================================

export interface LineItem {
  id: string;
  productId: string | null;
  inventoryItemId: string | null;
  description: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  vatRate: string;
  stockQuantity: string | null;
}

export function emptyItem(): LineItem {
  return {
    id: crypto.randomUUID(),
    productId: null,
    inventoryItemId: null,
    description: "",
    quantity: "1",
    unitPrice: "0.00",
    discount: "0",
    vatRate: DEFAULT_VAT_RATE,
    stockQuantity: null,
  };
}

export {
  calculateItemTotal,
  calculateDocumentTotals,
} from "./calculate-item-total";

// ============================================================================
// DOCUMENT FORM COMPONENT
// ============================================================================

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
        // Intake-specific fields: source + donor (same contact, different role)
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
  }, [form, type, config, router, t, startTransition]);

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
          {/* Contact & dates */}
          <div className="rounded-xl border bg-card p-6 space-y-4">
            {/* Intake source selector — shown first so it controls the rest of the form */}
            {isIntake && (
              <div>
                <label className="block text-sm font-medium">
                  {t("intakeSource")}
                </label>
                <FormSelect
                  className="mt-1"
                  value={intakeSource}
                  onChange={(e) => setIntakeSource(e.target.value)}
                >
                  <option value="donation">{t("intakeSourceDonation")}</option>
                  <option value="purchase">{t("intakeSourcePurchase")}</option>
                  <option value="trade_in">{t("intakeSourceTradeIn")}</option>
                  <option value="consignment">
                    {t("intakeSourceConsignment")}
                  </option>
                  <option value="estate_clearance">
                    {t("intakeSourceEstate")}
                  </option>
                  <option value="return">{t("intakeSourceReturn")}</option>
                  <option value="other">{t("intakeSourceOther")}</option>
                </FormSelect>
                <p className="mt-1 text-xs text-muted-foreground">
                  {intakeSource === "donation" && t("intakeSourceDonationHint")}
                  {intakeSource === "purchase" && t("intakeSourcePurchaseHint")}
                  {intakeSource === "trade_in" && t("intakeSourceTradeInHint")}
                  {intakeSource === "consignment" &&
                    t("intakeSourceConsignmentHint")}
                  {intakeSource === "estate_clearance" &&
                    t("intakeSourceEstateHint")}
                  {intakeSource === "return" && t("intakeSourceReturnHint")}
                </p>
              </div>
            )}

            {/* Contact — label adapts to intake source */}
            {isIntake && (
              <label className="block text-sm font-medium text-muted-foreground">
                {intakeSource === "donation"
                  ? t("intakeContactDonor")
                  : intakeSource === "purchase" ||
                      intakeSource === "estate_clearance"
                    ? t("intakeContactSeller")
                    : intakeSource === "trade_in" || intakeSource === "return"
                      ? t("intakeContactCustomer")
                      : intakeSource === "consignment"
                        ? t("intakeContactOwner")
                        : t("intakeContactSeller")}
              </label>
            )}
            <ContactPicker
              value={form.contactId}
              displayValue={form.contactName}
              onChange={(id, name, paymentTermsDays) => {
                form.setContactId(id);
                form.setContactName(name);
                if (config.hasDueDate && paymentTermsDays && form.issueDate) {
                  const issue = new Date(form.issueDate);
                  issue.setDate(issue.getDate() + paymentTermsDays);
                  form.setDueDate(issue.toISOString().split("T")[0]);
                }
              }}
              contactType={
                config.contactFilter === "vendor" ? "vendor" : "customer"
              }
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="issueDate"
                  className="block text-sm font-medium"
                >
                  {t("issueDate")}
                </label>
                <FormInput
                  id="issueDate"
                  type="date"
                  value={form.issueDate}
                  onChange={(e) => form.setIssueDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              {config.hasDueDate && (
                <div>
                  <label className="block text-sm font-medium">
                    {t(config.dueDateLabel)}
                  </label>
                  <FormInput
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => form.setDueDate(e.target.value)}
                    min={form.issueDate}
                    className="mt-1"
                  />
                  {form.dueDate &&
                    form.issueDate &&
                    form.dueDate < form.issueDate && (
                      <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                        {t("dueDateBeforeIssueDate")}
                      </p>
                    )}
                </div>
              )}
              {config.hasDeliveryDate && (
                <div>
                  <label className="block text-sm font-medium">
                    {t("deliveryDate")}
                  </label>
                  <FormInput
                    type="date"
                    value={form.deliveryDate}
                    onChange={(e) => form.setDeliveryDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
              )}
            </div>
          </div>

          {/* AI Quick Entry (intake only) */}
          {isIntake && (
            <IntakeQuickEntry onItemsExtracted={form.addItemsBulk} />
          )}

          {/* Line items */}
          <div className="rounded-xl border bg-card">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="font-semibold">{t("lineItems")}</h2>
              <button
                type="button"
                onClick={form.addItem}
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <Plus className="h-4 w-4" />
                {t("addItem")}
              </button>
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={form.handleDragEnd}
            >
              <SortableContext
                items={form.items.map((item) => item.id)}
                strategy={verticalListSortingStrategy}
              >
                <div>
                  {form.items.map((item, index) => (
                    <SortableLineItem
                      key={item.id}
                      item={item}
                      index={index}
                      updateItem={form.updateItem}
                      removeItem={form.removeItem}
                      canRemove={form.items.length > 1}
                      hideFinancials={hideLineItemPricing}
                      priceLabel={
                        isIntake && !hideLineItemPricing
                          ? t("acquisitionCost")
                          : undefined
                      }
                      t={t}
                      tc={tc}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>

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
          <div className="sticky top-6 rounded-xl border bg-card p-6">
            <h2 className="mb-4 font-semibold">{t("summary")}</h2>
            {hideLineItemPricing ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("lineItems")}
                  </span>
                  <span className="font-medium">
                    {form.items.filter((i) => i.description.trim()).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("quantity")}</span>
                  <span className="font-medium">
                    {form.items.reduce(
                      (sum, i) => sum + (parseFloat(i.quantity) || 0),
                      0,
                    )}
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {tc("subtotal")}
                  </span>
                  <span>CHF {form.subtotal.toFixed(2).toString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("vat")}</span>
                  <span>CHF {form.vatAmount.toFixed(2).toString()}</span>
                </div>
                <div className="flex justify-between border-t pt-2 text-lg font-bold">
                  <span>{tc("total")}</span>
                  <span>CHF {form.total.toFixed(2).toString()}</span>
                </div>
              </div>
            )}

            {error && (
              <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending}
              className="mt-6 w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending ? (
                tc("creating")
              ) : (
                <span className="flex items-center justify-center gap-2">
                  {t("newDocument", { type: t(config.label) })}
                  <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-primary-foreground/20 bg-primary-foreground/10 px-1.5 py-0.5 text-[10px] font-mono">
                    ⌘↵
                  </kbd>
                </span>
              )}
            </button>

            <p className="mt-2 text-center text-xs text-muted-foreground">
              {t("createdAsDraft", { type: t(config.label) })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
