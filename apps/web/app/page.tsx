import Link from "next/link";
import { ArrowRight, Bot, Zap, Shield, Globe } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/components/language-switcher";
import { KivviLogo } from "@/components/kivvi-logo";

export default async function Home() {
  const t = await getTranslations("landing");

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KivviLogo size={32} />
            <span className="text-xl font-bold">Kivvi</span>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {t("signIn")}
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {t("getStarted")}
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-4 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-sm">
            <Bot className="h-4 w-4" />
            <span>{t("aiFirstErp")}</span>
          </div>

          <h1 className="mb-6 text-5xl font-bold tracking-tight sm:text-6xl">
            {t("heroTitle")}{" "}
            <span className="brand-gradient-text">
              {t("heroTitleHighlight")}
            </span>
          </h1>

          <p className="mb-10 text-xl text-muted-foreground">
            {t("heroDescription")}
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground hover:bg-primary/90"
            >
              {t("startFreeTrial")}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 rounded-lg border px-6 py-3 font-medium hover:bg-muted"
            >
              {t("watchDemo")}
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mx-auto mt-32 max-w-5xl">
          <div className="grid gap-8 md:grid-cols-3">
            <FeatureCard
              icon={<Bot className="h-6 w-6" />}
              title={t("featureAiTitle")}
              description={t("featureAiDesc")}
            />
            <FeatureCard
              icon={<Zap className="h-6 w-6" />}
              title={t("featureSwissTitle")}
              description={t("featureSwissDesc")}
            />
            <FeatureCard
              icon={<Shield className="h-6 w-6" />}
              title={t("featureDataTitle")}
              description={t("featureDataDesc")}
            />
          </div>
        </div>

        {/* How it works */}
        <div className="mx-auto mt-32 max-w-3xl">
          <h2 className="mb-12 text-center text-3xl font-bold">
            {t("howItWorks")}
          </h2>

          <div className="space-y-8">
            <Step
              number={1}
              title={t("step1Title")}
              description={t("step1Desc")}
            />
            <Step
              number={2}
              title={t("step2Title")}
              description={t("step2Desc")}
            />
            <Step
              number={3}
              title={t("step3Title")}
              description={t("step3Desc")}
            />
          </div>
        </div>

        {/* CTA */}
        <div className="mx-auto mt-32 max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold">{t("readyToAutomate")}</h2>
          <p className="mb-8 text-muted-foreground">{t("joinSwissBusiness")}</p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-4 text-lg font-medium text-primary-foreground hover:bg-primary/90"
          >
            {t("getStartedFree")}
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto mt-32 border-t px-4 py-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <KivviLogo size={24} />
            <span className="font-semibold">Kivvi</span>
          </div>
          <p className="text-sm text-muted-foreground">{t("footer")}</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3 text-primary">
        {icon}
      </div>
      <h3 className="mb-2 font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
        {number}
      </div>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
