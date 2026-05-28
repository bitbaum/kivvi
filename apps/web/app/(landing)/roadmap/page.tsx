import Link from "next/link";
import { Check, Minus, X, Heart, ArrowRight, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { buildPageMeta } from "@/lib/config/site";
import {
  COMPETITOR_KEYS,
  FEATURE_SUPPORT,
  STATUS_CONFIG,
  STAGES,
  type CompetitorKey,
  type PipelineStatus,
  type Support,
} from "./roadmap-data";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("landing.roadmap.metadata");
  const locale = await getLocale();
  const title = t("title");
  const description = t("description");
  return {
    title,
    description,
    ...buildPageMeta(title, description, locale),
  };
}

interface Competitor {
  key: CompetitorKey;
  name: string;
  note: string;
  verdict: string;
}

interface Feature {
  feature: string;
  desc: string;
}

interface PipelineItem {
  status: PipelineStatus;
  category: string;
  title: string;
  desc: string;
}

function SupportIcon({ value }: { value: Support }) {
  if (value === "yes")
    return <Check className="mx-auto h-4 w-4 text-success" />;
  if (value === "partial")
    return <Minus className="mx-auto h-4 w-4 text-warning" />;
  return <X className="mx-auto h-4 w-4 text-muted-foreground/40" />;
}

export default async function RoadmapPage() {
  const t = await getTranslations("landing.roadmap");
  const competitors = t.raw("competitors") as Competitor[];
  const features = t.raw("features") as Feature[];
  const pipeline = t.raw("pipeline") as PipelineItem[];

  return (
    <div className="container mx-auto max-w-5xl px-4 py-16 space-y-20">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold sm:text-5xl">{t("hero.title")}</h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          {t("hero.description")}
        </p>
      </div>

      {/* ── Competitor comparison ────────────────────────────────────────────── */}
      <section id="vergleich" className="space-y-8">
        <div>
          <h2 className="text-2xl font-semibold">{t("comparison.title")}</h2>
          <p className="mt-2 text-muted-foreground">{t("comparison.intro")}</p>
        </div>

        {/* Competitor verdicts */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {competitors.map((c) => (
            <div
              key={c.key}
              className={`rounded-xl border p-5 space-y-2 ${
                c.key === "kivvi"
                  ? "border-success/30 bg-success/5"
                  : c.key === "kivitendo"
                    ? "border-info/30 bg-info/5"
                    : "bg-card"
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold">{c.name}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {c.note}
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {c.verdict}
              </p>
            </div>
          ))}
        </div>

        {/* Feature matrix — horizontal scroll on mobile */}
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-[220px]">
                  {t("comparison.columnFeature")}
                </th>
                {competitors.map((c) => (
                  <th
                    key={c.key}
                    className={`px-3 py-3 text-center font-medium w-20 ${
                      c.key === "kivvi"
                        ? "text-success"
                        : "text-muted-foreground"
                    }`}
                  >
                    {c.name.replace(" ★", "")}
                    {c.key === "kivitendo" && (
                      <span className="ml-1 text-info">★</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {features.map((row, i) => (
                <tr
                  key={row.feature}
                  className={`border-b last:border-0 ${i % 2 === 0 ? "" : "bg-muted/20"}`}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium leading-snug">
                      {row.feature}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {row.desc}
                    </div>
                  </td>
                  {COMPETITOR_KEYS.map((k) => (
                    <td key={k} className="px-3 py-3 text-center">
                      <SupportIcon value={FEATURE_SUPPORT[i][k]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <Check className="h-4 w-4 text-success" />{" "}
            {t("comparison.legend.native")}
          </span>
          <span className="flex items-center gap-2">
            <Minus className="h-4 w-4 text-warning" />{" "}
            {t("comparison.legend.partial")}
          </span>
          <span className="flex items-center gap-2">
            <X className="h-4 w-4 text-muted-foreground/40" />{" "}
            {t("comparison.legend.missing")}
          </span>
          <span className="ml-auto text-xs">
            {t("comparison.legend.kivitendoInspired")}
          </span>
        </div>

        <div className="text-sm">
          <Link
            href="/knowledge/kreislaufwirtschaft-software-problem"
            className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
          >
            {t("comparison.completeLink")}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      {/* ── Donate CTA ──────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border bg-card p-8 text-center space-y-4">
        <div className="flex justify-center">
          <div className="rounded-full bg-destructive/10 p-3">
            <Heart className="h-6 w-6 text-destructive" />
          </div>
        </div>
        <h2 className="text-xl font-semibold">{t("donate.title")}</h2>
        <p className="mx-auto max-w-lg text-muted-foreground">
          {t("donate.description")}
        </p>
        <a
          href="https://revamp-it.ch"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-destructive px-6 py-3 text-sm font-semibold text-destructive-foreground shadow-sm hover:bg-destructive/90 transition-colors"
        >
          <Heart className="h-4 w-4" />
          {t("donate.button")}
          <ExternalLink className="h-3.5 w-3.5 opacity-70" />
        </a>
        <p className="text-xs text-muted-foreground">{t("donate.footnote")}</p>
      </div>

      {/* ── Pipeline ────────────────────────────────────────────────────────── */}
      <section id="pipeline" className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold">
            {t("pipelineHeader.title")}
          </h2>
          <p className="mt-2 text-muted-foreground">
            {t("pipelineHeader.intro")}
          </p>
        </div>

        {/* Status legend */}
        <div className="flex flex-wrap gap-3">
          {STAGES.map((s) => {
            const cfg = STATUS_CONFIG[s];
            const Icon = cfg.icon;
            return (
              <span
                key={s}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${cfg.bg} ${cfg.color}`}
              >
                <Icon className="h-3 w-3" />
                {t(`statuses.${s}`)}
              </span>
            );
          })}
        </div>
      </section>

      {/* Pipeline stages */}
      {STAGES.map((stage) => {
        const items = pipeline.filter((p) => p.status === stage);
        if (items.length === 0) return null;
        const cfg = STATUS_CONFIG[stage];
        const Icon = cfg.icon;

        return (
          <section key={stage} className="space-y-6">
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2 ${cfg.bg}`}>
                <Icon className={`h-5 w-5 ${cfg.color}`} />
              </div>
              <div>
                <h3 className="text-xl font-semibold">
                  {t(`stages.${stage}.title`)}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t(`stages.${stage}.desc`)}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((item) => (
                <div
                  key={item.title}
                  className={`rounded-xl border ${cfg.border} bg-card p-5 space-y-2`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-sm leading-snug">
                      {item.title}
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.color}`}
                    >
                      {item.category}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {/* Footer links */}
      <div className="text-center space-y-3 text-sm text-muted-foreground border-t pt-10">
        <p>
          {t("footer.openSourceText")}{" "}
          <a
            href="https://github.com/g-but/kivvi"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground hover:underline"
          >
            {t("footer.openSourceLink")}
          </a>
        </p>
        <p>
          {t("footer.suggestText")}{" "}
          <Link
            href="/contact"
            className="font-medium text-foreground hover:underline"
          >
            {t("footer.suggestLink")}
          </Link>
        </p>
      </div>
    </div>
  );
}
