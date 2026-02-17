'use client';

import { useState, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Decimal from 'decimal.js';
import { ArrowLeft, Plus, Trash2, Search, UserPlus, GripVertical } from 'lucide-react';
import Link from 'next/link';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createDocumentAction } from '@/app/actions/documents';
import { searchContactsAction } from '@/app/actions/contacts';
import { DOCUMENT_TYPES, DEFAULT_PAYMENT_TERMS_DAYS, type DocumentTypeConfig } from '@/lib/config/document-types';
import { SWISS_VAT_RATES, DEFAULT_VAT_RATE } from '@/lib/config/vat-rates';
import { QuickCreateContactModal } from '@/components/contacts/quick-create-modal';
import { CharCountTextarea } from '@/components/ui/char-count-textarea';
import type { DocumentType } from '@kivvi/database';
import { rappenRound } from '@kivvi/core/src/utils/swiss-currency';

// ============================================================================
// LINE ITEM TYPES
// ============================================================================

interface LineItem {
  id: string;
  productId: string | null;
  description: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  vatRate: string;
}

function emptyItem(): LineItem {
  return {
    id: crypto.randomUUID(),
    productId: null,
    description: '',
    quantity: '1',
    unitPrice: '0.00',
    discount: '0',
    vatRate: DEFAULT_VAT_RATE,
  };
}

function calculateItemTotal(item: LineItem): Decimal {
  try {
    const qty = new Decimal(item.quantity || '0');
    const price = new Decimal(item.unitPrice || '0');
    const discount = new Decimal(item.discount || '0');
    const gross = qty.times(price);
    return gross.minus(gross.times(discount).div(100)).toDecimalPlaces(2);
  } catch {
    return new Decimal(0);
  }
}

// ============================================================================
// SORTABLE LINE ITEM COMPONENT
// ============================================================================

interface SortableLineItemProps {
  item: LineItem;
  index: number;
  updateItem: (id: string, field: keyof LineItem, value: string) => void;
  removeItem: (id: string) => void;
  canRemove: boolean;
  t: (key: string) => string;
  tc: (key: string) => string;
}

