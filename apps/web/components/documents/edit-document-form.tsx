'use client';

import { useState, useTransition, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Decimal from 'decimal.js';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { updateDocumentAction } from '@/app/actions/documents';
import type { DocumentTypeConfig } from '@/lib/config/document-types';
import { SWISS_VAT_RATES, DEFAULT_VAT_RATE } from '@/lib/config/vat-rates';
import { ContactPicker } from '@/components/contacts/contact-picker';
import { CharCountTextarea } from '@/components/ui/char-count-textarea';
import { FormInput, FormSelect } from '@/components/ui/form-field';
import type { DocumentType } from '@kivvi/database';
import { toast } from 'sonner';
import { rappenRound } from '@kivvi/core/src/utils/swiss-currency';

interface LineItem {
  id: string;
  productId: string | null;
  description: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  vatRate: string;
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

export function EditDocumentForm({ documentId, documentType, config, initialData }: EditDocumentFormProps) {
  const router = useRouter();
  const t = useTranslations('documents');
  const tc = useTranslations('common');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [contactId, setContactId] = useState<string | null>(initialData.contactId);
  const [contactName, setContactName] = useState(initialData.contactName);

  const [issueDate, setIssueDate] = useState(initialData.issueDate);
  const [dueDate, setDueDate] = useState(initialData.dueDate);
  const [deliveryDate, setDeliveryDate] = useState(initialData.deliveryDate);
  const [notes, setNotes] = useState(initialData.notes);
  const [internalNotes, setInternalNotes] = useState(initialData.internalNotes);
  const [items, setItems] = useState<LineItem[]>(initialData.items);

  const addItem = () =>
    setItems([...items, { id: crypto.randomUUID(), productId: null, description: '', quantity: '1', unitPrice: '0.00', discount: '0', vatRate: DEFAULT_VAT_RATE }]);

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(items.filter((i) => i.id !== id));
  };

  const updateItem = (id: string, field: keyof LineItem, value: string) => {
    setItems(items.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  };

  // Totals (decimal.js)
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

  const handleSubmit = useCallback(async () => {
    setError(null);
    const validItems = items.filter((i) => i.description.trim());
    if (validItems.length === 0) {
      setError(t('atLeastOneItem'));
      return;
    }

    startTransition(async () => {
      const result = await updateDocumentAction(documentId, {
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

      if (result.success) {
        toast.success(t('documentSaved'));
        router.push(`${config.basePath}/${documentId}`);
      } else {
        setError(result.error || tc('error'));
      }
    });
  }, [items, documentId, contactId, issueDate, dueDate, deliveryDate, notes, internalNotes, config, t, tc, router, startTransition]);

  // Cmd+Enter (Mac) / Ctrl+Enter (Win/Linux) to submit
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !isPending) {
        e.preventDefault();
        handleSubmit();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleSubmit, isPending]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`${config.basePath}/${documentId}`} className="rounded-lg p-2 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{t('editDocument', { type: t(config.label) })}</h1>
          <p className="text-muted-foreground">{t('modifyDraft')}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Contact & dates */}
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <ContactPicker
              value={contactId}
              displayValue={contactName}
              onChange={(id, name) => { setContactId(id); setContactName(name); }}
              contactType={config.contactFilter === 'vendor' ? 'vendor' : 'customer'}
              allowQuickCreate={false}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium">{t('issueDate')}</label>
                <FormInput type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="mt-1" />
              </div>
              {config.hasDueDate && (
                <div>
                  <label className="block text-sm font-medium">{t(config.dueDateLabel)}</label>
                  <FormInput type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1" />
                </div>
              )}
              {config.hasDeliveryDate && (
                <div>
                  <label className="block text-sm font-medium">{t('deliveryDate')}</label>
                  <FormInput type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className="mt-1" />
                </div>
              )}
            </div>
          </div>

          {/* Line items */}
          <div className="rounded-xl border bg-card">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="font-semibold">{t('lineItems')}</h2>
              <button type="button" onClick={addItem} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                <Plus className="h-4 w-4" /> {t('addItem')}
              </button>
            </div>
            <div className="divide-y">
              {items.map((item, index) => (
                <div key={item.id} className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="mt-2.5 text-sm text-muted-foreground w-6">{index + 1}</span>
                    <div className="flex-1 space-y-3">
                      <FormInput type="text" value={item.description} onChange={(e) => updateItem(item.id, 'description', e.target.value)} placeholder={tc('description')} />
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                        <div>
                          <label className="block text-xs text-muted-foreground">{t('quantity')}</label>
                          <FormInput type="number" step="0.01" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', e.target.value)} className="mt-1" />
                        </div>
                        <div>
                          <label className="block text-xs text-muted-foreground">{t('unitPrice')}</label>
                          <FormInput type="number" step="0.01" value={item.unitPrice} onChange={(e) => updateItem(item.id, 'unitPrice', e.target.value)} className="mt-1" />
                        </div>
                        <div>
                          <label className="block text-xs text-muted-foreground">{t('discount')} %</label>
                          <FormInput type="number" step="0.1" value={item.discount} onChange={(e) => updateItem(item.id, 'discount', e.target.value)} className="mt-1" />
                        </div>
                        <div>
                          <label className="block text-xs text-muted-foreground">{t('vatPercent')}</label>
                          <FormSelect value={item.vatRate} onChange={(e) => updateItem(item.id, 'vatRate', e.target.value)} className="mt-1">
                            {SWISS_VAT_RATES.map((rate) => (
                              <option key={rate.value} value={rate.value}>{rate.value}%</option>
                            ))}
                          </FormSelect>
                        </div>
                        <div>
                          <label className="block text-xs text-muted-foreground">{tc('total')}</label>
                          <p className="mt-1 rounded-lg border bg-muted/50 px-3 py-2 text-sm font-medium">{calculateItemTotal(item).toFixed(2).toString()}</p>
                        </div>
                      </div>
                    </div>
                    {items.length > 1 && (
                      <button type="button" onClick={() => removeItem(item.id)} className="mt-2 rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium">{tc('notes')}</label>
              <CharCountTextarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('notesOnDocument', { type: t(config.label) })} rows={3} maxLength={1000} className="mt-1" />
            </div>
            <div>
              <label className="block text-sm font-medium">{t('internalNotes')}</label>
              <CharCountTextarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} placeholder={t('internalNotesHint', { type: t(config.label) })} rows={2} maxLength={1000} className="mt-1" />
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
              <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</p>
            )}

            <button type="button" onClick={handleSubmit} disabled={isPending} className="mt-6 w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {isPending ? tc('saving') : (
                <span className="flex items-center justify-center gap-2">
                  {tc('saveChanges')}
                  <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-primary-foreground/20 bg-primary-foreground/10 px-1.5 py-0.5 text-[10px] font-mono">
                    ⌘↵
                  </kbd>
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
