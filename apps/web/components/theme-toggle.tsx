"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/**
 * Three-way theme toggle: light · system · dark.
 *
 * Renders as a single 44×44 button that cycles through the three modes
 * on click. The icon reflects the *resolved* theme so the user always
 * sees the current visual mode, while the cycle path remains
 * light → system → dark → light. The dropdown is intentionally avoided
 * so the control stays one tap deep, matching the rest of the dense
 * header controls.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const t = useTranslations("common");
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // next-themes resolves the system preference on the client, so the
  // icon would mismatch during SSR. Render a placeholder until mounted.
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center",
          className,
        )}
        aria-hidden="true"
      />
    );
  }

  const order = ["light", "system", "dark"] as const;
  const current = (theme ?? "system") as (typeof order)[number];
  const next = order[(order.indexOf(current) + 1) % order.length];

  // Icon reflects the resolved theme — what the user actually sees.
  const Icon =
    current === "system" ? Monitor : resolvedTheme === "dark" ? Moon : Sun;

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      aria-label={t("aria.toggleTheme", { mode: next })}
      title={`Theme: ${current} (click to switch to ${next})`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
