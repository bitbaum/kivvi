import { useState } from "react";
import type { DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { DEFAULT_PAYMENT_TERMS_DAYS, type DocumentTypeConfig } from "@/lib/config/document-types";
import type { LineItem } from "@/components/documents/document-form-types";
import { emptyItem } from "@/components/documents/document-form-types";
import { calculateDocumentTotals } from "@/components/documents/calculate-item-total";

export interface DocumentFormInitialValues {
  contactId?: string;
  contactName?: string;
  projectId?: string;
}

/** Data shape for AI-driven form pre-filling via ?prefill= query param */
export interface DocumentPrefill {
  contactId?: string;
  contactName?: string;
  issueDate?: string;
  dueDate?: string;
  notes?: string;
  items?: Array<{
    description: string;
    quantity: string;
    unitPrice: string;
    vatRate: string;
    discount?: string;
    productId?: string;
    inventoryItemId?: string;
  }>;
}

/** Decode a base64url-encoded prefill param. Returns null on failure. */
export function decodePrefill(encoded: string | null): DocumentPrefill | null {
  if (!encoded) return null;
  try {
    const json = atob(encoded.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json) as DocumentPrefill;
  } catch {
    return null;
  }
}

export function useDocumentForm(
  config: DocumentTypeConfig,
  initial?: DocumentFormInitialValues,
  prefill?: DocumentPrefill | null,
) {
  const [contactId, setContactId] = useState<string | null>(
    prefill?.contactId || initial?.contactId || null,
  );
  const [contactName, setContactName] = useState(
    prefill?.contactName || initial?.contactName || "",
  );
  const [issueDate, setIssueDate] = useState(
    prefill?.issueDate || new Date().toISOString().split("T")[0],
  );
  const [dueDate, setDueDate] = useState(
    prefill?.dueDate ||
      (config.hasDueDate
        ? new Date(Date.now() + DEFAULT_PAYMENT_TERMS_DAYS * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0]
        : ""),
  );
  const [deliveryDate, setDeliveryDate] = useState("");
  const [notes, setNotes] = useState(prefill?.notes || "");
  const [internalNotes, setInternalNotes] = useState("");
  const [isPrefilled] = useState(!!prefill?.items?.length);

  // Initialize items from prefill or empty
  const initialItems: LineItem[] = prefill?.items?.map((item) => ({
    ...emptyItem(),
    productId: item.productId || null,
    inventoryItemId: item.inventoryItemId || null,
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    vatRate: item.vatRate,
    discount: item.discount || "0",
  })) || [emptyItem()];

  const [items, setItems] = useState<LineItem[]>(initialItems);

  // Track last added item for auto-focus
  const [lastAddedItemId, setLastAddedItemId] = useState<string | null>(null);

  // Line item management
  const addItem = () => {
    const newItem = emptyItem();
    setItems([...items, newItem]);
    setLastAddedItemId(newItem.id);
  };
  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(items.filter((i) => i.id !== id));
  };
  const updateItem = (id: string, field: keyof LineItem, value: string | null) => {
    if (field === "discount" && value !== null) {
      const num = parseFloat(value);
      if (!isNaN(num) && num > 100) value = "100";
      if (!isNaN(num) && num < 0) value = "0";
    }
    setItems(items.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  };

  /** Bulk-add items from AI extraction. Replaces empty initial items. */
  const addItemsBulk = (
    newItems: Array<{
      description: string;
      quantity: string;
      unitPrice?: string;
    }>,
  ) => {
    const hasExisting = items.some((i) => i.description.trim());
    const bulkItems: LineItem[] = newItems.map((item) => ({
      ...emptyItem(),
      description: item.description,
      quantity: item.quantity,
      ...(item.unitPrice ? { unitPrice: item.unitPrice } : {}),
    }));

    if (!hasExisting) {
      // Replace the empty initial item(s)
      setItems(bulkItems);
    } else {
      // Append to existing items
      setItems([...items, ...bulkItems]);
    }
  };

  // Handle drag end - reorder items
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Totals (decimal.js for exact arithmetic, single source of calculation logic)
  const { subtotal, vatAmount, total } = calculateDocumentTotals(items);

  return {
    contactId,
    setContactId,
    contactName,
    setContactName,
    issueDate,
    setIssueDate,
    dueDate,
    setDueDate,
    deliveryDate,
    setDeliveryDate,
    notes,
    setNotes,
    internalNotes,
    setInternalNotes,
    items,
    addItem,
    removeItem,
    updateItem,
    handleDragEnd,
    lastAddedItemId,
    setLastAddedItemId,
    subtotal,
    vatAmount,
    total,
    isPrefilled,
    addItemsBulk,
  };
}
