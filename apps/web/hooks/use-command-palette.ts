'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React from 'react';
import {
  Plus,
  Clock,
  User,
  Package,
  FileText,
} from 'lucide-react';
import { useRecentItems } from '@/hooks/use-recent-items';
import { globalSearchAction, type GlobalSearchResults } from '@/app/actions/search';
import {
  NAVIGATION_ITEMS,
  QUICK_ACTIONS,
  DOCUMENT_ROUTE_PREFIX,
  SECTION_ORDER,
  SECTION_LABEL_KEYS,
} from '@/lib/config/command-palette-items';

export interface PaletteItem {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  section: string;
}

export interface PaletteSection {
  key: string;
  label: string;
  items: PaletteItem[];
}

export function useCommandPalette(isOpen: boolean, onClose: () => void) {
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

  // Resolve config items to PaletteItems with translated labels
  const navigationItems: PaletteItem[] = useMemo(
    () =>
      NAVIGATION_ITEMS.map((item) => ({
        id: item.id,
        label: tn(item.nameKey),
        href: item.href,
        icon: React.createElement(item.icon, { className: 'h-4 w-4' }),
        section: 'navigation',
      })),
    [tn]
  );

  const quickActions: PaletteItem[] = useMemo(
    () =>
      QUICK_ACTIONS.map((item) => ({
        id: item.id,
        label: t(item.nameKey),
        href: item.href,
        icon: React.createElement(Plus, { className: 'h-4 w-4' }),
        section: 'actions',
      })),
    [t]
  );

  // Build recent items
  const recentItems: PaletteItem[] = useMemo(
    () =>
      getRecentItems().map((item) => ({
        id: `recent-${item.id}`,
        label: item.label,
        href: item.href,
        icon: React.createElement(Clock, { className: 'h-4 w-4' }),
        section: 'recent',
      })),
    [getRecentItems]
  );

  // Filter static items by query
  const filteredItems = useMemo(() => {
    const lowerQuery = query.toLowerCase().trim();

    if (!lowerQuery) {
      // Quick actions first -- most actionable; navigation already in sidebar
      const items: PaletteItem[] = [];
      if (quickActions.length > 0) items.push(...quickActions);
      if (recentItems.length > 0) items.push(...recentItems);
      if (navigationItems.length > 0) items.push(...navigationItems);
      return items;
    }

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
        icon: React.createElement(User, { className: 'h-4 w-4' }),
        section: 'contacts',
      });
    }

    for (const p of searchResults.products) {
      items.push({
        id: `product-${p.id}`,
        label: `${p.name}${p.articleNumber ? ` (${p.articleNumber})` : ''}`,
        href: `/products/${p.id}`,
        icon: React.createElement(Package, { className: 'h-4 w-4' }),
        section: 'products',
      });
    }

    for (const d of searchResults.documents) {
      const routePrefix = DOCUMENT_ROUTE_PREFIX[d.type] || `/sales/${d.type}s`;
      items.push({
        id: `doc-${d.id}`,
        label: `${d.number || d.type}${d.contactName ? ` \u2014 ${d.contactName}` : ''}`,
        href: `${routePrefix}/${d.id}`,
        icon: React.createElement(FileText, { className: 'h-4 w-4' }),
        section: 'documents',
      });
    }

    return items;
  }, [searchResults]);

  // All visible items
  const allItems = useMemo(
    () => [...filteredItems, ...serverItems],
    [filteredItems, serverItems]
  );

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

  const navigate = useCallback(
    (href: string) => {
      onClose();
      router.push(href);
    },
    [onClose, router]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
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
    },
    [allItems, selectedIndex, navigate, onClose]
  );

  // Build sections for rendering
  const sections: PaletteSection[] = useMemo(() => {
    const result: PaletteSection[] = [];
    for (const key of SECTION_ORDER) {
      const items = allItems.filter((item) => item.section === key);
      if (items.length > 0) {
        result.push({ key, label: t(SECTION_LABEL_KEYS[key]), items });
      }
    }
    return result;
  }, [allItems, t]);

  return {
    query,
    setQuery,
    selectedIndex,
    setSelectedIndex,
    isSearching,
    sections,
    allItems,
    inputRef,
    listRef,
    navigate,
    handleKeyDown,
    placeholder: t('placeholder'),
    noResultsLabel: t('noResults'),
  };
}
