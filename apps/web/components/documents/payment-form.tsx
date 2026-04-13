"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CreditCard, AlertTriangle, Loader2 } from "lucide-react";
import { recordPaymentAction } from "@/app/actions/documents";
import { FormInput, FormSelect } from "@/components/ui/form-field";
import { DEFAULT_LOCALE } from "@kivvi/core/src/config/locale";
import type { PaymentMethodValue } from "@kivvi/database/src/enums";

export function PaymentForm({
  documentId,
  outstanding,
  currency,
}: {
  documentId: string;
  outstanding: string;
  currency: string;
}) {
  const router = useRouter();
  const t = useTranslations("documents");
  const tc = useTranslations("common");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState(outstanding);

  const isOverpayment = parseFloat(amount || "0") > parseFloat(outstanding);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
      >
        <CreditCard className="h-4 w-4" />
        {t("recordPayment")}
      </button>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await recordPaymentAction(documentId, {
        amount: formData.get("amount") as string,
        date: formData.get("date") as string,
        method:
          (formData.get("method") as PaymentMethodValue) || "bank_transfer",
        reference: (formData.get("reference") as string) || undefined,
      });

      if (result.success) {
        setIsOpen(false);
        router.refresh();
      } else {
        setError(result.error || tc("error"));
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Outstanding context */}
      <p className="text-xs text-muted-foreground">
        {t("outstanding")}:{" "}
        <span className="font-medium text-foreground">
          {currency}{" "}
          {parseFloat(outstanding).toLocaleString(DEFAULT_LOCALE, {
            minimumFractionDigits: 2,
          })}
        </span>
      </p>
      <div>
        <label
          htmlFor="pay-amount"
          className="block text-xs font-medium text-muted-foreground"
        >
          {t("paymentAmount")} ({currency})
        </label>
        <FormInput
          id="pay-amount"
          name="amount"
          type="number"
          step="0.01"
          value={amount}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setAmount(e.target.value)
          }
          required
          className="mt-1"
        />
        {isOverpayment && (
          <p className="mt-1 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-3 w-3" />
            {t("overpaymentWarning")}
          </p>
        )}
      </div>
      <div>
        <label
          htmlFor="pay-date"
          className="block text-xs font-medium text-muted-foreground"
        >
          {t("paymentDate")}
        </label>
        <FormInput
          id="pay-date"
          name="date"
          type="date"
          defaultValue={new Date().toISOString().split("T")[0]}
          required
          className="mt-1"
        />
      </div>
      <div>
        <label
          htmlFor="pay-method"
          className="block text-xs font-medium text-muted-foreground"
        >
          {t("paymentMethod")}
        </label>
        <FormSelect id="pay-method" name="method" className="mt-1">
          <option value="bank_transfer">
            {t("paymentMethods.bank_transfer")}
          </option>
          <option value="cash">{t("paymentMethods.cash")}</option>
          <option value="card">{t("paymentMethods.card")}</option>
          <option value="other">{t("paymentMethods.other")}</option>
        </FormSelect>
      </div>
      <div>
        <label
          htmlFor="pay-reference"
          className="block text-xs font-medium text-muted-foreground"
        >
          {t("paymentReferenceLabel")}
        </label>
        <FormInput
          id="pay-reference"
          name="reference"
          type="text"
          placeholder={t("paymentReference")}
          className="mt-1"
        />
      </div>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {isPending ? tc("saving") : t("savePayment")}
        </button>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="rounded-lg border px-3 py-2 text-sm hover:bg-muted"
        >
          {tc("cancel")}
        </button>
      </div>
    </form>
  );
}
