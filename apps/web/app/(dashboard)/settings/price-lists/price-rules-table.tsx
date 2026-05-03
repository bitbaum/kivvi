"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { deletePriceRuleAction } from "@/app/actions/pricing";
import type { PriceRuleWithProduct } from "@kivvi/core/src/domain/pricing";

interface Props {
  rules: PriceRuleWithProduct[];
  priceListId: string;
}

const RULE_TYPE_KEYS: Record<string, string> = {
  fixed: "ruleTypeFixed",
  percentage: "ruleTypePercentage",
  tiered: "ruleTypeTiered",
};

export function PriceRulesTable({ rules, priceListId }: Props) {
  const t = useTranslations("priceLists");
  const tc = useTranslations("common");
  const [isPending, startTransition] = useTransition();

  if (rules.length === 0) {
    return (
      <div className="px-6 py-8 text-center text-sm text-muted-foreground">
        {t("noRules")}
      </div>
    );
  }

  function handleDelete(ruleId: string) {
    if (!confirm(t("deleteRuleConfirm"))) return;
    startTransition(async () => {
      await deletePriceRuleAction({ ruleId, priceListId });
    });
  }

  return (
    <div>
      <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_auto] gap-4 border-b px-6 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <div>{t("ruleProduct")}</div>
        <div>{t("ruleType")}</div>
        <div>{t("ruleValue")}</div>
        <div>{t("ruleMinQty")}</div>
        <div />
      </div>
      <div className="divide-y">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className="grid grid-cols-[2fr_1.5fr_1fr_1fr_auto] gap-4 px-6 py-3 items-center text-sm"
          >
            <div className="font-medium">
              {rule.productName ?? t("allProducts")}
              {rule.productSku && (
                <span className="ml-1.5 text-xs text-muted-foreground">
                  {rule.productSku}
                </span>
              )}
            </div>
            <div className="text-muted-foreground">
              {t(RULE_TYPE_KEYS[rule.type] as Parameters<typeof t>[0])}
            </div>
            <div>
              {rule.value}
              {rule.type !== "fixed" && "%"}
            </div>
            <div className="text-muted-foreground">
              {rule.minQuantity ?? "—"}
            </div>
            <button
              onClick={() => handleDelete(rule.id)}
              disabled={isPending}
              className="rounded p-1 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
              aria-label={tc("delete")}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
