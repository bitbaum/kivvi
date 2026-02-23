import { useState } from 'react';
import Decimal from 'decimal.js';
import type { DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { DEFAULT_PAYMENT_TERMS_DAYS, type DocumentTypeConfig } from '@/lib/config/document-types';
import { rappenRound } from '@kivvi/core/src/utils/swiss-currency';
import type { LineItem } from '@/components/documents/document-form';
import { emptyItem, calculateItemTotal } from '@/components/documents/document-form';

export function useDocumentForm(config: DocumentTypeConfig) {
  const [contactId, setContactId] = useState<string | null>(null);
  const [contactName, setContactName] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    config.hasDueDate
      ? new Date(Date.now() + DEFAULT_PAYMENT_TERMS_DAYS * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      : ''
  );
  const [deliveryDate, setDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [items, setItems] = useState<LineItem[]>([emptyItem()]);

  // Line item management
  const addItem = () => setItems([...items, emptyItem()]);
  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(items.filter((i) => i.id !== id));
  };
  const updateItem = (id: string, field: keyof LineItem, value: string) => {
    if (field === 'discount') {
      const num = parseFloat(value);
      if (!isNaN(num) && num > 100) value = '100';
      if (!isNaN(num) && num < 0) value = '0';
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

  // Totals (decimal.js for exact arithmetic)
  const subtotal = items.reduce((sum, item) => sum.plus(calculateItemTotal(item)), new Decimal(0));
  const vatAmount = items.reduce((sum, item) => {
    const lineTotal = calculateItemTotal(item);
    try {
      const vatRate = new Decimal(item.vatRate || '0');
      return sum.plus(lineTotal.times(vatRate).div(100).toDecimalPlaces(2));
    } catch {
      return sum;
    }
  }, new Decimal(0));
  const total = rappenRound(subtotal.plus(vatAmount));

  return {
    contactId, setContactId,
    contactName, setContactName,
    issueDate, setIssueDate,
    dueDate, setDueDate,
    deliveryDate, setDeliveryDate,
    notes, setNotes,
    internalNotes, setInternalNotes,
    items,
    addItem, removeItem, updateItem,
    handleDragEnd,
    subtotal, vatAmount, total,
  };
}
