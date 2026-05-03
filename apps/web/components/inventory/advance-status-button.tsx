"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { updateItemStatusAction } from "@/app/actions/inventory-items";
import { getStatusLabelKey } from "@/lib/config/inventory-items";
import { cn } from "@/lib/utils";

// Primary next status for each pipeline stage — the single most common forward step.
const PRIMARY_NEXT: Record<string, string> = {
  intake: "testing",
  testing: "ready_for_sale",
  repair: "testing",
  ready_for_sale: "listed",
};

interface Props {
  itemId: string;
  currentStatus: string;
}

export function AdvanceStatusButton({ itemId, currentStatus }: Props) {
  const t = useTranslations("inventory");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const nextStatus = PRIMARY_NEXT[currentStatus];
  if (!nextStatus) return null;

  async function handleAdvance() {
    startTransition(async () => {
      const result = await updateItemStatusAction(itemId, {
        newStatus: nextStatus,
      });
      if (result.success) {
        router.refresh();
      } else {
        toast.error(result.error || t("errorFailedToUpdateStatus"));
      }
    });
  }

  return (
    <button
      onClick={(e) => {
        e.preventDefault(); // don't trigger row link
        handleAdvance();
      }}
      disabled={isPending}
      title={t(getStatusLabelKey(nextStatus))}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors",
        "border-border/50 bg-background text-muted-foreground",
        "hover:border-primary/50 hover:bg-primary/5 hover:text-primary",
        "disabled:opacity-40",
      )}
    >
      {isPending ? (
        <span className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
      ) : (
        <ArrowRight className="h-3 w-3" />
      )}
      <span>{t(getStatusLabelKey(nextStatus))}</span>
    </button>
  );
}
