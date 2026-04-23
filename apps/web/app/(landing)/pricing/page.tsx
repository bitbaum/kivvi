import { Check, Minus } from "lucide-react";
import Link from "next/link";
import { LandingCtaSection } from "@/components/landing/landing-cta-section";
import { buildPageMeta } from "@/lib/config/site";
import type { Metadata } from "next";
import {
  TIERS,
  COMPARISON_FEATURES,
  FAQ_ITEMS,
  type FeatureValue,
} from "./pricing-data";

export const metadata: Metadata = {
  title: "Preise — Kivvi ERP",
  description:
    "Kivvi ist vollständig Open Source und kostenlos selbst hostbar. Oder nutzen Sie unsere Managed Cloud für CHF 49/Monat — gehostet in der Schweiz, betrieben von revamp-it.",
  ...buildPageMeta(
    "Preise — Kivvi ERP",
    "Kivvi ist vollständig Open Source und kostenlos selbst hostbar. Oder nutzen Sie unsere Managed Cloud für CHF 49/Monat — gehostet in der Schweiz, betrieben von revamp-it.",
  ),
};

export default function PricingPage() {
  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-3xl py-16 text-center">
        <p className="mb-3 text-sm font-medium uppercase tracking-wider text-primary">
          Preise
        </p>
        <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
          Open Source. Für immer kostenlos.
        </h1>
        <p className="text-xl text-muted-foreground">
          Kivvi ist MIT-lizenziert und kann ohne Einschränkungen selbst gehostet
          werden. Oder überlassen Sie den Betrieb uns.
        </p>
      </section>

      {/* Pricing tiers */}
      <section className="mx-auto max-w-5xl py-8">
        <div className="grid gap-6 sm:grid-cols-3">
          {TIERS.map((tier) => {
            const Icon = tier.icon;
            return (
              <div
                key={tier.id}
                className={`relative flex flex-col rounded-2xl border p-8 ${
                  tier.highlight
                    ? "border-primary bg-primary/5 shadow-md"
                    : "bg-card"
                }`}
              >
                {tier.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-semibold text-primary-foreground">
                    {tier.badge}
                  </span>
                )}

                <div className="mb-5 flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      tier.highlight
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="font-bold">{tier.name}</h2>
                </div>

                <div className="mb-2">
                  <span className="text-3xl font-bold">{tier.price}</span>
                  {tier.priceSub && (
                    <span className="ml-1 text-sm text-muted-foreground">
                      {tier.priceSub}
                    </span>
                  )}
                </div>

                <p className="mb-6 text-sm text-muted-foreground">
                  {tier.tagline}
                </p>

                <ul className="mb-8 flex-1 space-y-3">
                  {tier.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>

                {tier.cta.external ? (
                  <a
                    href={tier.cta.href}
                    target={
                      tier.cta.href.startsWith("http") ? "_blank" : undefined
                    }
                    rel={
                      tier.cta.href.startsWith("http")
                        ? "noopener noreferrer"
                        : undefined
                    }
                    className={`inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-medium transition-colors ${
                      tier.cta.primary
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "border hover:bg-muted"
                    }`}
                  >
                    {tier.cta.label}
                  </a>
                ) : (
                  <Link
                    href={tier.cta.href}
                    className={`inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-medium transition-colors ${
                      tier.cta.primary
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "border hover:bg-muted"
                    }`}
                  >
                    {tier.cta.label}
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
          Funktionsvergleich
        </h2>
        <div className="overflow-x-auto rounded-2xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-6 py-4 text-left font-semibold">Funktion</th>
                <th className="px-6 py-4 text-center font-semibold">
                  Open Source
                </th>
                <th className="px-6 py-4 text-center font-semibold text-primary">
                  Cloud
                </th>
                <th className="px-6 py-4 text-center font-semibold">
                  Enterprise
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_FEATURES.map((feature, i) => (
                <tr
                  key={feature.label}
                  className={i % 2 === 0 ? "" : "bg-muted/20"}
                >
                  <td className="px-6 py-3.5 font-medium">{feature.label}</td>
                  <td className="px-6 py-3.5 text-center">
                    <FeatureCell value={feature.opensource} />
                  </td>
                  <td className="px-6 py-3.5 text-center">
                    <FeatureCell value={feature.cloud} />
                  </td>
                  <td className="px-6 py-3.5 text-center">
                    <FeatureCell value={feature.enterprise} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl py-8">
        <h2 className="mb-8 text-center text-2xl font-bold">Häufige Fragen</h2>
        <div className="space-y-4">
          {FAQ_ITEMS.map((item) => (
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
        title="Fragen zu Hosting oder Enterprise?"
        description="Schreiben Sie uns — wir helfen Ihnen, die richtige Option für Ihren Betrieb zu finden."
      />
    </>
  );
}

function FeatureCell({ value }: { value: FeatureValue }) {
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
  return <span className="text-muted-foreground">{value}</span>;
}
