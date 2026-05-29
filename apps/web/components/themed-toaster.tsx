"use client";

import { Toaster } from "sonner";
import { useTheme } from "next-themes";

/**
 * Sonner Toaster wired to the next-themes value so toast notifications
 * respect the same light/dark choice as the rest of the app. Sonner's
 * default theme is "light"; without this wrapper the toast surfaces
 * stay bright even when the rest of the page is dark.
 */
export function ThemedToaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Toaster
      richColors
      position="bottom-right"
      theme={(resolvedTheme as "light" | "dark") ?? "system"}
    />
  );
}
