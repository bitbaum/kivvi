"use client";

import { Check, CreditCard, Banknote, Smartphone } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatCurrency } from "@/lib/utils";
import type { PaymentMethod } from "../_types";

const PAYMENT_METHODS: {
  value: PaymentMethod;
  icon: React.ReactNode;
  labelKey: string;
}[] = [
  {
    value: "cash",
    icon: <Banknote className="h-5 w-5" />,
    labelKey: "posCash",
  },
  {
    value: "card",
    icon: <CreditCard className="h-5 w-5" />,
    labelKey: "posCard",
  },
  {
    value: "twint",
    icon: <Smartphone className="h-5 w-5" />,
    labelKey: "posTwint",
  },
];

interface PosPaymentPanelProps {
  total: string;
  cartCount: number;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (m: PaymentMethod) => void;
  error: string | null;
  isPending: boolean;
  onCompleteSale: () => void;
}

export function PosPaymentPanel({
  total,
  cartCount,
  paymentMethod,
  setPaymentMethod,
  error,
  isPending,
  onCompleteSale,
}: PosPaymentPanelProps) {
  const t = useTranslations("inventory");
  const tc = useTranslations("common");

  return (
    <div className="flex w-72 shrink-0 flex-col gap-4">
      <div className="rounded-xl border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">{tc("total")}</p>
        <p className="mt-2 text-4xl font-bold tabular-nums">{formatCurrency(total)}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {cartCount} {cartCount === 1 ? tc("item") : tc("items")}
        </p>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <p className="mb-3 text-sm font-medium">{t("posPaymentMethod")}</p>
        <div className="flex flex-col gap-2">
          {PAYMENT_METHODS.map((pm) => (
            <button
              key={pm.value}
              onClick={() => setPaymentMethod(pm.value)}
              className={`flex items-center gap-3 rounded-lg border-2 px-4 py-3 text-left font-medium transition-colors min-h-[48px] ${
                paymentMethod === pm.value
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-transparent hover:border-muted-foreground/20 hover:bg-muted"
              }`}
            >
              {pm.icon}
              {t(pm.labelKey as Parameters<typeof t>[0])}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-destructive text-center">{error}</p>}

      <button
        onClick={onCompleteSale}
        disabled={cartCount === 0 || isPending}
        className="mt-auto flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-base font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 min-h-[56px]"
      >
        {isPending ? (
          <>{tc("loading")}…</>
        ) : (
          <>
            <Check className="h-5 w-5" />
            {t("posCompleteSale")}
          </>
        )}
      </button>
    </div>
  );
}
