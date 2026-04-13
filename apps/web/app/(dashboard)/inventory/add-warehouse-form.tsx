"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { createWarehouseAction } from "@/app/actions/inventory";
import { FormInput } from "@/components/ui/form-field";
import { useFocusTrap } from "@/hooks/use-focus-trap";

export function AddWarehouseForm() {
  const router = useRouter();
  const t = useTranslations("inventory");
  const tc = useTranslations("common");
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, isOpen);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const input = {
      name: formData.get("name") as string,
      address: (formData.get("address") as string) || undefined,
      isDefault: formData.get("isDefault") === "on",
    };

    startTransition(async () => {
      const result = await createWarehouseAction(input);
      if (result.success) {
        setIsOpen(false);
        router.refresh();
      } else {
        setError(result.error || tc("error"));
      }
    });
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        <Plus className="h-4 w-4" />
        {t("addWarehouse")}
      </button>
    );
  }

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{t("addWarehouse")}</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-lg p-1 hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              {t("warehouseName")} <span className="text-red-500">*</span>
            </label>
            <FormInput
              name="name"
              type="text"
              required
              placeholder={t("warehouseNamePlaceholder")}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              {t("location")}
            </label>
            <FormInput
              name="address"
              type="text"
              placeholder={t("locationPlaceholder")}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              name="isDefault"
              type="checkbox"
              id="isDefault"
              className="h-4 w-4 rounded border-input"
            />
            <label htmlFor="isDefault" className="text-sm font-medium">
              {t("defaultWarehouse")}
            </label>
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isPending ? tc("creating") : tc("create")}
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg border px-4 py-2 text-sm hover:bg-muted transition-colors"
            >
              {tc("cancel")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
