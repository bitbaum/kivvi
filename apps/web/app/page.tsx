import Link from "next/link";
import {
  ArrowRight,
  PackageOpen,
  ClipboardCheck,
  Tag,
  BarChart3,
  Sparkles,
  Shield,
  Mail,
  Github,
  Recycle,
} from "lucide-react";
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
            <a
              href="#contact"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {t("requestDemo")}
            </a>
          </div>
        </nav>
      </header>

      <main className="container mx-auto px-4">
        {/* ============================================================ */}
        {/* HERO — Problem first, not feature first                      */}
        {/* ============================================================ */}
        <section className="mx-auto max-w-3xl py-20 text-center">
          <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            {t("heroTitle")}
          </h1>
          <p className="mb-6 text-xl font-medium text-primary sm:text-2xl">
            {t("heroTitleHighlight")}
          </p>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground">
            {t("heroDescription")}
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="#contact"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground hover:bg-primary/90"
            >
              {t("heroCta")}
              <ArrowRight className="h-4 w-4" />
            </a>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-lg border px-6 py-3 font-medium hover:bg-muted"
            >
              {t("heroCtaSecondary")}
            </Link>
          </div>
        </section>

        {/* ============================================================ */}
        {/* ORIGIN STORY — Who built this and why                        */}
        {/* ============================================================ */}
        <section className="mx-auto max-w-4xl py-16">
          <div className="rounded-2xl border bg-card p-8 sm:p-12">
            <div className="flex items-center gap-3 mb-6">
              <Recycle className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">{t("originTitle")}</h2>
            </div>
            <p className="text-lg leading-relaxed text-muted-foreground">
              {t("originStory")}
            </p>
            <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-4">
              <StatBlock
                value={t("originStat1")}
                label={t("originStat1Label")}
              />
              <StatBlock
                value={t("originStat2")}
                label={t("originStat2Label")}
              />
              <StatBlock
                value={t("originStat3")}
                label={t("originStat3Label")}
              />
              <StatBlock
                value={t("originStat4")}
                label={t("originStat4Label")}
              />
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* SCENARIOS — A typical day, not a feature list                */}
        {/* ============================================================ */}
        <section className="mx-auto max-w-4xl py-16">
          <h2 className="mb-12 text-center text-3xl font-bold">
            {t("scenarioTitle")}
          </h2>

          <div className="space-y-12">
            <ScenarioCard
              time={t("scenario1Time")}
              title={t("scenario1Title")}
              text={t("scenario1Text")}
              icon={<PackageOpen className="h-5 w-5" />}
              color="blue"
            />
            <ScenarioCard
              time={t("scenario2Time")}
              title={t("scenario2Title")}
              text={t("scenario2Text")}
              icon={<ClipboardCheck className="h-5 w-5" />}
              color="amber"
            />
            <ScenarioCard
              time={t("scenario3Time")}
              title={t("scenario3Title")}
              text={t("scenario3Text")}
              icon={<BarChart3 className="h-5 w-5" />}
              color="green"
            />
          </div>
        </section>

        {/* ============================================================ */}
        {/* CAPABILITIES — Compact, not cards                            */}
        {/* ============================================================ */}
        <section className="mx-auto max-w-4xl py-16">
          <h2 className="mb-8 text-center text-2xl font-bold">
            {t("capabilitiesTitle")}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Capability
              icon={<Recycle className="h-4 w-4" />}
              text={t("cap1")}
            />
            <Capability
              icon={<ClipboardCheck className="h-4 w-4" />}
              text={t("cap2")}
            />
            <Capability icon={<Tag className="h-4 w-4" />} text={t("cap3")} />
            <Capability
              icon={<BarChart3 className="h-4 w-4" />}
              text={t("cap4")}
            />
            <Capability
              icon={<Sparkles className="h-4 w-4" />}
              text={t("cap5")}
            />
            <Capability
              icon={<Shield className="h-4 w-4" />}
              text={t("cap6")}
            />
          </div>
        </section>

        {/* ============================================================ */}
        {/* CTA + CONTACT                                                */}
        {/* ============================================================ */}
        <section id="contact" className="mx-auto max-w-2xl py-16 text-center">
          <h2 className="mb-4 text-3xl font-bold">{t("ctaTitle")}</h2>
          <p className="mb-8 text-lg text-muted-foreground">
            {t("ctaDescription")}
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <a
              href={`mailto:${t("ctaEmail")}`}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Mail className="h-4 w-4" />
              {t("ctaEmail")}
            </a>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-lg border px-6 py-3 font-medium hover:bg-muted"
            >
              {t("ctaTryIt")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="container mx-auto border-t px-4 py-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <KivviLogo size={24} />
            <span className="font-semibold">Kivvi</span>
            <span className="text-sm text-muted-foreground">
              — {t("footerBuiltBy")} · {t("footerOpenSource")}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/impressum" className="hover:text-foreground">
              {t("footerImpressum")}
            </Link>
            <Link href="/datenschutz" className="hover:text-foreground">
              {t("footerPrivacy")}
            </Link>
            <a
              href="https://github.com/g-but/kivvi"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground"
            >
              <Github className="h-4 w-4" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function StatBlock({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-bold text-primary">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

const SCENARIO_COLORS = {
  blue: "border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20",
  amber: "border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20",
  green: "border-l-green-500 bg-green-50/50 dark:bg-green-950/20",
};

function ScenarioCard({
  time,
  title,
  text,
  icon,
  color,
}: {
  time: string;
  title: string;
  text: string;
  icon: React.ReactNode;
  color: "blue" | "amber" | "green";
}) {
  return (
    <div
      className={`rounded-xl border-l-4 p-6 sm:p-8 ${SCENARIO_COLORS[color]}`}
    >
      <div className="mb-3 flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {icon}
          <span>{time}</span>
        </div>
        <span className="text-sm font-bold">{title}</span>
      </div>
      <p className="text-muted-foreground leading-relaxed">{text}</p>
    </div>
  );
}

function Capability({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border p-4">
      <div className="mt-0.5 shrink-0 text-primary">{icon}</div>
      <span className="text-sm">{text}</span>
    </div>
  );
}
