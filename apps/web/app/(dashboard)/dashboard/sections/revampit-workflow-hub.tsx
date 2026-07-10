import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  ArrowRight,
  Banknote,
  BarChart3,
  Bot,
  FileText,
  HeartHandshake,
  PackageSearch,
  PlugZap,
  ReceiptText,
  Users,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const workflowLanes = [
  {
    key: "inventory",
    href: "/intake/quick",
    secondaryHref: "/inventory",
    icon: PackageSearch,
  },
  {
    key: "contacts",
    href: "/contacts",
    secondaryHref: "/contacts/new",
    icon: Users,
  },
  {
    key: "sales",
    href: "/sales/invoices",
    secondaryHref: "/sales/invoices/new",
    icon: FileText,
  },
  {
    key: "service",
    href: "/repairs",
    secondaryHref: "/intake/repair-queue",
    icon: Wrench,
  },
  {
    key: "money",
    href: "/money",
    secondaryHref: "/banking",
    icon: Banknote,
  },
  {
    key: "purchasing",
    href: "/purchasing/purchase-invoices",
    secondaryHref: "/purchasing/purchase-orders",
    icon: ReceiptText,
  },
  {
    key: "reports",
    href: "/reports",
    secondaryHref: "/reports/vat",
    icon: BarChart3,
  },
  {
    key: "integrations",
    href: "/settings/webhooks",
    secondaryHref: "/settings/api-tokens",
    icon: PlugZap,
  },
] as const;

export async function RevampitWorkflowHub() {
  const t = await getTranslations("dashboard.revampitHub");

  return (
    <section className="rounded-xl border bg-card">
      <div className="flex flex-col gap-4 border-b p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-3xl">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <HeartHandshake className="h-3.5 w-3.5" />
            {t("eyebrow")}
          </div>
          <h2 className="text-lg font-semibold">{t("title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/chat">
            <Bot className="h-4 w-4" />
            {t("askKivvi")}
          </Link>
        </Button>
      </div>

      <div className="grid gap-px bg-border sm:grid-cols-2 xl:grid-cols-4">
        {workflowLanes.map((lane) => {
          const Icon = lane.icon;
          return (
            <div key={lane.key} className="bg-card p-4">
              <div className="flex min-h-full flex-col gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-foreground">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-medium leading-tight">
                      {t(`${lane.key}.title`)}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t(`${lane.key}.description`)}
                    </p>
                  </div>
                </div>

                <div className="mt-auto flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <Button asChild size="sm">
                    <Link href={lane.href}>
                      {t(`${lane.key}.primary`)}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" size="sm">
                    <Link href={lane.secondaryHref}>
                      {t(`${lane.key}.secondary`)}
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
