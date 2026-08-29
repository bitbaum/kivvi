"use client";

import { Check, Shield } from "lucide-react";
import { useTranslations } from "next-intl";

function Feature({ text }: { text: string }) {
  return (
    <li className="flex items-center gap-3">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20">
        <Check className="h-3.5 w-3.5" />
      </div>
      <span className="text-sm">{text}</span>
    </li>
  );
}

export function RegisterFeaturesPanel() {
  const t = useTranslations("auth");
  return (
    <div className="hidden flex-1 items-center justify-center brand-gradient p-12 lg:flex">
      <div className="max-w-md text-white">
        <h2 className="mb-3 text-3xl font-bold leading-tight">{t("businessOnAutopilot")}</h2>
        <p className="mb-8 text-white/80">{t("heroSubtitle")}</p>

        <ul className="space-y-4">
          <Feature text={t("features.aiInvoices")} />
          <Feature text={t("features.bankMatching")} />
          <Feature text={t("features.paymentReminders")} />
          <Feature text={t("features.qrBills")} />
          <Feature text={t("features.selfHostAI")} />
        </ul>

        <div className="mt-10 flex items-center gap-3 rounded-lg bg-white/10 px-4 py-3 backdrop-blur-sm">
          <Shield className="h-5 w-5 shrink-0 text-white/60" />
          <p className="text-sm text-white/80">{t("securityNote")}</p>
        </div>
      </div>
    </div>
  );
}
