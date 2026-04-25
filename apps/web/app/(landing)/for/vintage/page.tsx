import { Shirt } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { SeeAlsoSection } from "@/components/landing/see-also-section";
import { PainList } from "@/components/landing/pain-list";
import { SolutionList } from "@/components/landing/solution-list";
import { LandingCtaSection } from "@/components/landing/landing-cta-section";
import {
  CONDITION_GRADES,
  CONDITION_GRADE_LABEL_KEY,
  buildPageMeta,
} from "@/lib/config/site";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kivvi für Vintage-Shops & Kleiderbörsen",
  description:
    "Einzelartikel-Tracking, Kommissions-Abrechnung, Zustandsbewertung für Kleidung — ohne Excel.",
  ...buildPageMeta(
    "Kivvi für Vintage-Shops & Kleiderbörsen",
    "Einzelartikel-Tracking, Kommissions-Abrechnung, Zustandsbewertung für Kleidung — ohne Excel.",
  ),
};

// Text colors matching CONDITION_GRADES order (green/blue/amber/orange/red).
const CLOTHING_TEXT_COLORS = [
  "text-success",
  "text-info",
  "text-warning",
  "text-warning",
  "text-destructive",
];

export default async function ForVintageShopsPage() {
  const t = await getTranslations("landing.forVintage");
  const tInventory = await getTranslations("inventory");
  const painItems = t.raw("painItems") as string[];
  const solutionItems = t.raw("solutionItems") as string[];

  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-3xl py-16 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
          <Shirt className="h-4 w-4" />
          {t("hero.badge")}
        </div>
        <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
          {t("hero.title")}
        </h1>
        <p className="text-xl text-muted-foreground">{t("hero.description")}</p>
      </section>

      {/* What makes vintage different */}
      <section className="mx-auto max-w-3xl py-8">
        <div className="rounded-2xl border bg-card p-8">
          <h2 className="mb-3 text-xl font-bold">{t("framing.title")}</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            {t("framing.paragraph1")}
          </p>
          <p className="text-muted-foreground leading-relaxed">
            {t("framing.paragraph2")}
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

      {/* Condition guide for clothing */}
      <section className="mx-auto max-w-3xl py-16">
        <div className="rounded-2xl border bg-card p-8">
          <h2 className="mb-4 text-xl font-bold">{t("clothingGuide.title")}</h2>
          <p className="text-muted-foreground mb-6">
            {t("clothingGuide.intro")}
          </p>
          <div className="space-y-3">
            {CONDITION_GRADES.map((grade, i) => (
              <div key={grade.id} className="flex items-start gap-3">
                <span
                  className={`shrink-0 w-20 text-sm font-semibold ${CLOTHING_TEXT_COLORS[i]}`}
                >
                  {tInventory(CONDITION_GRADE_LABEL_KEY[grade.id])}
                </span>
                <span className="text-sm text-muted-foreground">
                  {t(`clothingGuide.criteria.${grade.id}`)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SeeAlsoSection current="vintage" />

      <LandingCtaSection
        title={t("ctaTitle")}
        description={t("ctaDescription")}
      />
    </>
  );
}
