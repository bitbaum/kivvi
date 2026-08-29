"use client";

import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Popover state + wiring for a simple "click trigger → panel opens, click
 * outside or press Escape → panel closes" pattern.
 *
 * Used by the header's language switcher and user menu. Centralizing the
 * click-outside and Escape effects here keeps each consumer focused on
 * rendering the trigger button and panel content.
 *
 * Returns:
 * - `open` / `setOpen` — current state plus a manual setter (e.g. for
 *   closing the panel after selecting a menu item)
 * - `containerRef` — attach to the wrapping element so click-outside
 *   knows what counts as "inside"
 * - `toggle` — convenience for trigger `onClick`
 */
export function usePopover() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleMouseDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const toggle = useCallback(() => setOpen((prev) => !prev), []);
  const close = useCallback(() => setOpen(false), []);

  return { open, setOpen, toggle, close, containerRef };
}
