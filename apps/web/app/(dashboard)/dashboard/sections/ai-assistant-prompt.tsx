"use client";

import { useRouter } from "next/navigation";
import { MessageSquare, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

export function AIAssistantPrompt() {
  const router = useRouter();
  const t = useTranslations("dashboard.aiAssistant");

  const quickPrompts = [
    {
      label: t("repairQueue"),
      query: t("repairQueueQuery"),
    },
    {
      label: t("readyForSale"),
      query: t("readyForSaleQuery"),
    },
    {
      label: t("overdueInvoices"),
      query: t("overdueInvoicesQuery"),
    },
    {
      label: t("impactThisMonth"),
      query: t("impactThisMonthQuery"),
    },
  ];

  const handlePromptClick = (query: string) => {
    const encodedQuery = encodeURIComponent(query);
    router.push(`/chat?q=${encodedQuery}`);
  };

  return (
    <div className="rounded-xl border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
          <Sparkles className="h-6 w-6" />
        </div>
        <div className="flex-1 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">{t("title")}</h2>
            <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>

          {/* Quick prompts */}
          <div className="grid gap-2 sm:grid-cols-2">
            {quickPrompts.map((prompt, index) => (
              <button
                key={index}
                onClick={() => handlePromptClick(prompt.query)}
                className="group flex items-center gap-3 rounded-lg border bg-card p-3 text-left transition-all hover:bg-accent hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                <span className="text-sm font-medium">{prompt.label}</span>
              </button>
            ))}
          </div>

          {/* Main CTA */}
          <button
            onClick={() => router.push("/chat")}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <MessageSquare className="h-4 w-4" />
            {t("openChat")}
          </button>
        </div>
      </div>
    </div>
  );
}
