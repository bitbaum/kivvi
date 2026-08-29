"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { reverseJournalEntryAction } from "@/app/actions/accounting";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

interface DeleteJournalEntryButtonProps {
  entryId: string;
}

// GeBüV: a posted entry is never deleted — it is reversed with a Storno
// counter-entry. This control posts that reversal.
export function DeleteJournalEntryButton({ entryId }: DeleteJournalEntryButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const t = useTranslations("accounting");
  const tc = useTranslations("common");

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-destructive/20 px-3 py-2 text-sm text-destructive hover:bg-destructive/5"
      >
        <RotateCcw className="h-4 w-4" />
        {t("reverseEntry")}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-destructive">{t("reverseEntryConfirm")}</span>
      <button
        onClick={() => {
          startTransition(async () => {
            const result = await reverseJournalEntryAction(entryId);
            if (result.success) {
              toast.success(t("entryReversed"));
              router.push("/accounting/journal");
            } else {
              toast.error(result.error || tc("error"));
              setConfirming(false);
            }
          });
        }}
        disabled={isPending}
        className="rounded-lg bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
      >
        {isPending ? tc("loading") : tc("confirm")}
      </button>
      <button
        onClick={() => setConfirming(false)}
        disabled={isPending}
        className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
      >
        {tc("no")}
      </button>
    </div>
  );
}
