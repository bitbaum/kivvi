import { useState } from "react";
import type { DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import {
  DEFAULT_PAYMENT_TERMS_DAYS,
  type DocumentTypeConfig,
} from "@/lib/config/document-types";
import type { LineItem } from "@/components/documents/document-form";
import { emptyItem } from "@/components/documents/document-form";
import { calculateDocumentTotals } from "@/components/documents/calculate-item-total";

export interface DocumentFormInitialValues {
  contactId?: string;
  contactName?: string;
  projectId?: string;
}

export function useDocumentForm(
  config: DocumentTypeConfig,
  initial?: DocumentFormInitialValues,
) {
  const [contactId, setContactId] = useState<string | null>(
    initial?.contactId || null,
  );
  const [contactName, setContactName] = useState(initial?.contactName || "");
  const [issueDate, setIssueDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [dueDate, setDueDate] = useState(
    config.hasDueDate
      ? new Date(Date.now() + DEFAULT_PAYMENT_TERMS_DAYS * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0]
      : "",
  );
  const [deliveryDate, setDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([emptyItem()]);

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
  const updateItem = (
    id: string,
    field: keyof LineItem,
    value: string | null,
  ) => {
    if (field === "discount" && value !== null) {
      const num = parseFloat(value);
      if (!isNaN(num) && num > 100) value = "100";
      if (!isNaN(num) && num < 0) value = "0";
    }
    setItems(items.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
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
  };
}
