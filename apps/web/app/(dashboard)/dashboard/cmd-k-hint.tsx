"use client";

import { FeatureHint } from "@/components/feature-hint";
import { useTranslations } from "next-intl";

export function CmdKHint() {
  const t = useTranslations("dashboard");

  return <FeatureHint id="cmd-k-intro" message={t("commandHint")} />;
}
