'use client';

import { useState, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Decimal from 'decimal.js';
import { ArrowLeft, Plus, Trash2, Search } from 'lucide-react';
import Link from 'next/link';
import { updateDocumentAction } from '@/app/actions/documents';
import { searchContactsAction } from '@/app/actions/contacts';
import type { DocumentTypeConfig } from '@/lib/config/document-types';
import type { DocumentType } from '@kivvi/database';

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

function rappenRound(amount: Decimal): Decimal {
  return amount.times(20).round().div(20);
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
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [contactId, setContactId] = useState<string | null>(initialData.contactId);
  const [contactSearch, setContactSearch] = useState(initialData.contactName);
  const [contactResults, setContactResults] = useState<Array<{ id: string; name: string; contactNumber: string | null }>>([]);
  const [showContactDropdown, setShowContactDropdown] = useState(false);

  const [issueDate, setIssueDate] = useState(initialData.issueDate);
  const [dueDate, setDueDate] = useState(initialData.dueDate);
  const [deliveryDate, setDeliveryDate] = useState(initialData.deliveryDate);
  const [notes, setNotes] = useState(initialData.notes);
  const [internalNotes, setInternalNotes] = useState(initialData.internalNotes);
  const [items, setItems] = useState<LineItem[]>(initialData.items);

  const handleContactSearch = useCallback(async (query: string) => {
    setContactSearch(query);
    if (query.length < 2) {
      setContactResults([]);
      setShowContactDropdown(false);
      return;
    }
    const result = await searchContactsAction(query);
    if (result.success && result.data) {
      setContactResults(result.data as any);
      setShowContactDropdown(true);
    }
  }, []);

  const selectContact = (contact: { id: string; name: string }) => {
    setContactId(contact.id);
    setContactSearch(contact.name);
    setShowContactDropdown(false);
  };

  const addItem = () =>
    setItems([...items, { id: crypto.randomUUID(), productId: null, description: '', quantity: '1', unitPrice: '0.00', discount: '0', vatRate: '8.1' }]);

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

  const contactLabel = config.contactFilter === 'vendor' ? 'Vendor' : 'Customer';

  async function handleSubmit() {
    setError(null);
    const validItems = items.filter((i) => i.description.trim());
    if (validItems.length === 0) {
      setError('At least one line item is required');
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
        router.push(`${config.basePath}/${documentId}`);
      } else {
        setError(result.error || `Failed to update ${config.label.toLowerCase()}`);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`${config.basePath}/${documentId}`} className="rounded-lg p-2 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Edit {config.label}</h1>
          <p className="text-muted-foreground">Modify the draft {config.label.toLowerCase()}.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Contact & dates */}
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <div className="relative">
              <label className="block text-sm font-medium">{contactLabel}</label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={contactSearch}
                  onChange={(e) => handleContactSearch(e.target.value)}
                  onFocus={() => contactResults.length > 0 && setShowContactDropdown(true)}
                  placeholder={`Search ${contactLabel.toLowerCase()}s...`}
                  className="w-full rounded-lg border bg-background py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
                {contactId && (
                  <button type="button" onClick={() => { setContactId(null); setContactSearch(''); setContactResults([]); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground">Clear</button>
                )}
              </div>
              {showContactDropdown && contactResults.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border bg-card shadow-lg">
                  {contactResults.map((c) => (
                    <button key={c.id} type="button" onClick={() => selectContact(c)} className="w-full px-4 py-2 text-left text-sm hover:bg-muted first:rounded-t-lg last:rounded-b-lg">
                      <span className="font-medium">{c.name}</span>
                      {c.contactNumber && <span className="ml-2 text-muted-foreground">{c.contactNumber}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium">Issue Date</label>
                <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" />
              </div>
              {config.hasDueDate && (
                <div>
                  <label className="block text-sm font-medium">{config.dueDateLabel}</label>
                  <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" />
                </div>
              )}
              {config.hasDeliveryDate && (
                <div>
                  <label className="block text-sm font-medium">Delivery Date</label>
                  <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" />
                </div>
              )}
            </div>
          </div>

          {/* Line items */}
          <div className="rounded-xl border bg-card">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="font-semibold">Line Items</h2>
              <button type="button" onClick={addItem} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                <Plus className="h-4 w-4" /> Add Item
              </button>
            </div>
            <div className="divide-y">
              {items.map((item, index) => (
                <div key={item.id} className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="mt-2.5 text-sm text-muted-foreground w-6">{index + 1}</span>
                    <div className="flex-1 space-y-3">
                      <input type="text" value={item.description} onChange={(e) => updateItem(item.id, 'description', e.target.value)} placeholder="Description" className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" />
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                        <div>
                          <label className="block text-xs text-muted-foreground">Quantity</label>
                          <input type="number" step="0.01" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', e.target.value)} className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" />
                        </div>
                        <div>
                          <label className="block text-xs text-muted-foreground">Unit Price</label>
                          <input type="number" step="0.01" value={item.unitPrice} onChange={(e) => updateItem(item.id, 'unitPrice', e.target.value)} className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" />
                        </div>
                        <div>
                          <label className="block text-xs text-muted-foreground">Discount %</label>
                          <input type="number" step="0.1" value={item.discount} onChange={(e) => updateItem(item.id, 'discount', e.target.value)} className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" />
                        </div>
                        <div>
                          <label className="block text-xs text-muted-foreground">VAT %</label>
                          <select value={item.vatRate} onChange={(e) => updateItem(item.id, 'vatRate', e.target.value)} className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary">
                            <option value="8.1">8.1%</option>
                            <option value="2.6">2.6%</option>
                            <option value="0">0%</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-muted-foreground">Total</label>
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
              <label className="block text-sm font-medium">Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={`Notes visible on the ${config.label.toLowerCase()}...`} rows={3} className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium">Internal Notes</label>
              <textarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} placeholder={`Internal notes (not visible on ${config.label.toLowerCase()})...`} rows={2} className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>
        </div>

        {/* Right: summary */}
        <div className="space-y-6">
          <div className="sticky top-6 rounded-xl border bg-card p-6">
            <h2 className="mb-4 font-semibold">Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>CHF {subtotal.toFixed(2).toString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">VAT</span>
                <span>CHF {vatAmount.toFixed(2).toString()}</span>
              </div>
              <div className="flex justify-between border-t pt-2 text-lg font-bold">
                <span>Total</span>
                <span>CHF {total.toFixed(2).toString()}</span>
              </div>
            </div>

            {error && (
              <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</p>
            )}

            <button type="button" onClick={handleSubmit} disabled={isPending} className="mt-6 w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
