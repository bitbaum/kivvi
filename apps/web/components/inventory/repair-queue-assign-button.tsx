"use client";

import { useState, useTransition } from "react";
import { User, ChevronDown, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { assignItemTechnicianAction } from "@/app/actions/inventory-items";

interface CompanyUser {
  id: string;
  label: string;
}

interface RepairQueueAssignButtonProps {
  itemId: string;
  assignedToUserId: string | null;
  assignedToName: string | null;
  companyUsers: CompanyUser[];
}

export function RepairQueueAssignButton({
  itemId,
  assignedToUserId,
  assignedToName,
  companyUsers,
}: RepairQueueAssignButtonProps) {
  const ti = useTranslations("inventory");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function assign(userId: string | null) {
    setOpen(false);
    startTransition(async () => {
      const result = await assignItemTechnicianAction({
        itemId,
        input: { assignedToUserId: userId },
      });
      if (!result.success) {
        toast.error(result.error ?? tc("error"));
      }
    });
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        disabled={isPending}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "flex min-h-[44px] items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-colors",
          assignedToUserId
            ? "bg-primary/10 text-primary hover:bg-primary/20"
            : "bg-muted text-muted-foreground hover:bg-muted/80",
          isPending && "opacity-50 cursor-not-allowed",
        )}
      >
        <User className="h-3.5 w-3.5" />
        <span className="max-w-[100px] truncate">
          {assignedToName ?? ti("assignItem")}
        </span>
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
            }}
          />
          {/* Dropdown */}
          <div className="absolute right-0 z-20 mt-1 min-w-[180px] rounded-lg border bg-popover shadow-md">
            <div className="p-1">
              {companyUsers.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    assign(u.id);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                    u.id === assignedToUserId && "font-medium text-primary",
                  )}
                >
                  <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  {u.label}
                </button>
              ))}
              {assignedToUserId && (
                <>
                  <div className="my-1 h-px bg-border" />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      assign(null);
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
                  >
                    <X className="h-3.5 w-3.5" />
                    {ti("unassignItem")}
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
