"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Clock,
  X,
  FileText,
  User,
  Package,
  FileCheck,
  ShoppingCart,
  CreditCard,
  Truck,
  ClipboardList,
  Receipt,
  FolderKanban,
  BookOpen,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRecentItems, type RecentItem } from "@/hooks/use-recent-items";

const ICONS: Record<RecentItem["type"], React.ComponentType<{ className?: string }>> = {
  invoice: FileText,
  contact: User,
  product: Package,
  quote: FileCheck,
  order: ShoppingCart,
  credit_note: CreditCard,
  delivery_note: Truck,
  purchase_order: ClipboardList,
  purchase_invoice: Receipt,
  project: FolderKanban,
  journal: BookOpen,
};

/**
 * Dropdown showing recently viewed items for quick navigation.
 * Displays in the header for power users.
 */
export function RecentItemsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<RecentItem[]>([]);
  const { getRecentItems, clearRecentItems } = useRecentItems();
  const tc = useTranslations("common");

  // Load items on mount and when updated
  useEffect(() => {
    const loadItems = () => {
      setItems(getRecentItems());
    };

    loadItems();

    // Listen for updates from other components
    window.addEventListener("recentItemsUpdated", loadItems);
    return () => window.removeEventListener("recentItemsUpdated", loadItems);
  }, [getRecentItems]);

  if (items.length === 0) {
    return null; // Don't show dropdown if no recent items
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted transition-colors"
        type="button"
      >
        <Clock className="h-4 w-4" />
        <span className="hidden sm:inline">{tc("recentItems")}</span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          {/* Dropdown */}
          <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border bg-popover shadow-lg">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="font-semibold text-sm">{tc("recentItems")}</h3>
              <button
                onClick={() => {
                  clearRecentItems();
                  setIsOpen(false);
                }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                type="button"
              >
                {tc("clearAll")}
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {items.map((item, index) => {
                const Icon = ICONS[item.type];
                return (
                  <Link
                    key={`${item.type}-${item.id}-${index}`}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors border-b last:border-b-0"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {tc(`itemTypes.${item.type}` as Parameters<typeof tc>[0])}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