function SortableLineItem({ item, index, updateItem, removeItem, canRemove, t, tc }: SortableLineItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="p-4 space-y-3 border-b last:border-b-0">
      <div className="flex items-start gap-3">
        {/* Drag handle */}
        <button
          type="button"
          className="mt-2.5 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors touch-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" />
        </button>

        <span className="mt-2.5 text-sm text-muted-foreground w-6">{index + 1}</span>

        <div className="flex-1 space-y-3">
          <input
            type="text"
            value={item.description}
            onChange={(e) => updateItem(item.id, 'description', e.target.value)}
            placeholder={tc('description')}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <div>
              <label className="block text-xs text-muted-foreground">{t('quantity')}</label>
              <input
                type="number"
                step="0.01"
                value={item.quantity}
                onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground">{t('unitPrice')}</label>
              <input
                type="number"
                step="0.01"
                value={item.unitPrice}
                onChange={(e) => updateItem(item.id, 'unitPrice', e.target.value)}
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground">{t('discount')} %</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={item.discount}
                onChange={(e) => updateItem(item.id, 'discount', e.target.value)}
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground">{t('vatRate')} %</label>
              <select
                value={item.vatRate}
                onChange={(e) => updateItem(item.id, 'vatRate', e.target.value)}
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              >
                {SWISS_VAT_RATES.map((rate) => (
                  <option key={rate.value} value={rate.value}>
                    {rate.value}%
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground">{tc('total')}</label>
              <div className="mt-1 rounded-lg border bg-muted px-3 py-2 text-sm font-medium">
                {calculateItemTotal(item).toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {canRemove && (
          <button
            type="button"
            onClick={() => removeItem(item.id)}
            className="mt-2 rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// DOCUMENT FORM COMPONENT
// ============================================================================

interface DocumentFormProps {
  type: DocumentType;
}

export function DocumentForm({ type }: DocumentFormProps) {
  const config = DOCUMENT_TYPES[type];
  const router = useRouter();
  const t = useTranslations('documents');
  const tc = useTranslations('common');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [contactId, setContactId] = useState<string | null>(null);
  const [contactSearch, setContactSearch] = useState('');
  const [contactResults, setContactResults] = useState<Array<{ id: string; name: string; contactNumber: string | null; email: string | null }>>([]);
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const [showQuickCreateModal, setShowQuickCreateModal] = useState(false);

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

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  // Contact search
  const handleContactSearch = useCallback(async (query: string) => {
    setContactSearch(query);
    if (query.length < 2) {
      setContactResults([]);
      setShowContactDropdown(false);
      return;
    }
    const result = await searchContactsAction(query);
    if (result.success && result.data) {
      setContactResults(result.data);
      setShowContactDropdown(true);
    }
  }, []);

  const selectContact = (contact: { id: string; name: string }) => {
    setContactId(contact.id);
    setContactSearch(contact.name);
    setShowContactDropdown(false);
  };

  const handleQuickCreateSuccess = (contact: { id: string; name: string }) => {
    setContactId(contact.id);
    setContactSearch(contact.name);
    setShowContactDropdown(false);
  };

  // Line item management
  const addItem = () => setItems([...items, emptyItem()]);
  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(items.filter((i) => i.id !== id));
  };
  const updateItem = (id: string, field: keyof LineItem, value: string) => {
    setItems(items.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
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

  // Submit
  async function handleSubmit() {
    setError(null);

    const validItems = items.filter((i) => i.description.trim());
    if (validItems.length === 0) {
      setError(t('atLeastOneItem'));
      return;
    }

    startTransition(async () => {
      const result = await createDocumentAction({
        type,
        contactId: contactId || null,
        issueDate,
        dueDate: (config.hasDueDate && dueDate) ? dueDate : null,
        deliveryDate: (config.hasDeliveryDate && deliveryDate) ? deliveryDate : null,
        notes: notes || null,
        internalNotes: internalNotes || null,
        items: validItems.map((item, index) => ({
          position: index,
          productId: item.productId || null,
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
        setError(result.error || t('failedToCreate', { type: t(config.label) }));
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={config.basePath} className="rounded-lg p-2 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{t('newDocument', { type: t(config.label) })}</h1>
          <p className="text-muted-foreground">{t('modifyDraft')}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact & dates */}
          <div className="rounded-xl border bg-card p-6 space-y-4">
            {/* Contact picker */}
            <div className="relative">
              <label className="block text-sm font-medium">
                {config.contactFilter === 'vendor' ? t('vendor') : t('customer')}
              </label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={contactSearch}
                  onChange={(e) => handleContactSearch(e.target.value)}
                  onFocus={() => contactResults.length > 0 && setShowContactDropdown(true)}
                  placeholder={config.contactFilter === 'vendor'
                    ? tc('search') + '...'
                    : tc('search') + '...'}
                  className="w-full rounded-lg border bg-background py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
                {contactId && (
                  <button
                    type="button"
                    onClick={() => {
                      setContactId(null);
                      setContactSearch('');
                      setContactResults([]);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {t('clear')}
                  </button>
                )}
              </div>
              {showContactDropdown && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border bg-card shadow-lg">
                  {contactResults.length > 0 ? (
                    <>
                      {contactResults.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => selectContact(c)}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-muted first:rounded-t-lg last:rounded-b-lg"
                        >
                          <span className="font-medium">{c.name}</span>
                          {c.contactNumber && (
                            <span className="ml-2 text-muted-foreground">{c.contactNumber}</span>
                          )}
                        </button>
                      ))}
                    </>
                  ) : contactSearch.length >= 2 ? (
                    <button
                      type="button"
                      onClick={() => {
                        setShowQuickCreateModal(true);
                        setShowContactDropdown(false);
                      }}
                      className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-muted rounded-lg"
                    >
                      <UserPlus className="h-4 w-4 text-primary" />
                      <span>
                        {tc('create')} <span className="font-medium">&quot;{contactSearch}&quot;</span>
                      </span>
                    </button>
                  ) : null}
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium">{t('issueDate')}</label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              {config.hasDueDate && (
                <div>
                  <label className="block text-sm font-medium">{t(config.dueDateLabel)}</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              )}
              {config.hasDeliveryDate && (
                <div>
                  <label className="block text-sm font-medium">{t('deliveryDate')}</label>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Line items */}
          <div className="rounded-xl border bg-card">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="font-semibold">{t('lineItems')}</h2>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <Plus className="h-4 w-4" />
                {t('addItem')}
              </button>
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={items.map((item) => item.id)}
                strategy={verticalListSortingStrategy}
              >
                <div>
                  {items.map((item, index) => (
                    <SortableLineItem
                      key={item.id}
                      item={item}
                      index={index}
                      updateItem={updateItem}
                      removeItem={removeItem}
                      canRemove={items.length > 1}
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
              <label className="block text-sm font-medium">{tc('notes')}</label>
              <CharCountTextarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('notesOnDocument', { type: t(config.label) })}
                rows={3}
                maxLength={1000}
                className="mt-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">{t('internalNotes')}</label>
              <CharCountTextarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder={t('internalNotesHint', { type: t(config.label) })}
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
            <h2 className="mb-4 font-semibold">{t('summary')}</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{tc('subtotal')}</span>
                <span>CHF {subtotal.toFixed(2).toString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('vat')}</span>
                <span>CHF {vatAmount.toFixed(2).toString()}</span>
              </div>
              <div className="flex justify-between border-t pt-2 text-lg font-bold">
                <span>{tc('total')}</span>
                <span>CHF {total.toFixed(2).toString()}</span>
              </div>
            </div>

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
              {isPending ? tc('creating') : t('newDocument', { type: t(config.label) })}
            </button>

            <p className="mt-2 text-center text-xs text-muted-foreground">
              {t('createdAsDraft', { type: t(config.label) })}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Create Contact Modal */}
      <QuickCreateContactModal
        isOpen={showQuickCreateModal}
        onClose={() => setShowQuickCreateModal(false)}
        onSuccess={handleQuickCreateSuccess}
        initialName={contactSearch}
        contactType={config.contactFilter === 'all' ? 'customer' : config.contactFilter || 'customer'}
      />
    </div>
  );
}
