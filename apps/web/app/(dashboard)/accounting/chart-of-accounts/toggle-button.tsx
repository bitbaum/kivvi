"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Power, Loader2 } from "lucide-react";
import { toggleAccountAction } from "@/app/actions/accounting";
import { useTranslations } from "next-intl";

interface ToggleButtonProps {
  accountId: string;
  isActive: boolean;
}

export function ToggleButton({ accountId, isActive }: ToggleButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const tc = useTranslations("common");

  function handleToggle() {
    setError(null);
    startTransition(async () => {
      const result = await toggleAccountAction(accountId);
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error || tc("error"));
      }
    });
  }

  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        disabled={isPending}
        title={isActive ? tc("deactivate") : tc("activate")}
        className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
          isActive
            ? "text-warning hover:bg-warning/10"
            : "text-success hover:bg-success/10 dark:hover:bg-success/20"
        }`}
      >
        {isPending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Power className="h-3 w-3" />
        )}
        {isActive ? tc("inactive") : tc("active")}
      </button>
      {error && (
        <p className="absolute right-0 top-full mt-1 whitespace-nowrap rounded bg-destructive/5 px-2 py-1 text-xs text-destructive shadow-sm">
          {error}
        </p>
      )}
    </div>
  );
}
