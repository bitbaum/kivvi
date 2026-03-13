"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { autoMatchTransactionsAction } from "@/app/actions/banking";
import { useTranslations } from "next-intl";

export function AutoMatchButton({ bankAccountId }: { bankAccountId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ matched: number } | null>(null);
  const t = useTranslations("banking");
  const tc = useTranslations("common");

  function handleClick() {
    setError(null);
    setResult(null);

    startTransition(async () => {
      const res = await autoMatchTransactionsAction(bankAccountId);
      if (res.success && res.data) {
        setResult(res.data);
        router.refresh();
      } else {
        setError(res.error || tc("error"));
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleClick}
        disabled={isPending}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors min-h-[44px]"
      >
        <Sparkles className="h-4 w-4" />
        {isPending ? t("matching") : t("autoMatch")}
      </button>
      {result && (
        <span className="text-sm text-green-600 dark:text-green-400">
          {t("matchedTransactions", { count: result.matched })}
        </span>
      )}
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
