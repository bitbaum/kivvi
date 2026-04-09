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
  Recycle,
  X,
  BookOpen,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kivvi — Das ERP für die Kreislaufwirtschaft",
  description:
    "Kivvi ist das ERP für Brockenhäuser, IT-Refurbisher, Repair Cafés und Vintage-Shops. Einzelartikel-Tracking, QR-Rechnungen, Impact-Dashboard — Open Source, Swiss-native.",
};

export default async function Home() {
  const t = await getTranslations("landing");

  return (
    <>
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
      {/* FOR WHOM — Business types                                    */}
      {/* ============================================================ */}
      <section className="mx-auto max-w-3xl py-4 text-center">
        <p className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          {t("forTitle")}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {(["for1", "for2", "for3", "for4", "for5", "for6"] as const).map(
            (key) => (
              <span
                key={key}
                className="rounded-full border bg-card px-4 py-1.5 text-sm"
              >
                {t(key)}
              </span>
            ),
          )}
        </div>
      </section>

      {/* ============================================================ */}
      {/* PROBLEM — What standard ERPs can't do                        */}
      {/* ============================================================ */}
      <section className="mx-auto max-w-3xl py-16">
        <h2 className="mb-8 text-center text-2xl font-bold">
          {t("problemTitle")}
        </h2>
        <div className="space-y-3">
          {(
            [
              "problem1",
              "problem2",
              "problem3",
              "problem4",
              "problem5",
            ] as const
          ).map((key) => (
            <div
              key={key}
              className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4"
            >
              <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <span className="text-sm">{t(key)}</span>
            </div>
          ))}
        </div>
        <div className="mt-6 text-center">
          <Link
            href="/how-it-works"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            {t("navHowItWorks")} <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </section>

      {/* ============================================================ */}
      {/* ORIGIN STORY — Who built this and why                        */}
      {/* ============================================================ */}
      <section className="mx-auto max-w-4xl py-8">
        <div className="rounded-2xl border bg-card p-8 sm:p-12">
          <div className="flex items-center gap-3 mb-6">
            <Recycle className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">{t("originTitle")}</h2>
          </div>
          <p className="text-lg leading-relaxed text-muted-foreground">
            {t("originStory")}
          </p>
          <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-4">
            <StatBlock value={t("originStat1")} label={t("originStat1Label")} />
            <StatBlock value={t("originStat2")} label={t("originStat2Label")} />
            <StatBlock value={t("originStat3")} label={t("originStat3Label")} />
            <StatBlock value={t("originStat4")} label={t("originStat4Label")} />
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
      <section className="mx-auto max-w-4xl py-8">
        <h2 className="mb-8 text-center text-2xl font-bold">
          {t("capabilitiesTitle")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Capability icon={<Recycle className="h-4 w-4" />} text={t("cap1")} />
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
          <Capability icon={<Shield className="h-4 w-4" />} text={t("cap6")} />
        </div>
      </section>

      {/* ============================================================ */}
      {/* KNOWLEDGE TEASER — Expertise signal                          */}
      {/* ============================================================ */}
      <section className="mx-auto max-w-4xl py-16">
        <div className="rounded-2xl border bg-card p-8">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-primary/10 p-3">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-lg">
                  {t("knowledgeTeaserTitle")}
                </h3>
                <p className="mt-1 text-muted-foreground max-w-xl">
                  {t("knowledgeTeaserText")}
                </p>
              </div>
            </div>
            <Link
              href="/knowledge"
              className="inline-flex shrink-0 items-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
            >
              {t("knowledgeTeaserCta")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
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
    </>
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
