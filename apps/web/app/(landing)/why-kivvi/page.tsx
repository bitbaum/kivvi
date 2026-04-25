import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { buildPageMeta } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "Warum Kivvi — ERP für Kreislaufbetriebe",
  description:
    "8 Dimensionen, in denen Standard-ERPs für Kreislaufbetriebe strukturell scheitern — und wie Kivvi als Betriebssystem für die Kreislaufwirtschaft antwortet.",
  ...buildPageMeta(
    "Warum Kivvi — ERP für Kreislaufbetriebe",
    "8 Dimensionen, in denen Standard-ERPs für Kreislaufbetriebe strukturell scheitern — und wie Kivvi als Betriebssystem für die Kreislaufwirtschaft antwortet.",
  ),
};

interface Dimension {
  title: string;
  erpAssumption: string;
  circularReality: string;
  kivviAnswer: string;
}

export default async function WhyKivviPage() {
  const t = await getTranslations("landing.whyKivvi");
  const tLanding = await getTranslations("landing");
  const dimensions = t.raw("dimensions") as Dimension[];
  const headers = {
    erpAssumption: t("dimensionHeaders.erpAssumption"),
    circularReality: t("dimensionHeaders.circularReality"),
    kivviAnswer: t("dimensionHeaders.kivviAnswer"),
  };

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

      {/* The core argument */}
      <section className="mx-auto max-w-3xl py-8">
        <div className="rounded-2xl border bg-warning/5 p-8">
          <h2 className="mb-3 text-xl font-bold">{t("coreArgument.title")}</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            {t("coreArgument.paragraph1")}
          </p>
          <p className="text-muted-foreground leading-relaxed">
            {t("coreArgument.paragraph2")}
          </p>
        </div>
      </section>

      {/* 8 dimensions */}
      <section className="mx-auto max-w-4xl py-16">
        <div className="space-y-6">
          {dimensions.map((d, i) => (
            <DimensionCard
              key={d.title}
              number={i + 1}
              {...d}
              headers={headers}
            />
          ))}
        </div>
      </section>

      {/* Summary */}
      <section className="mx-auto max-w-3xl py-8">
        <div className="rounded-2xl border bg-primary/5 p-8">
          <h2 className="mb-4 text-xl font-bold">{t("summary.title")}</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            {t("summary.paragraph1")}
          </p>
          <p className="text-muted-foreground leading-relaxed mb-4">
            {t("summary.paragraph2")}
          </p>
          <p className="font-medium text-foreground">
            {t("summary.conclusion")}
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-2xl py-16 text-center">
        <h2 className="mb-4 text-2xl font-bold">{t("cta.title")}</h2>
        <p className="mb-8 text-muted-foreground">{t("cta.description")}</p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg">
            <Link href="/contact">
              {tLanding("requestDemo")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link href="/register">
              {tLanding("ctaTryIt")} <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="mt-8 flex justify-center gap-6 text-sm">
          <Link
            href="/how-it-works"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("cta.linkHowItWorks")}
          </Link>
          <Link
            href="/circular-economy"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("cta.linkCircularEconomy")}
          </Link>
        </div>
      </section>
    </>
  );
}

function DimensionCard({
  number,
  title,
  erpAssumption,
  circularReality,
  kivviAnswer,
  headers,
}: {
  number: number;
  title: string;
  erpAssumption: string;
  circularReality: string;
  kivviAnswer: string;
  headers: {
    erpAssumption: string;
    circularReality: string;
    kivviAnswer: string;
  };
}) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="border-b px-6 py-4 flex items-center gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
          {String(number).padStart(2, "0")}
        </span>
        <h3 className="text-lg font-bold">{title}</h3>
      </div>
      <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x">
        <div className="p-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-destructive/70">
            {headers.erpAssumption}
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {erpAssumption}
          </p>
        </div>
        <div className="p-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-warning">
            {headers.circularReality}
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {circularReality}
          </p>
        </div>
        <div className="p-5 bg-primary/5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary/70">
            {headers.kivviAnswer}
          </p>
          <p className="text-sm leading-relaxed">{kivviAnswer}</p>
        </div>
      </div>
    </div>
  );
}
