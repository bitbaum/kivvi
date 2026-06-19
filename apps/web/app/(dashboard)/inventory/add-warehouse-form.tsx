"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { createWarehouseAction } from "@/app/actions/inventory";
import { FormInput } from "@/components/ui/form-field";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { Button } from "@/components/ui/button";

export function AddWarehouseForm() {
  const router = useRouter();
  const t = useTranslations("inventory");
  const tc = useTranslations("common");
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, isOpen, () => setIsOpen(false));

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
      <Button onClick={() => setIsOpen(true)}>
        <Plus className="h-4 w-4" />
        {t("addWarehouse")}
      </Button>
    );
  }

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-warehouse-title"
        className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id="add-warehouse-title" className="text-lg font-semibold">
            {t("addWarehouse")}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            aria-label={tc("close")}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="warehouse-name"
              className="block text-sm font-medium mb-1"
            >
              {t("warehouseName")} <span className="text-destructive">*</span>
            </label>
            <FormInput
              id="warehouse-name"
              name="name"
              type="text"
              required
              placeholder={t("warehouseNamePlaceholder")}
            />
          </div>

          <div>
            <label
              htmlFor="warehouse-address"
              className="block text-sm font-medium mb-1"
            >
              {t("location")}
            </label>
            <FormInput
              id="warehouse-address"
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
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isPending ? tc("creating") : tc("create")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsOpen(false)}
            >
              {tc("cancel")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
