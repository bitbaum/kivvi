"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { createDunningAction } from "@/app/actions/dunning";
import { Button } from "@/components/ui/button";

export function DunningButton({
  invoiceId,
  currentLevel,
}: {
  invoiceId: string;
  currentLevel: number;
}) {
  const t = useTranslations("dunning");
  const tc = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const LEVEL_LABELS: Record<number, string> = {
    0: t("sendReminder"),
    1: t("send2ndReminder"),
    2: t("sendFinalNotice"),
  };

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await createDunningAction(invoiceId);
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error || tc("error"));
      }
    });
  }

  return (
    <div>
      <Button
        variant="destructive"
        size="sm"
        onClick={handleClick}
        disabled={isPending}
      >
        <Send className="h-3 w-3" />
        {isPending ? t("sending") : LEVEL_LABELS[currentLevel] || t("maxLevel")}
      </Button>
      {error && (
        <p role="alert" className="mt-1 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
