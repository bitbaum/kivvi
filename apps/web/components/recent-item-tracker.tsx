"use client";

import { useEffect } from "react";
import { useRecentItems, type RecentItem } from "@/hooks/use-recent-items";

/**
 * Drop this into any detail page (Server Component-compatible) to record
 * a "recently viewed" entry in localStorage on first render.
 * Renders nothing — purely a side-effect component.
 */
export function RecentItemTracker(item: Omit<RecentItem, "timestamp">) {
  const { addRecentItem } = useRecentItems();

  useEffect(() => {
    addRecentItem(item);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally fires once on mount only

  return null;
}
