import { Check, Minus, Server, Cloud, Building2 } from "lucide-react";
import Link from "next/link";
import { LandingCtaSection } from "@/components/landing/landing-cta-section";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Preise — Kivvi ERP",
  description:
    "Kivvi ist vollständig Open Source und kostenlos selbst hostbar. Oder nutzen Sie unsere Managed Cloud für CHF 49/Monat — gehostet in der Schweiz, betrieben von revamp-it.",
};

const TIERS = [
  {
    id: "opensource",
    icon: Server,
    name: "Open Source",
    price: "Kostenlos",
    priceSub: "für immer",
    tagline: "Ideal für technisch versierte Teams und Pilotprojekte",
    highlight: false,
    badge: null,
    bullets: [
      "Self-hosted auf Ihrem eigenen Server",
      "Vollständiger Funktionsumfang, keine Einschränkungen",
      "MIT-Lizenz",
      "Community-Support via GitHub",
    ],
    cta: {
      label: "Auf GitHub ansehen",
      href: "https://github.com/g-but/kivvi",
      external: true,
      primary: false,
    },
  },
  {
    id: "cloud",
    icon: Cloud,
    name: "Cloud",
    price: "CHF 49",
    priceSub: "pro Monat",
    tagline: "Ideal für Betriebe ohne eigene IT-Infrastruktur",
    highlight: true,
    badge: "Empfohlen",
    bullets: [
      "Gehostet von revamp-it, Daten in der Schweiz",
      "Automatische Updates, Backups und Monitoring",
      "E-Mail-Support innerhalb von 48 Stunden",
      "30 Tage kostenlos testen, keine Kreditkarte nötig",
    ],
    cta: {
      label: "Kostenlos testen",
      href: "/register",
      external: false,
      primary: true,
    },
  },
  {
    id: "enterprise",
    icon: Building2,
    name: "Enterprise / On-Premise",
    price: "Auf Anfrage",
    priceSub: null,
    tagline:
      "Ideal für grössere Organisationen oder spezifische Compliance-Anforderungen",
    highlight: false,
    badge: null,
    bullets: [
      "Deployment in Ihrem eigenen Rechenzentrum oder Private Cloud",
      "Individuelle Integrationen und massgeschneiderter SLA",
      "Prioritätssupport",
      "DSGVO- und nDSG-Konformitätsdokumentation",
    ],
    cta: {
      label: "Kontakt aufnehmen",
      href: "/contact",
      external: false,
      primary: false,
    },
  },
] as const;

type FeatureValue = "yes" | "no" | string;

interface ComparisonFeature {
  label: string;
  opensource: FeatureValue;
  cloud: FeatureValue;
  enterprise: FeatureValue;
}

const COMPARISON_FEATURES: ComparisonFeature[] = [
  {
    label: "Alle ERP-Funktionen",
    opensource: "yes",
    cloud: "yes",
    enterprise: "yes",
  },
  {
    label: "Unbegrenzte Benutzer",
    opensource: "yes",
    cloud: "yes",
    enterprise: "yes",
  },
  {
    label: "QR-Rechnungen",
    opensource: "yes",
    cloud: "yes",
    enterprise: "yes",
  },
  {
    label: "Automatische Backups",
    opensource: "Selbst verwaltet",
    cloud: "Inklusive",
    enterprise: "Inklusive",
  },
  {
    label: "Updates",
    opensource: "Manuell",
    cloud: "Automatisch",
    enterprise: "Automatisch",
  },
  {
    label: "E-Mail-Support",
    opensource: "Community",
    cloud: "48h",
    enterprise: "Priorität",
  },
  {
    label: "SLA",
    opensource: "no",
    cloud: "no",
    enterprise: "yes",
  },
  {
    label: "Daten in der Schweiz",
    opensource: "Nach Wahl",
    cloud: "yes",
    enterprise: "yes",
  },
];

const FAQ_ITEMS = [
  {
    question: "Sind alle Features im kostenlosen Plan enthalten?",
    answer:
      "Ja, Kivvi ist vollständig Open Source unter der MIT-Lizenz. Alle Funktionen — QR-Rechnungen, Einzelartikel-Tracking, Reparaturworkflows, Buchhaltung, Impact-Berichte — sind im Self-Hosted-Plan enthalten. Es gibt keine Feature-Beschränkungen.",
  },
  {
    question: "Kann ich von Self-Hosting zu Cloud wechseln?",
    answer:
      "Ja, wir unterstützen die Migration von einer selbst gehosteten Instanz zu unserer Cloud. Schreiben Sie uns und wir begleiten den Umzug Ihrer Daten.",
  },
  {
    question: "Gibt es einen kostenlosen Test der Cloud-Version?",
    answer:
      "Ja, die Cloud-Version kann 30 Tage lang kostenlos getestet werden. Keine Kreditkarte erforderlich, kein automatisches Abo.",
  },
  {
    question: "Welche Zahlungsmethoden akzeptiert ihr?",
    answer:
      "Wir akzeptieren TWINT, Kreditkarte sowie Banküberweisung (QR-Rechnung).",
  },
];

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
