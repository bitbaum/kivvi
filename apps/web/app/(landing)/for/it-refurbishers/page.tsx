import Link from "next/link";
import { ArrowRight, Monitor } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { SeeAlsoSection } from "@/components/landing/see-also-section";
import { PainList } from "@/components/landing/pain-list";
import { SolutionList } from "@/components/landing/solution-list";
import { LandingCtaSection } from "@/components/landing/landing-cta-section";
import { buildPageMeta } from "@/lib/config/site";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("landing.forItRefurbishers.metadata");
  const locale = await getLocale();
  const title = t("title");
  const description = t("description");
  return {
    title,
    description,
    ...buildPageMeta(title, description, locale),
  };
}

export default async function ForItRefurbishersPage() {
  const t = await getTranslations("landing.forItRefurbishers");
  const painItems = t.raw("painItems") as string[];
  const solutionItems = t.raw("solutionItems") as string[];
  const migrationSteps = t.raw("migration.steps") as string[];

  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-3xl py-16 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
          <Monitor className="h-4 w-4" />
          {t("hero.badge")}
        </div>
        <h1 className="mb-4 text-4xl font-bold sm:text-5xl">
          {t("hero.title")}
        </h1>
        <p className="text-xl text-muted-foreground">{t("hero.description")}</p>
      </section>

      {/* Pain section */}
      <section className="mx-auto max-w-3xl py-8">
        <h2 className="mb-6 text-2xl font-bold">{t("painTitle")}</h2>
        <PainList items={painItems} />
      </section>

      {/* Solution section */}
      <section className="mx-auto max-w-3xl py-16">
        <h2 className="mb-6 text-2xl font-bold">{t("solutionTitle")}</h2>
        <SolutionList items={solutionItems} />
      </section>

      {/* Migration section */}
      <section className="mx-auto max-w-3xl py-8">
        <div className="rounded-2xl border bg-card p-8">
          <h2 className="mb-3 text-xl font-bold">{t("migration.title")}</h2>
          <p className="mb-6 text-muted-foreground">
            {t("migration.description")}
          </p>
          <div className="space-y-3">
            {migrationSteps.map((step, i) => (
              <div key={step} className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {i + 1}
                </span>
                <span className="text-sm">{step}</span>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <Link
              href="/knowledge"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              {t("migration.guideLink")} <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </section>

      {/* Proof */}
      <section className="mx-auto max-w-3xl py-16">
        <div className="rounded-2xl border bg-primary/5 p-8">
          <p className="text-sm font-medium uppercase tracking-wider text-primary mb-2">
            {t("proof.label")}
          </p>
          <h2 className="mb-3 text-xl font-bold">{t("proof.title")}</h2>
          <p className="text-muted-foreground mb-4">{t("proof.description")}</p>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">
                {t("proof.stat1Value")}
              </div>
              <div className="text-xs text-muted-foreground">
                {t("proof.stat1Label")}
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">
                {t("proof.stat2Value")}
              </div>
              <div className="text-xs text-muted-foreground">
                {t("proof.stat2Label")}
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">
                {t("proof.stat3Value")}
              </div>
              <div className="text-xs text-muted-foreground">
                {t("proof.stat3Label")}
              </div>
            </div>
          </div>
        </div>
      </section>

      <SeeAlsoSection current="it-refurbishers" />

      <LandingCtaSection
        title={t("ctaTitle")}
        description={t("ctaDescription")}
      />
    </>
  );
}
