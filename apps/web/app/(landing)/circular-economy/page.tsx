import Link from "next/link";
import { ArrowRight, Recycle } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { buildPageMeta } from "@/lib/config/site";
import type { Metadata } from "next";
import { PARTICIPANT_HREFS } from "./circular-economy-data";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("landing.circularEconomy.metadata");
  const locale = await getLocale();
  const title = t("title");
  const description = t("description");
  return {
    title,
    description,
    ...buildPageMeta(title, description, locale),
  };
}

interface Participant {
  id: string;
  name: string;
  description: string;
  examples: string;
}

interface BusinessModel {
  name: string;
  who: string;
  description: string;
  accounting: string;
}

interface Dimension {
  title: string;
  linear: string;
  circular: string;
}

export default async function CircularEconomyPage() {
  const t = await getTranslations("landing.circularEconomy");
  const participants = t.raw("participants") as Participant[];
  const businessModels = t.raw("businessModels") as BusinessModel[];
  const dimensions = t.raw("dimensions") as Dimension[];

  const hrefById = Object.fromEntries(PARTICIPANT_HREFS.map((p) => [p.id, p.href]));

  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-3xl py-16 text-center">
        <div className="mb-4 flex justify-center">
          <div className="rounded-full bg-primary/10 p-4">
            <Recycle className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h1 className="mb-4 text-4xl font-bold sm:text-5xl">{t("hero.title")}</h1>
        <p className="text-xl text-muted-foreground">{t("hero.description")}</p>
      </section>

      {/* In-page anchor nav */}
      <nav className="mx-auto max-w-3xl mb-4">
        <div className="flex flex-wrap gap-2 justify-center">
          {[
            { href: "#teilnehmer", label: t("nav.participants") },
            { href: "#geschaeftsmodelle", label: t("nav.businessModels") },
            { href: "#dimensionen", label: t("nav.dimensions") },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-full border bg-card px-4 py-1.5 text-sm hover:bg-muted transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>
      </nav>

      {/* Definition */}
      <section className="mx-auto max-w-3xl py-8">
        <div className="rounded-2xl border bg-card p-8">
          <h2 className="mb-4 text-xl font-bold">{t("definition.title")}</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">{t("definition.paragraph1")}</p>
          <p className="text-muted-foreground leading-relaxed mb-4">{t("definition.paragraph2")}</p>
          <p className="font-medium text-foreground">{t("definition.conclusion")}</p>
        </div>
      </section>

      {/* Participants */}
      <section id="teilnehmer" className="mx-auto max-w-4xl py-16 scroll-mt-16">
        <h2 className="mb-3 text-2xl font-bold">{t("participantsSection.title")}</h2>
        <p className="mb-8 text-muted-foreground">{t("participantsSection.intro")}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {participants.map((p) => {
            const href = hrefById[p.id] ?? null;
            return (
              <div key={p.id} className="rounded-xl border bg-card p-6">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold">{p.name}</h3>
                  {href && (
                    <Link
                      href={href}
                      className="shrink-0 text-xs font-medium text-primary hover:underline"
                    >
                      {t("participantsSection.more")}
                    </Link>
                  )}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                  {p.description}
                </p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">{t("participantsSection.typicalGoods")}</span>{" "}
                  {p.examples}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Business models */}
      <section id="geschaeftsmodelle" className="mx-auto max-w-4xl py-8 scroll-mt-16">
        <h2 className="mb-3 text-2xl font-bold">{t("businessModelsSection.title")}</h2>
        <p className="mb-8 text-muted-foreground">{t("businessModelsSection.intro")}</p>
        <div className="space-y-4">
          {businessModels.map((m) => (
            <div key={m.name} className="rounded-xl border bg-card overflow-hidden">
              <div className="border-b px-6 py-4">
                <h3 className="font-semibold">{m.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{m.who}</p>
              </div>
              <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x">
                <div className="px-6 py-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">{m.description}</p>
                </div>
                <div className="px-6 py-4 bg-muted/30">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                    {t("businessModelsSection.accountingHeader")}
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{m.accounting}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* What makes circular different */}
      <section id="dimensionen" className="mx-auto max-w-4xl py-16 scroll-mt-16">
        <h2 className="mb-3 text-2xl font-bold">{t("dimensionsSection.title")}</h2>
        <p className="mb-8 text-muted-foreground">{t("dimensionsSection.intro")}</p>
        <div className="space-y-4">
          {dimensions.map((d, i) => (
            <div key={d.title} className="rounded-xl border bg-card overflow-hidden">
              <div className="border-b px-6 py-3 flex items-center gap-3">
                <span className="text-xs font-bold text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="font-semibold">{d.title}</h3>
              </div>
              <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x">
                <div className="px-6 py-4">
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("dimensionsSection.headerLinear")}
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{d.linear}</p>
                </div>
                <div className="px-6 py-4 bg-primary/5">
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-primary/70">
                    {t("dimensionsSection.headerCircular")}
                  </p>
                  <p className="text-sm leading-relaxed">{d.circular}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bridges to vertical pages and why-kivvi */}
      <section className="mx-auto max-w-4xl py-8 pb-16">
        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/why-kivvi"
            className="group rounded-xl border bg-card p-6 hover:shadow-md transition-shadow"
          >
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
              {t("bridges.whyKivvi.label")}
            </p>
            <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors">
              {t("bridges.whyKivvi.title")}
            </h3>
            <p className="text-sm text-muted-foreground">{t("bridges.whyKivvi.description")}</p>
            <div className="mt-4 flex items-center gap-1 text-sm font-medium text-primary">
              {t("bridges.whyKivvi.cta")} <ArrowRight className="h-3 w-3" />
            </div>
          </Link>
          <Link
            href="/how-it-works"
            className="group rounded-xl border bg-card p-6 hover:shadow-md transition-shadow"
          >
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
              {t("bridges.howItWorks.label")}
            </p>
            <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors">
              {t("bridges.howItWorks.title")}
            </h3>
            <p className="text-sm text-muted-foreground">{t("bridges.howItWorks.description")}</p>
            <div className="mt-4 flex items-center gap-1 text-sm font-medium text-primary">
              {t("bridges.howItWorks.cta")} <ArrowRight className="h-3 w-3" />
            </div>
          </Link>
        </div>
      </section>
    </>
  );
}
