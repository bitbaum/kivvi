'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Search,
  LayoutDashboard,
  FileText,
  Receipt,
  ClipboardList,
  Truck,
  CreditCard,
  AlertTriangle,
  BookOpen,
  Warehouse,
  ArrowUpDown,
  Users,
  Package,
  Wallet,
  BarChart3,
  FolderKanban,
  Settings,
  Plus,
  Clock,
  User,
  X,
} from 'lucide-react';
import { useRecentItems } from '@/hooks/use-recent-items';
import { cn } from '@/lib/utils';
import { globalSearchAction, type GlobalSearchResults } from '@/app/actions/search';

// Document type → detail page route prefix
const DOCUMENT_ROUTE_PREFIX: Record<string, string> = {
  invoice: '/sales/invoices',
  quote: '/sales/quotes',
  order: '/sales/orders',
  order_confirmation: '/sales/order-confirmations',
  delivery_note: '/sales/delivery-notes',
  credit_note: '/sales/credit-notes',
  dunning: '/sales/dunning',
  purchase_order: '/purchasing/purchase-orders',
  purchase_invoice: '/purchasing/purchase-invoices',
};

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PaletteItem {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  section: string;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const t = useTranslations('commandPalette');
  const tn = useTranslations('nav');
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchResults, setSearchResults] = useState<GlobalSearchResults | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { getRecentItems } = useRecentItems();

  // Static navigation items — built from sidebar routes
  const navigationItems: PaletteItem[] = useMemo(() => [
    { id: 'nav-dashboard', label: tn('dashboard'), href: '/dashboard', icon: <LayoutDashboard className="h-4 w-4" />, section: 'navigation' },
    { id: 'nav-quotes', label: tn('quotes'), href: '/sales/quotes', icon: <FileText className="h-4 w-4" />, section: 'navigation' },
    { id: 'nav-orders', label: tn('orders'), href: '/sales/orders', icon: <ClipboardList className="h-4 w-4" />, section: 'navigation' },
    { id: 'nav-invoices', label: tn('invoices'), href: '/sales/invoices', icon: <Receipt className="h-4 w-4" />, section: 'navigation' },
    { id: 'nav-delivery-notes', label: tn('deliveryNotes'), href: '/sales/delivery-notes', icon: <Truck className="h-4 w-4" />, section: 'navigation' },
    { id: 'nav-credit-notes', label: tn('creditNotes'), href: '/sales/credit-notes', icon: <CreditCard className="h-4 w-4" />, section: 'navigation' },
    { id: 'nav-dunning', label: tn('dunning'), href: '/sales/dunning', icon: <AlertTriangle className="h-4 w-4" />, section: 'navigation' },
    { id: 'nav-purchase-orders', label: tn('purchaseOrders'), href: '/purchasing/purchase-orders', icon: <ClipboardList className="h-4 w-4" />, section: 'navigation' },
    { id: 'nav-purchase-invoices', label: tn('purchaseInvoices'), href: '/purchasing/purchase-invoices', icon: <Receipt className="h-4 w-4" />, section: 'navigation' },
    { id: 'nav-accounting', label: tn('accounting'), href: '/accounting', icon: <BookOpen className="h-4 w-4" />, section: 'navigation' },
    { id: 'nav-chart', label: tn('chartOfAccounts'), href: '/accounting/chart-of-accounts', icon: <FileText className="h-4 w-4" />, section: 'navigation' },
    { id: 'nav-journal', label: tn('journal'), href: '/accounting/journal', icon: <ClipboardList className="h-4 w-4" />, section: 'navigation' },
    { id: 'nav-fiscal', label: tn('fiscalYears'), href: '/accounting/fiscal-years', icon: <BarChart3 className="h-4 w-4" />, section: 'navigation' },
    { id: 'nav-warehouses', label: tn('warehouses'), href: '/inventory', icon: <Warehouse className="h-4 w-4" />, section: 'navigation' },
    { id: 'nav-stock', label: tn('stockMovements'), href: '/inventory/movements', icon: <ArrowUpDown className="h-4 w-4" />, section: 'navigation' },
    { id: 'nav-contacts', label: tn('contacts'), href: '/contacts', icon: <Users className="h-4 w-4" />, section: 'navigation' },
    { id: 'nav-products', label: tn('products'), href: '/products', icon: <Package className="h-4 w-4" />, section: 'navigation' },
    { id: 'nav-banking', label: tn('banking'), href: '/banking', icon: <Wallet className="h-4 w-4" />, section: 'navigation' },
    { id: 'nav-reports', label: tn('reports'), href: '/reports', icon: <BarChart3 className="h-4 w-4" />, section: 'navigation' },
    { id: 'nav-projects', label: tn('projects'), href: '/projects', icon: <FolderKanban className="h-4 w-4" />, section: 'navigation' },
    { id: 'nav-settings', label: tn('settings'), href: '/settings', icon: <Settings className="h-4 w-4" />, section: 'navigation' },
  ], [tn]);

  // Quick actions
  const quickActions: PaletteItem[] = useMemo(() => [
    { id: 'action-invoice', label: t('newInvoice'), href: '/sales/invoices/new', icon: <Plus className="h-4 w-4" />, section: 'actions' },
    { id: 'action-quote', label: t('newQuote'), href: '/sales/quotes/new', icon: <Plus className="h-4 w-4" />, section: 'actions' },
    { id: 'action-order', label: t('newOrder'), href: '/sales/orders/new', icon: <Plus className="h-4 w-4" />, section: 'actions' },
    { id: 'action-contact', label: t('newContact'), href: '/contacts/new', icon: <Plus className="h-4 w-4" />, section: 'actions' },
    { id: 'action-product', label: t('newProduct'), href: '/products/new', icon: <Plus className="h-4 w-4" />, section: 'actions' },
  ], [t]);

  // Build recent items
  const recentItems: PaletteItem[] = useMemo(() => {
    return getRecentItems().map((item) => ({
      id: `recent-${item.id}`,
      label: item.label,
      href: item.href,
      icon: <Clock className="h-4 w-4" />,
      section: 'recent',
    }));
  }, [getRecentItems]);

  // Filter static items by query
  const filteredItems = useMemo(() => {
    const lowerQuery = query.toLowerCase().trim();

    if (!lowerQuery) {
      // Show actions + recent + navigation when empty
      // Quick actions first — they're the most actionable; navigation is already in the sidebar
      const items: PaletteItem[] = [];
      if (quickActions.length > 0) items.push(...quickActions);
      if (recentItems.length > 0) items.push(...recentItems);
      if (navigationItems.length > 0) items.push(...navigationItems);
      return items;
    }

    // Filter navigation and actions by query
    const matchNav = navigationItems.filter((item) =>
      item.label.toLowerCase().includes(lowerQuery)
    );
    const matchActions = quickActions.filter((item) =>
      item.label.toLowerCase().includes(lowerQuery)
    );
    const matchRecent = recentItems.filter((item) =>
      item.label.toLowerCase().includes(lowerQuery)
    );

    return [...matchNav, ...matchActions, ...matchRecent];
  }, [query, navigationItems, quickActions, recentItems]);

  // Build server search result items
  const serverItems: PaletteItem[] = useMemo(() => {
    if (!searchResults) return [];
    const items: PaletteItem[] = [];

    for (const c of searchResults.contacts) {
      items.push({
        id: `contact-${c.id}`,
        label: `${c.name}${c.contactNumber ? ` (${c.contactNumber})` : ''}`,
        href: `/contacts/${c.id}`,
        icon: <User className="h-4 w-4" />,
        section: 'contacts',
      });
    }

    for (const p of searchResults.products) {
      items.push({
        id: `product-${p.id}`,
        label: `${p.name}${p.articleNumber ? ` (${p.articleNumber})` : ''}`,
        href: `/products/${p.id}`,
        icon: <Package className="h-4 w-4" />,
        section: 'products',
      });
    }

    for (const d of searchResults.documents) {
      const routePrefix = DOCUMENT_ROUTE_PREFIX[d.type] || `/sales/${d.type}s`;
      items.push({
        id: `doc-${d.id}`,
        label: `${d.number || d.type}${d.contactName ? ` — ${d.contactName}` : ''}`,
        href: `${routePrefix}/${d.id}`,
        icon: <FileText className="h-4 w-4" />,
        section: 'documents',
      });
    }

    return items;
  }, [searchResults]);

  // All visible items
  const allItems = useMemo(() => {
    return [...filteredItems, ...serverItems];
  }, [filteredItems, serverItems]);

  // Debounced server search with stale-result protection
  const queryRef = useRef(query);
  queryRef.current = query;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const searchQuery = query.trim();
    debounceRef.current = setTimeout(async () => {
      const result = await globalSearchAction(searchQuery);
      // Only update if the query hasn't changed while we were fetching
      if (queryRef.current.trim() === searchQuery && result.success && result.data) {
        setSearchResults(result.data);
      }
      if (queryRef.current.trim() === searchQuery) {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Reset on open/close
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setSearchResults(null);
      // Focus input after render
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  // Keep selection in bounds
  useEffect(() => {
    if (selectedIndex >= allItems.length) {
      setSelectedIndex(Math.max(0, allItems.length - 1));
    }
  }, [allItems.length, selectedIndex]);

  // Scroll selected item into view
  useEffect(() => {
    const selected = listRef.current?.querySelector('[data-selected="true"]');
    selected?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const navigate = useCallback((href: string) => {
    onClose();
    router.push(href);
  }, [onClose, router]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, allItems.length));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + allItems.length) % Math.max(1, allItems.length));
        break;
      case 'Enter':
        e.preventDefault();
        if (allItems[selectedIndex]) {
          navigate(allItems[selectedIndex].href);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [allItems, selectedIndex, navigate, onClose]);

  if (!isOpen) return null;

  // Group items by section for rendering
  const sections: { key: string; label: string; items: PaletteItem[] }[] = [];
  const sectionOrder = ['actions', 'recent', 'navigation', 'contacts', 'products', 'documents'];
  const sectionLabels: Record<string, string> = {
    navigation: t('navigation'),
    actions: t('actions'),
    recent: t('recent'),
    contacts: t('contacts'),
    products: t('products'),
    documents: t('documents'),
  };

  for (const key of sectionOrder) {
    const items = allItems.filter((item) => item.section === key);
    if (items.length > 0) {
      sections.push({ key, label: sectionLabels[key], items });
    }
  }

  // Calculate global index for each item
  let globalIndex = 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-[20vh]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder={t('placeholder')}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            aria-label="Search"
            autoComplete="off"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setSelectedIndex(0); }}
              className="rounded p-0.5 hover:bg-muted"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
          <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 text-xs text-muted-foreground sm:inline-block" aria-hidden="true">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[60vh] overflow-y-auto p-2" role="listbox">
          {sections.length === 0 && !isSearching ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              {t('noResults')}
            </div>
          ) : (
            sections.map((section) => (
              <div key={section.key} role="group" aria-label={section.label}>
                <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
                  {section.label}
                </div>
                {section.items.map((item) => {
                  const itemIndex = globalIndex++;
                  const isSelected = itemIndex === selectedIndex;
                  return (
                    <button
                      key={item.id}
                      data-selected={isSelected}
                      onClick={() => navigate(item.href)}
                      onMouseEnter={() => setSelectedIndex(itemIndex)}
                      className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-left transition-colors', isSelected ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted')}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <span className={isSelected ? 'text-primary-foreground' : 'text-muted-foreground'} aria-hidden="true">
                        {item.icon}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
          {isSearching && (
            <div className="px-3 py-2 text-center text-xs text-muted-foreground">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
