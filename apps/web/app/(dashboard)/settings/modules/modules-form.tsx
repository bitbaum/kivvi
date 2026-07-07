"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { updateEnabledModulesAction } from "@/app/actions/settings";
import {
  TOGGLEABLE_MODULES,
  isModuleEnabled,
} from "@kivvi/core/src/config/modules";

interface ModulesFormProps {
  /** Persisted enabled module keys from settings.enabledModules (undefined = all on) */
  initialEnabledModules: string[] | undefined;
}

export function ModulesForm({ initialEnabledModules }: ModulesFormProps) {
  const t = useTranslations("settings.modules");
  const tn = useTranslations("nav");
  const tc = useTranslations("common");
  const [isPending, startTransition] = useTransition();

  const [enabled, setEnabled] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      TOGGLEABLE_MODULES.map((m) => [
        m.key,
        isModuleEnabled(initialEnabledModules, m.key),
      ]),
    ),
  );

  function toggle(key: string) {
    setEnabled((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleSave() {
    // Persist the exact set the admin chose. Leaving everything on stores the
    // full array (not undefined) — that reflects an explicit choice.
    const enabledModules = TOGGLEABLE_MODULES.filter((m) => enabled[m.key]).map(
      (m) => m.key,
    );
    startTransition(async () => {
      const result = await updateEnabledModulesAction({ enabledModules });
      if (result.success) {
        toast.success(t("saved"));
      } else {
        toast.error(result.error ?? tc("error"));
      }
    });
  }

  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      <p className="text-sm text-muted-foreground">{t("helpText")}</p>

      <div className="divide-y">
        {TOGGLEABLE_MODULES.map((m) => {
          const isOn = enabled[m.key];
          const labelId = `module-${m.key}-label`;
          return (
            <div
              key={m.key}
              className="flex items-center justify-between gap-4 py-3"
            >
              <span id={labelId} className="text-sm font-medium">
                {tn(m.labelKey as Parameters<typeof tn>[0])}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={isOn}
                aria-labelledby={labelId}
                onClick={() => toggle(m.key)}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
                  isOn ? "bg-primary" : "bg-muted",
                )}
              >
                <span
                  className={cn(
                    "inline-block h-5 w-5 rounded-full bg-background shadow transition-transform",
                    isOn ? "translate-x-5" : "translate-x-0.5",
                  )}
                />
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? tc("saving") : tc("save")}
        </button>
      </div>
    </div>
  );
}
