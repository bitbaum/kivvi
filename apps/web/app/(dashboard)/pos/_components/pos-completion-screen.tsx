"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

interface PosCompletionScreenProps {
  invoiceId: string;
  number: string;
  onNewSale: () => void;
}

export function PosCompletionScreen({ invoiceId, number, onNewSale }: PosCompletionScreenProps) {
  const t = useTranslations("inventory");
  const router = useRouter();

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 text-center px-4">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
        <Check className="h-10 w-10 text-success" />
      </div>
      <div>
        <h2 className="text-2xl font-bold">{t("posSaleComplete")}</h2>
        <p className="mt-1 text-muted-foreground">{t("posInvoiceNumber", { number })}</p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => router.push(`/sales/invoices/${invoiceId}`)}
          className="rounded-xl border px-5 py-3 text-sm font-medium hover:bg-muted"
        >
          {t("posViewInvoice")}
        </button>
        <button
          onClick={onNewSale}
          className="rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {t("posNewSale")}
        </button>
      </div>
    </div>
  );
}
