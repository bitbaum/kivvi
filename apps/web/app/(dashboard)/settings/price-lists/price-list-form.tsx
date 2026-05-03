"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  createPriceListAction,
  updatePriceListAction,
} from "@/app/actions/pricing";
import type { PriceList } from "@kivvi/database";
import { DEFAULT_CURRENCY } from "@kivvi/core/src/config/locale";

interface Props {
  list?: PriceList;
}

export function PriceListForm({ list }: Props) {
  const t = useTranslations("priceLists");
  const tc = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    const input = {
      name: formData.get("name") as string,
      currency: (formData.get("currency") as string) || DEFAULT_CURRENCY,
      isDefault: formData.get("isDefault") === "on",
    };

    startTransition(async () => {
      const result = list
        ? await updatePriceListAction({ id: list.id, input })
        : await createPriceListAction(input);

      if (result.success && result.data) {
        if (!list) {
          router.push(`/settings/price-lists/${result.data.id}`);
        }
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="pl-name">
          {t("fieldName")}
        </label>
        <input
          id="pl-name"
          name="name"
          defaultValue={list?.name ?? ""}
          required
          className="block w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="pl-currency">
          {t("fieldCurrency")}
        </label>
        <input
          id="pl-currency"
          name="currency"
          defaultValue={list?.currency ?? DEFAULT_CURRENCY}
          maxLength={3}
          className="block w-28 rounded-lg border bg-background px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="flex items-start gap-3">
        <input
          id="pl-default"
          name="isDefault"
          type="checkbox"
          defaultChecked={list?.isDefault ?? false}
          className="mt-0.5 h-4 w-4 rounded border-input"
        />
        <div>
          <label className="text-sm font-medium" htmlFor="pl-default">
            {t("fieldIsDefault")}
          </label>
          <p className="text-xs text-muted-foreground">
            {t("fieldIsDefaultDesc")}
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {isPending ? tc("saving") : tc("save")}
        </button>
      </div>
    </form>
  );
}
