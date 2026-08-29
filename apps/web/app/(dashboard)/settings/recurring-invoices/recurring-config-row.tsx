"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { MoreVertical, Edit, Trash2, Power, PowerOff } from "lucide-react";
import { DEFAULT_LOCALE } from "@kivvi/core/src/config/locale";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  deleteRecurringConfigAction,
  toggleRecurringConfigAction,
} from "@/app/actions/recurring-invoices";
import { toast } from "sonner";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface RecurringConfigRowProps {
  config: {
    id: string;
    orderNumber: string;
    contactName: string;
    periodicity: string;
    nextGenerationDate: string;
    isActive: boolean;
    endDate: string | null;
  };
  periodicityLabel: string;
}

export function RecurringConfigRow({ config, periodicityLabel }: RecurringConfigRowProps) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const confirmRef = useRef<HTMLDivElement>(null);
  useFocusTrap(confirmRef, showDeleteConfirm, () => setShowDeleteConfirm(false));

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const result = await deleteRecurringConfigAction(config.id);
      if (result.success) {
        toast.success(t("recurring.deleted"));
        router.refresh();
      } else {
        toast.error(result.error || tc("error"));
      }
    } catch {
      toast.error(tc("error"));
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  async function handleToggle() {
    setIsToggling(true);
    try {
      const result = await toggleRecurringConfigAction({
        configId: config.id,
        isActive: !config.isActive,
      });
      if (result.success) {
        toast.success(config.isActive ? t("recurring.deactivated") : t("recurring.activated"));
        router.refresh();
      } else {
        toast.error(result.error || tc("error"));
      }
    } catch {
      toast.error(tc("error"));
    } finally {
      setIsToggling(false);
    }
  }

  const isExpired = config.endDate && config.endDate < new Date().toISOString().split("T")[0];

  return (
    <div className="relative grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto] gap-4 px-6 py-4 text-sm items-center transition-colors hover:bg-muted/50">
      <Link
        href={`/settings/recurring-invoices/${config.id}`}
        className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        aria-label={config.orderNumber}
      />
      <div className="font-medium">{config.orderNumber}</div>
      <div className="text-muted-foreground">{config.contactName}</div>
      <div>{periodicityLabel}</div>
      <div className="text-muted-foreground">
        {new Date(config.nextGenerationDate).toLocaleDateString(DEFAULT_LOCALE)}
      </div>
      <div>
        {isExpired ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-neutral/10 px-2 py-1 text-xs font-medium text-neutral">
            {t("recurring.expired")}
          </span>
        ) : config.isActive ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-1 text-xs font-medium text-success">
            {t("recurring.active")}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-neutral/10 px-2 py-1 text-xs font-medium text-neutral">
            {t("recurring.inactive")}
          </span>
        )}
      </div>
      <div className="relative z-10">
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={tc("actions")}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-accent transition-colors"
          >
            <MoreVertical className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/settings/recurring-invoices/${config.id}`}>
                <Edit className="mr-2 h-4 w-4" />
                {tc("edit")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleToggle} disabled={isToggling || !!isExpired}>
              {config.isActive ? (
                <>
                  <PowerOff className="mr-2 h-4 w-4" />
                  {t("recurring.deactivate")}
                </>
              ) : (
                <>
                  <Power className="mr-2 h-4 w-4" />
                  {t("recurring.activate")}
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isDeleting}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {tc("delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div
          ref={confirmRef}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={`recurring-delete-title-${config.id}`}
            aria-describedby={`recurring-delete-desc-${config.id}`}
            className="mx-4 w-full max-w-md rounded-xl border bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id={`recurring-delete-title-${config.id}`} className="text-lg font-semibold">
              {tc("delete")}
            </h3>
            <p
              id={`recurring-delete-desc-${config.id}`}
              className="mt-2 text-sm text-muted-foreground"
            >
              {t("recurring.confirmDelete")}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                {tc("cancel")}
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
              >
                {isDeleting ? tc("deleting") : tc("delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
