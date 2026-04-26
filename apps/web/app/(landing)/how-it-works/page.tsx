import { PackageOpen, Wrench, ShoppingCart } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { LandingCtaSection } from "@/components/landing/landing-cta-section";
import {
  CONDITION_GRADES,
  CONDITION_GRADE_LABEL_KEY,
  buildPageMeta,
} from "@/lib/config/site";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("landing.howItWorks.metadata");
  const locale = await getLocale();
  const title = t("title");
  const description = t("description");
  return {
    title,
    description,
    ...buildPageMeta(title, description, locale),
  };
}

interface Feature {
  title: string;
  description: string;
}

export default async function HowItWorksPage() {
  const t = await getTranslations("landing.howItWorks");
  const tInventory = await getTranslations("inventory");
  const phase1Features = t.raw("phase1.features") as Feature[];
  const phase2Features = t.raw("phase2.features") as Feature[];
  const phase3Features = t.raw("phase3.features") as Feature[];

  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-3xl py-16 text-center">
        <p className="mb-3 text-sm font-medium uppercase tracking-wider text-primary">
          {t("hero.label")}
        </p>
        <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
          {t("hero.title")}
        </h1>
        <p className="text-xl text-muted-foreground">{t("hero.description")}</p>
      </section>

      {/* Why individual tracking */}
      <section className="mx-auto max-w-3xl py-8">
        <div className="rounded-2xl border bg-warning/5 p-8">
          <h2 className="mb-3 text-xl font-bold">{t("core.title")}</h2>
          <p className="text-muted-foreground leading-relaxed">
            {t("core.description")}
          </p>
        </div>
      </section>

      {/* Phase 1 */}
      <section className="mx-auto max-w-4xl py-16">
        <div className="flex items-center gap-4 mb-8">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-info/10">
            <PackageOpen className="h-6 w-6 text-info" />
          </div>
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-info">
              {t("phase1.label")}
            </p>
            <h2 className="text-2xl font-bold">{t("phase1.title")}</h2>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {phase1Features.map((f) => (
            <FeatureCard
              key={f.title}
              title={f.title}
              description={f.description}
            />
          ))}
        </div>
      </section>

      {/* Phase 2 */}
      <section className="mx-auto max-w-4xl py-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-warning/10">
            <Wrench className="h-6 w-6 text-warning" />
          </div>
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-warning">
              {t("phase2.label")}
            </p>
            <h2 className="text-2xl font-bold">{t("phase2.title")}</h2>
          </div>
        </div>

        <div className="mb-8 rounded-xl border p-6">
          <h3 className="mb-4 font-semibold">{t("phase2.gradesTitle")}</h3>
          <div className="grid gap-3 sm:grid-cols-5">
            {CONDITION_GRADES.map((grade) => (
              <div
                key={grade.id}
                className={`rounded-lg p-3 text-center ${grade.colorClass}`}
              >
                <div className="font-semibold text-sm">
                  {tInventory(CONDITION_GRADE_LABEL_KEY[grade.id])}
                </div>
                <div className="mt-1 text-xs opacity-75">
                  {t(`phase2.conditions.${grade.id}`)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {phase2Features.map((f) => (
            <FeatureCard
              key={f.title}
              title={f.title}
              description={f.description}
            />
          ))}
        </div>
      </section>

      {/* Phase 3 */}
      <section className="mx-auto max-w-4xl py-16">
        <div className="flex items-center gap-4 mb-8">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-success/10">
            <ShoppingCart className="h-6 w-6 text-success" />
          </div>
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-success">
              {t("phase3.label")}
            </p>
            <h2 className="text-2xl font-bold">{t("phase3.title")}</h2>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {phase3Features.map((f) => (
            <FeatureCard
              key={f.title}
              title={f.title}
              description={f.description}
            />
          ))}
        </div>
      </section>

      <LandingCtaSection
        title={t("ctaTitle")}
        description={t("ctaDescription")}
      />
    </>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-6">
      <h3 className="mb-2 font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  );
}
