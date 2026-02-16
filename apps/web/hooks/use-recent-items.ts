import { useEffect, useCallback } from 'react';

export interface RecentItem {
  id: string;
  type: 'invoice' | 'contact' | 'product' | 'quote' | 'order';
  label: string; // e.g., "#RE-2026-00001", "Müller AG", "Widget Pro"
  href: string;
  timestamp: number;
}

const MAX_RECENT_ITEMS = 10;
const STORAGE_KEY = 'kivvi_recent_items';

/**
 * Hook to manage recently viewed items.
 * Stores last 10 viewed items in localStorage for quick access.
 */
export function useRecentItems() {
  const getRecentItems = useCallback((): RecentItem[] => {
    if (typeof window === 'undefined') return [];

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];

      const items = JSON.parse(stored) as RecentItem[];
      // Sort by timestamp descending (most recent first)
      return items.sort((a, b) => b.timestamp - a.timestamp).slice(0, MAX_RECENT_ITEMS);
    } catch {
      return [];
    }
  }, []);

  const addRecentItem = useCallback((item: Omit<RecentItem, 'timestamp'>) => {
    if (typeof window === 'undefined') return;

    try {
      const existing = getRecentItems();

      // Remove duplicates (same id and type)
      const filtered = existing.filter(
        (i) => !(i.id === item.id && i.type === item.type)
      );

      // Add new item at the front
      const updated: RecentItem[] = [
        { ...item, timestamp: Date.now() },
        ...filtered,
      ].slice(0, MAX_RECENT_ITEMS);

      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

      // Dispatch custom event for header to listen
      window.dispatchEvent(new CustomEvent('recentItemsUpdated'));
    } catch (error) {
      console.error('Failed to save recent item:', error);
    }
  }, [getRecentItems]);

  const clearRecentItems = useCallback(() => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('recentItemsUpdated'));
  }, []);

  return {
    getRecentItems,
    addRecentItem,
    clearRecentItems,
  };
}
