"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { createDunningAction } from "@/app/actions/dunning";
import { Button } from "@/components/ui/button";

const LEVEL_LABELS: Record<number, string> = {
  0: "Send Reminder",
  1: "Send 2nd Reminder",
  2: "Send Final Notice",
};

export function DunningButton({
  invoiceId,
  currentLevel,
}: {
  invoiceId: string;
  currentLevel: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await createDunningAction(invoiceId);
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error || "Failed");
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
        {isPending ? "Sending..." : LEVEL_LABELS[currentLevel] || "Escalate"}
      </Button>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
