import { Check, Minus } from "lucide-react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { LandingCtaSection } from "@/components/landing/landing-cta-section";
import { buildPageMeta } from "@/lib/config/site";
import type { Metadata } from "next";
import {
  TIER_IDS,
  TIER_META,
  COMPARISON_ROWS,
  type FeatureValue,
} from "./pricing-data";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("landing.pricing.metadata");
  const locale = await getLocale();
  const title = t("title");
  const description = t("description");
  return {
    title,
    description,
    ...buildPageMeta(title, description, locale),
  };
}

export default async function PricingPage() {
  const t = await getTranslations("landing.pricing");
  const faqItems = t.raw("faq.items") as Array<{
    question: string;
    answer: string;
  }>;

  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-3xl py-16 text-center">
        <p className="mb-3 text-sm font-medium uppercase tracking-wider text-primary">
          {t("hero.label")}
        </p>
        <h1 className="mb-4 text-4xl font-bold sm:text-5xl">
          {t("hero.title")}
        </h1>
        <p className="text-xl text-muted-foreground">{t("hero.description")}</p>
      </section>

      {/* Pricing tiers */}
      <section className="mx-auto max-w-5xl py-8">
        <div className="grid gap-6 sm:grid-cols-3">
          {TIER_IDS.map((id) => {
            const meta = TIER_META[id];
            const Icon = meta.icon;
            const bullets = t.raw(`tiers.${id}.bullets`) as string[];
            return (
              <div
                key={id}
                className={`relative flex flex-col rounded-2xl border p-8 ${
                  meta.highlight
                    ? "border-primary bg-primary/5 shadow-md"
                    : "bg-card"
                }`}
              >
                {meta.hasBadge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-semibold text-primary-foreground">
                    {t(`tiers.${id}.badge`)}
                  </span>
                )}

                <div className="mb-5 flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      meta.highlight
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="font-bold">{t(`tiers.${id}.name`)}</h2>
                </div>

                <div className="mb-2">
                  <span className="text-3xl font-bold">
                    {t(`tiers.${id}.price`)}
                  </span>
                  {meta.hasPriceSub && (
                    <span className="ml-1 text-sm text-muted-foreground">
                      {t(`tiers.${id}.priceSub`)}
                    </span>
                  )}
                </div>

                <p className="mb-6 text-sm text-muted-foreground">
                  {t(`tiers.${id}.tagline`)}
                </p>

                <ul className="mb-8 flex-1 space-y-3">
                  {bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>

                {meta.cta.external ? (
                  <a
                    href={meta.cta.href}
                    target={
                      meta.cta.href.startsWith("http") ? "_blank" : undefined
                    }
                    rel={
                      meta.cta.href.startsWith("http")
                        ? "noopener noreferrer"
                        : undefined
                    }
                    className={`inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-medium transition-colors ${
                      meta.cta.primary
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "border hover:bg-muted"
                    }`}
                  >
                    {t(`tiers.${id}.ctaLabel`)}
                  </a>
                ) : (
                  <Link
                    href={meta.cta.href}
                    className={`inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-medium transition-colors ${
                      meta.cta.primary
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "border hover:bg-muted"
                    }`}
                  >
                    {t(`tiers.${id}.ctaLabel`)}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Feature comparison table */}
      <section className="mx-auto max-w-5xl py-16">
        <h2 className="mb-8 text-center text-2xl font-bold">
          {t("comparison.title")}
        </h2>
        <div className="overflow-x-auto rounded-2xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-6 py-4 text-left font-semibold">
                  {t("comparison.columnFeature")}
                </th>
                <th className="px-6 py-4 text-center font-semibold">
                  {t("comparison.columnOpensource")}
                </th>
                <th className="px-6 py-4 text-center font-semibold text-primary">
                  {t("comparison.columnCloud")}
                </th>
                <th className="px-6 py-4 text-center font-semibold">
                  {t("comparison.columnEnterprise")}
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row, i) => (
                <tr key={row.id} className={i % 2 === 0 ? "" : "bg-muted/20"}>
                  <td className="px-6 py-3.5 font-medium">
                    {t(`comparison.features.${row.id}`)}
                  </td>
                  <td className="px-6 py-3.5 text-center">
                    <FeatureCell
                      value={row.opensource}
                      label={
                        isLiteral(row.opensource)
                          ? null
                          : t(`comparison.values.${row.opensource}`)
                      }
                    />
                  </td>
                  <td className="px-6 py-3.5 text-center">
                    <FeatureCell
                      value={row.cloud}
                      label={
                        isLiteral(row.cloud)
                          ? null
                          : t(`comparison.values.${row.cloud}`)
                      }
                    />
                  </td>
                  <td className="px-6 py-3.5 text-center">
                    <FeatureCell
                      value={row.enterprise}
                      label={
                        isLiteral(row.enterprise)
                          ? null
                          : t(`comparison.values.${row.enterprise}`)
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl py-8">
        <h2 className="mb-8 text-center text-2xl font-bold">
          {t("faq.title")}
        </h2>
        <div className="space-y-4">
          {faqItems.map((item) => (
            <div key={item.question} className="rounded-xl border bg-card p-6">
              <h3 className="mb-2 font-semibold">{item.question}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {item.answer}
              </p>
            </div>
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

/** "yes" / "no" render as icons; everything else renders as a translated label. */
function isLiteral(value: FeatureValue): value is "yes" | "no" {
  return value === "yes" || value === "no";
}

function FeatureCell({
  value,
  label,
}: {
  value: FeatureValue;
  label: string | null;
}) {
  if (value === "yes") {
    return (
      <span className="inline-flex justify-center">
        <Check className="h-4 w-4 text-success" />
      </span>
    );
  }
  if (value === "no") {
    return (
      <span className="inline-flex justify-center">
        <Minus className="h-4 w-4 text-muted-foreground" />
      </span>
    );
  }
  return <span className="text-muted-foreground">{label}</span>;
}
