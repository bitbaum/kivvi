"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2 } from "lucide-react";
import { createBankAccountAction } from "@/app/actions/banking";
import { useTranslations } from "next-intl";
import { FormInput, FormSelect } from "@/components/ui/form-field";
import { DEFAULT_CURRENCY } from "@kivvi/core/src/config/locale";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { Button } from "@/components/ui/button";

export function AddAccountForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations("banking");
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, isOpen, () => setIsOpen(false));
  const tc = useTranslations("common");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const input = {
      name: formData.get("name") as string,
      iban: (formData.get("iban") as string) || undefined,
      bankName: (formData.get("bankName") as string) || undefined,
      currency: (formData.get("currency") as string) || DEFAULT_CURRENCY,
    };

    startTransition(async () => {
      const result = await createBankAccountAction(input);
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
        {t("addAccount")}
      </Button>
    );
  }

  return (
    <div ref={modalRef} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-account-title"
        className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id="add-account-title" className="text-lg font-semibold">
            {t("addAccount")}
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
            <label className="block text-sm font-medium mb-1">
              {t("accountName")} <span className="text-destructive">*</span>
            </label>
            <FormInput
              name="name"
              type="text"
              required
              placeholder={t("placeholders.accountName")}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">IBAN</label>
            <FormInput
              name="iban"
              type="text"
              placeholder="CH93 0076 2011 6238 5295 7"
              className="font-mono"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t("bankName")}</label>
            <FormInput name="bankName" type="text" placeholder={t("placeholders.bankName")} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{tc("currency")}</label>
            <FormSelect name="currency" defaultValue={DEFAULT_CURRENCY}>
              <option value="CHF">CHF</option>
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
              <option value="GBP">GBP</option>
            </FormSelect>
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
            <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>
              {tc("cancel")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
