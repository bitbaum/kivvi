import Link from "next/link";
import {
  ArrowRight,
  Tag,
  BarChart3,
  Sparkles,
  Shield,
  Recycle,
  BookOpen,
  ClipboardCheck,
} from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { VERTICALS, buildPageMeta } from "@/lib/config/site";
import { PainList } from "@/components/landing/pain-list";
import { LandingCtaSection } from "@/components/landing/landing-cta-section";
import { VerticalCard } from "@/components/landing/vertical-card";
import { Button } from "@/components/ui/button";
import { ScenariosSection } from "./landing-scenarios-section";
import { DeploymentOptionsSection } from "./landing-deployment-section";
import { AIAutopilotSection } from "./landing-ai-section";

const SOFTWARE_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Kivvi",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "Das Betriebssystem der Kreislaufwirtschaft — Open-Source-ERP für Brockenhäuser, IT-Refurbisher, Repair Cafés und Vintage-Shops",
  offers: { "@type": "Offer", price: "0", priceCurrency: "CHF" },
  creator: {
    "@type": "Organization",
    name: "revamp-it",
    url: "https://revamp-it.ch",
  },
  license: "https://opensource.org/licenses/MIT",
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("landing.metadata");
  const locale = await getLocale();
  const title = t("title");
  const description = t("description");
  return {
    title,
    description,
    ...buildPageMeta(title, description, locale),
  };
}

export default async function Home() {
  const t = await getTranslations("landing");
  const tVerticals = await getTranslations("landing.verticals");
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(SOFTWARE_LD) }}
      />
      {/* ============================================================ */}
      {/* HERO                                                         */}
      {/* ============================================================ */}
      <section className="mx-auto max-w-3xl py-20 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground">
          <Recycle className="h-3.5 w-3.5 text-primary" />
          {t("heroBadge")}
        </div>
        <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          {t("heroTitle")}
        </h1>
        <p className="mb-6 text-xl font-medium text-primary sm:text-2xl">
          {t("heroTagline")}
        </p>
        <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground">
          {t("heroDescription")}
        </p>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/contact">
              {t("requestDemo")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link href="/register">{t("heroCtaSecondary")}</Link>
          </Button>
        </div>
      </section>

      {/* ============================================================ */}
      {/* FOR WHOM — derived from VERTICALS config                     */}
      {/* ============================================================ */}
      <section className="mx-auto max-w-5xl py-8">
        <p className="mb-8 text-center text-sm font-medium uppercase tracking-wider text-muted-foreground">
          {t("forTitle")}
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {VERTICALS.map((v) => (
            <VerticalCard
              key={v.id}
              id={v.id}
              href={v.href}
              title={tVerticals(`${v.id}.title`)}
              hook={tVerticals(`${v.id}.hook`)}
              bullets={tVerticals.raw(`${v.id}.bullets`) as string[]}
            />
          ))}
        </div>
      </section>

      {/* ============================================================ */}
      {/* PROBLEM — What standard ERPs can't do                        */}
      {/* ============================================================ */}
      <section className="mx-auto max-w-3xl py-16">
        <h2 className="mb-8 text-center text-2xl font-bold">
          {t("problemTitle")}
        </h2>
        <PainList
          items={[
            t("problem1"),
            t("problem2"),
            t("problem3"),
            t("problem4"),
            t("problem5"),
          ]}
        />
        <div className="mt-6 text-center">
          <Button asChild variant="link" size="sm">
            <Link href="/how-it-works">
              {t("navHowItWorks")} <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      </section>

      {/* ============================================================ */}
      {/* AI / AUTOPILOT — Organisation auf Autopilot                  */}
      {/* ============================================================ */}
      <AIAutopilotSection />

      {/* ============================================================ */}
      {/* ORIGIN STORY — Who built this and why                        */}
      {/* ============================================================ */}
      <section className="mx-auto max-w-4xl py-8">
        <div className="rounded-2xl border bg-card p-8 sm:p-12">
          <div className="mb-6 flex items-center gap-3">
            <Recycle className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">{t("originTitle")}</h2>
          </div>
          <p className="text-lg leading-relaxed text-muted-foreground">
            {t("originStory")}
          </p>
          <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-3">
            <StatBlock value={t("originStat1")} label={t("originStat1Label")} />
            <StatBlock value={t("originStat3")} label={t("originStat3Label")} />
            <StatBlock value={t("originStat4")} label={t("originStat4Label")} />
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* SCENARIOS — A typical day, not a feature list                */}
      {/* ============================================================ */}
      <ScenariosSection />

      {/* ============================================================ */}
      {/* DEPLOYMENT OPTIONS — Open Source / Cloud / On-Premise        */}
      {/* ============================================================ */}
      <DeploymentOptionsSection />

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
                <h3 className="text-lg font-bold">
                  {t("knowledgeTeaserTitle")}
                </h3>
                <p className="mt-1 max-w-xl text-muted-foreground">
                  {t("knowledgeTeaserText")}
                </p>
              </div>
            </div>
            <Button asChild variant="secondary" className="shrink-0">
              <Link href="/knowledge">
                {t("knowledgeTeaserCta")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* CTA + CONTACT                                                */}
      {/* ============================================================ */}
      <LandingCtaSection
        id="contact"
        title={t("ctaTitle")}
        description={t("ctaDescription")}
      />
    </>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function StatBlock({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-bold text-primary">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
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
