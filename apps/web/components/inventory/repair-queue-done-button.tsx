"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { updateItemStatusAction } from "@/app/actions/inventory-items";
import { toast } from "sonner";

interface RepairQueueDoneButtonProps {
  itemId: string;
}

export function RepairQueueDoneButton({ itemId }: RepairQueueDoneButtonProps) {
  const ti = useTranslations("inventory");
  const tc = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDone(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      const result = await updateItemStatusAction(itemId, {
        newStatus: "testing",
      });
      if (result.success) {
        toast.success(ti("updated"));
        router.refresh();
      } else {
        toast.error(result.error ?? tc("error"));
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleDone}
      disabled={isPending}
      className={cn(
        "flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-colors",
        "bg-success/10 text-success hover:bg-success/20",
        isPending && "opacity-50 cursor-not-allowed",
      )}
    >
      {isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <CheckCircle className="h-3.5 w-3.5" />
      )}
      {ti("repairDoneAction")}
    </button>
  );
}
