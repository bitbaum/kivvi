import { Wrench } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { SeeAlsoSection } from "@/components/landing/see-also-section";
import { PainList } from "@/components/landing/pain-list";
import { SolutionList } from "@/components/landing/solution-list";
import { LandingCtaSection } from "@/components/landing/landing-cta-section";
import { buildPageMeta } from "@/lib/config/site";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kivvi für Repair Cafés & Werkstätten",
  description:
    "Reparaturprotokoll pro Gerät, Stunden-Tracking, Impact-Nachweis für Förderanträge — für Repair Cafés und Werkstätten.",
  ...buildPageMeta(
    "Kivvi für Repair Cafés & Werkstätten",
    "Reparaturprotokoll pro Gerät, Stunden-Tracking, Impact-Nachweis für Förderanträge — für Repair Cafés und Werkstätten.",
  ),
};

export default async function ForRepairCafesPage() {
  const t = await getTranslations("landing.forRepairCafes");
  const painItems = t.raw("painItems") as string[];
  const solutionItems = t.raw("solutionItems") as string[];

  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-3xl py-16 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
          <Wrench className="h-4 w-4" />
          {t("hero.badge")}
        </div>
        <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
          {t("hero.title")}
        </h1>
        <p className="text-xl text-muted-foreground">{t("hero.description")}</p>
      </section>

      {/* The repair movement */}
      <section className="mx-auto max-w-3xl py-8">
        <div className="rounded-2xl border bg-card p-8">
          <h2 className="mb-3 text-xl font-bold">{t("movement.title")}</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            {t("movement.paragraph1")}
          </p>
          <p className="text-muted-foreground leading-relaxed">
            {t("movement.paragraph2")}
          </p>
        </div>
      </section>

      {/* Pain section */}
      <section className="mx-auto max-w-3xl py-16">
        <h2 className="mb-6 text-2xl font-bold">{t("painTitle")}</h2>
        <PainList items={painItems} />
      </section>

      {/* Solution section */}
      <section className="mx-auto max-w-3xl py-8">
        <h2 className="mb-6 text-2xl font-bold">{t("solutionTitle")}</h2>
        <SolutionList items={solutionItems} />
      </section>

      {/* Repair business model */}
      <section className="mx-auto max-w-3xl py-16">
        <div className="rounded-2xl border bg-card p-8">
          <h2 className="mb-4 text-xl font-bold">{t("model.title")}</h2>
          <p className="text-muted-foreground leading-relaxed mb-6">
            {t("model.description")}
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border p-4">
              <div className="text-sm font-semibold mb-1">
                {t("model.step1Title")}
              </div>
              <div className="text-xs text-muted-foreground">
                {t("model.step1Desc")}
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-sm font-semibold mb-1">
                {t("model.step2Title")}
              </div>
              <div className="text-xs text-muted-foreground">
                {t("model.step2Desc")}
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-sm font-semibold mb-1">
                {t("model.step3Title")}
              </div>
              <div className="text-xs text-muted-foreground">
                {t("model.step3Desc")}
              </div>
            </div>
          </div>
        </div>
      </section>

      <SeeAlsoSection current="repair-cafes" />

      <LandingCtaSection
        title={t("ctaTitle")}
        description={t("ctaDescription")}
      />
    </>
  );
}
