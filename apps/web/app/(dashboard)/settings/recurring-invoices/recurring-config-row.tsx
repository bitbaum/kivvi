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

export function RecurringConfigRow({
  config,
  periodicityLabel,
}: RecurringConfigRowProps) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const confirmRef = useRef<HTMLDivElement>(null);
  useFocusTrap(confirmRef, showDeleteConfirm);

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
      toast.error("An error occurred");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  async function handleToggle() {
    setIsToggling(true);
    try {
      const result = await toggleRecurringConfigAction(
        config.id,
        !config.isActive,
      );
      if (result.success) {
        toast.success(
          config.isActive
            ? t("recurring.deactivated")
            : t("recurring.activated"),
        );
        router.refresh();
      } else {
        toast.error(result.error || tc("error"));
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsToggling(false);
    }
  }

  const isExpired =
    config.endDate && config.endDate < new Date().toISOString().split("T")[0];

  return (
    <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto] gap-4 px-6 py-4 text-sm items-center">
      <div className="font-medium">
        <Link
          href={`/settings/recurring-invoices/${config.id}`}
          className="hover:text-primary transition-colors"
        >
          {config.orderNumber}
        </Link>
      </div>
      <div className="text-muted-foreground">{config.contactName}</div>
      <div>{periodicityLabel}</div>
      <div className="text-muted-foreground">
        {new Date(config.nextGenerationDate).toLocaleDateString(DEFAULT_LOCALE)}
      </div>
      <div>
        {isExpired ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
            {t("recurring.expired")}
          </span>
        ) : config.isActive ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900/20 dark:text-green-400">
            {t("recurring.active")}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
            {t("recurring.inactive")}
          </span>
        )}
      </div>
      <div>
        <DropdownMenu>
          <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-accent transition-colors">
            <MoreVertical className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/settings/recurring-invoices/${config.id}`}>
                <Edit className="mr-2 h-4 w-4" />
                {tc("edit")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleToggle}
              disabled={isToggling || !!isExpired}
            >
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
            className="mx-4 w-full max-w-md rounded-xl border bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold">{tc("delete")}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
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
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
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
