"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { updateDocumentAction } from "@/app/actions/documents";
import type { DocumentTypeConfig } from "@/lib/config/document-types";
import { DEFAULT_VAT_RATE } from "@/lib/config/vat-rates";
import { ContactPicker } from "@/components/contacts/contact-picker";
import { CharCountTextarea } from "@/components/ui/char-count-textarea";
import { FormInput } from "@/components/ui/form-field";
import type { DocumentType } from "@kivvi/database";
import { toast } from "sonner";
import { calculateDocumentTotals } from "./calculate-item-total";
import type { LineItem } from "./document-form-types";
import { EditLineItemsTable } from "./edit-line-items-table";
import { EditDocumentSummary } from "./edit-document-summary";

interface EditDocumentFormProps {
  documentId: string;
  documentType: DocumentType;
  config: DocumentTypeConfig;
  initialData: {
    contactId: string | null;
    contactName: string;
    issueDate: string;
    dueDate: string;
    deliveryDate: string;
    notes: string;
    internalNotes: string;
    items: LineItem[];
  };
}

export function EditDocumentForm({
  documentId,
  documentType: _documentType,
  config,
  initialData,
}: EditDocumentFormProps) {
  const router = useRouter();
  const t = useTranslations("documents");
  const tc = useTranslations("common");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [contactId, setContactId] = useState<string | null>(
    initialData.contactId,
  );
  const [contactName, setContactName] = useState(initialData.contactName);
  const [issueDate, setIssueDate] = useState(initialData.issueDate);
  const [dueDate, setDueDate] = useState(initialData.dueDate);
  const [deliveryDate, setDeliveryDate] = useState(initialData.deliveryDate);
  const [notes, setNotes] = useState(initialData.notes);
  const [internalNotes, setInternalNotes] = useState(initialData.internalNotes);
  const [items, setItems] = useState<LineItem[]>(initialData.items);

  const addItem = () =>
    setItems([
      ...items,
      {
        id: crypto.randomUUID(),
        productId: null,
        inventoryItemId: null,
        description: "",
        quantity: "1",
        unitPrice: "0.00",
        discount: "0",
        vatRate: DEFAULT_VAT_RATE,
        stockQuantity: null,
        minPrice: null,
        maxPrice: null,
      },
    ]);

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(items.filter((i) => i.id !== id));
  };

  const updateItem = (
    id: string,
    field: keyof LineItem,
    value: string | null,
  ) => {
    setItems(items.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  };

  const { subtotal, vatAmount, total } = calculateDocumentTotals(items);

  const handleSubmit = useCallback(async () => {
    setError(null);
    const validItems = items.filter((i) => i.description.trim());
    if (validItems.length === 0) {
      setError(t("atLeastOneItem"));
      return;
    }

    startTransition(async () => {
      const result = await updateDocumentAction(documentId, {
        contactId: contactId || null,
        issueDate,
        dueDate: config.hasDueDate && dueDate ? dueDate : null,
        deliveryDate:
          config.hasDeliveryDate && deliveryDate ? deliveryDate : null,
        notes: notes || null,
        internalNotes: internalNotes || null,
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

      if (result.success) {
        toast.success(t("documentSaved"));
        router.push(`${config.basePath}/${documentId}`);
      } else {
        setError(result.error || tc("error"));
      }
    });
  }, [
    items,
    documentId,
    contactId,
    issueDate,
    dueDate,
    deliveryDate,
    notes,
    internalNotes,
    config,
    t,
    tc,
    router,
    startTransition,
  ]);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`${config.basePath}/${documentId}`}
          className="min-h-[44px] min-w-[44px] rounded-lg p-2 hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold">
            {t("editDocument", { type: t(config.label) })}
          </h1>
          <p className="text-muted-foreground">{t("modifyDraft")}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Contact & dates */}
          <div className="space-y-4 rounded-xl border bg-card p-6">
            <ContactPicker
              value={contactId}
              displayValue={contactName}
              onChange={(id, name) => {
                setContactId(id);
                setContactName(name);
              }}
              contactType={
                config.contactFilter === "vendor" ? "vendor" : "customer"
              }
              allowQuickCreate={false}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium">
                  {t("issueDate")}
                </label>
                <FormInput
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
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
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
              )}
              {config.hasDeliveryDate && (
                <div>
                  <label className="block text-sm font-medium">
                    {t("deliveryDate")}
                  </label>
                  <FormInput
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
              )}
            </div>
          </div>

          <EditLineItemsTable
            items={items}
            onAddItem={addItem}
            onRemoveItem={removeItem}
            onUpdateItem={updateItem}
          />

          {/* Notes */}
          <div className="space-y-4 rounded-xl border bg-card p-6">
            <div>
              <label className="block text-sm font-medium">{tc("notes")}</label>
              <CharCountTextarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
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
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder={t("internalNotesHint", { type: t(config.label) })}
                rows={2}
                maxLength={1000}
                className="mt-1"
              />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <EditDocumentSummary
            subtotal={subtotal}
            vatAmount={vatAmount}
            total={total}
            error={error}
            isPending={isPending}
            onSubmit={handleSubmit}
          />
        </div>
      </div>
    </div>
  );
}
