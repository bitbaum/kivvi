import Link from "next/link";
import {
  ArrowRight,
  Tag,
  BarChart3,
  Sparkles,
  Shield,
  Recycle,
  BookOpen,
  ClipboardCheck,
} from "lucide-react";
import type { Metadata } from "next";
import { VERTICALS, buildPageMeta } from "@/lib/config/site";
import { PainList } from "@/components/landing/pain-list";
import { LandingCtaSection } from "@/components/landing/landing-cta-section";
import { VerticalCard } from "@/components/landing/vertical-card";
import { Button } from "@/components/ui/button";
import { ScenariosSection } from "./landing-scenarios-section";
import { DeploymentOptionsSection } from "./landing-deployment-section";
import { AIAutopilotSection } from "./landing-ai-section";

const SOFTWARE_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Kivvi",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "Das Betriebssystem der Kreislaufwirtschaft — Open-Source-ERP für Brockenhäuser, IT-Refurbisher, Repair Cafés und Vintage-Shops",
  offers: { "@type": "Offer", price: "0", priceCurrency: "CHF" },
  creator: {
    "@type": "Organization",
    name: "revamp-it",
    url: "https://revamp-it.ch",
  },
  license: "https://opensource.org/licenses/MIT",
};

export const metadata: Metadata = {
  title: "Kivvi — Das Betriebssystem der Kreislaufwirtschaft",
  description:
    "Kivvi ist das Open-Source-ERP für Brockenhäuser, IT-Refurbisher, Repair Cafés und Vintage-Shops. Einzelartikel-Tracking, KI-Schnelleingabe, Schweizer QR-Rechnungen — das Betriebssystem für Kreislaufbetriebe.",
  ...buildPageMeta(
    "Kivvi — Das Betriebssystem der Kreislaufwirtschaft",
    "Kivvi ist das Open-Source-ERP für Brockenhäuser, IT-Refurbisher, Repair Cafés und Vintage-Shops. Einzelartikel-Tracking, KI-Schnelleingabe, Schweizer QR-Rechnungen — das Betriebssystem für Kreislaufbetriebe.",
  ),
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(SOFTWARE_LD) }}
      />
      {/* ============================================================ */}
      {/* HERO                                                         */}
      {/* ============================================================ */}
      <section className="mx-auto max-w-3xl py-20 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground">
          <Recycle className="h-3.5 w-3.5 text-primary" />
          Open Source · Swiss-native · Kreislaufwirtschaft-ERP
        </div>
        <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          Das Betriebssystem der Kreislaufwirtschaft.
        </h1>
        <p className="mb-6 text-xl font-medium text-primary sm:text-2xl">
          50 gespendete Laptops? In 30 Sekunden erfasst.
        </p>
        <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground">
          Kivvi ist das ERP für Betriebe, die Waren ein zweites Leben geben:
          Brockenhäuser, IT-Refurbisher, Repair Cafés, Vintage-Shops.
          Einzelartikel-Tracking, KI-Schnelleingabe, Schweizer QR-Rechnungen —
          alles in einem System.
        </p>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/contact">
              Demo anfragen
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link href="/register">Selbst ausprobieren</Link>
          </Button>
        </div>
      </section>

      {/* ============================================================ */}
      {/* FOR WHOM — derived from VERTICALS config                     */}
      {/* ============================================================ */}
      <section className="mx-auto max-w-5xl py-8">
        <p className="mb-8 text-center text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Für wen ist Kivvi?
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {VERTICALS.map((v) => (
            <VerticalCard key={v.id} {...v} />
          ))}
        </div>
      </section>

      {/* ============================================================ */}
      {/* PROBLEM — What standard ERPs can't do                        */}
      {/* ============================================================ */}
      <section className="mx-auto max-w-3xl py-16">
        <h2 className="mb-8 text-center text-2xl font-bold">
          Was Standard-ERPs nicht können
        </h2>
        <PainList
          items={[
            "Den Unterschied zwischen Spende, Einkauf und Reparatur kennen",
            "Einzelne Artikel mit eigenem Zustand, Geschichte und Kosten verfolgen",
            "Kosten über Intake → Reparatur → Verkauf akkumulieren",
            "Spendenquittungen und Impact-Berichte automatisch erstellen",
            "QR-Rechnung, MWST und Schweizer Compliance nativ abbilden",
          ]}
        />
        <div className="mt-6 text-center">
          <Button asChild variant="link" size="sm">
            <Link href="/how-it-works">
              Wie es funktioniert <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      </section>

      {/* ============================================================ */}
      {/* AI / AUTOPILOT — Organisation auf Autopilot                  */}
      {/* ============================================================ */}
      <AIAutopilotSection />

      {/* ============================================================ */}
      {/* ORIGIN STORY — Who built this and why                        */}
      {/* ============================================================ */}
      <section className="mx-auto max-w-4xl py-8">
        <div className="rounded-2xl border bg-card p-8 sm:p-12">
          <div className="mb-6 flex items-center gap-3">
            <Recycle className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">Bewährt im echten Betrieb.</h2>
          </div>
          <p className="text-lg leading-relaxed text-muted-foreground">
            Kivvi entstand bei revamp-it — einem der grössten IT-Refurbisher der
            Schweiz. Seit 2003 nehmen sie Elektronik an, testen, reparieren und
            verkaufen sie weiter. Nach Jahren mit ERPs, die nie für Secondhand
            gebaut wurden, haben sie selbst eines entwickelt. Jetzt ist es open
            source — für alle Betriebe der Kreislaufwirtschaft.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-3">
            <StatBlock value="Seit 2003" label="Praxiserfahrung" />
            <StatBlock value="Open Source" label="MIT-Lizenz" />
            <StatBlock value="CHF 0" label="Lizenzkosten" />
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* SCENARIOS — A typical day, not a feature list                */}
      {/* ============================================================ */}
      <ScenariosSection />

      {/* ============================================================ */}
      {/* DEPLOYMENT OPTIONS — Open Source / Cloud / On-Premise        */}
      {/* ============================================================ */}
      <DeploymentOptionsSection />

      {/* ============================================================ */}
      {/* CAPABILITIES — Compact, not cards                            */}
      {/* ============================================================ */}
      <section className="mx-auto max-w-4xl py-8">
        <h2 className="mb-8 text-center text-2xl font-bold">Was Kivvi kann</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Capability
            icon={<Recycle className="h-4 w-4" />}
            text="Wareneingang — Spende, Einkauf, Rücknahme, Kommission"
          />
          <Capability
            icon={<ClipboardCheck className="h-4 w-4" />}
            text="Zustandsbewertung & Reparatur-Protokoll"
          />
          <Capability
            icon={<Tag className="h-4 w-4" />}
            text="QR-Etiketten & flexible Richtpreise"
          />
          <Capability
            icon={<BarChart3 className="h-4 w-4" />}
            text="Impact-Dashboard & Spendenquittungen"
          />
          <Capability
            icon={<Sparkles className="h-4 w-4" />}
            text="KI-Schnelleingabe per Text"
          />
          <Capability
            icon={<Shield className="h-4 w-4" />}
            text="QR-Rechnungen, MWST, CAMT-Bankimport"
          />
        </div>
      </section>

      {/* ============================================================ */}
      {/* KNOWLEDGE TEASER — Expertise signal                          */}
      {/* ============================================================ */}
      <section className="mx-auto max-w-4xl py-16">
        <div className="rounded-2xl border bg-card p-8">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-primary/10 p-3">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold">
                  Wissen für Kreislaufbetriebe
                </h3>
                <p className="mt-1 max-w-xl text-muted-foreground">
                  Wie bewertet man Zustand korrekt? Was muss eine
                  Spendenquittung enthalten? Wie misst man Impact? Wir haben
                  diese Fragen durchdacht — und dokumentiert.
                </p>
              </div>
            </div>
            <Button asChild variant="secondary" className="shrink-0">
              <Link href="/knowledge">
                Wissensdatenbank öffnen
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* CTA + CONTACT                                                */}
      {/* ============================================================ */}
      <LandingCtaSection
        id="contact"
        title="Kivvi für Ihren Betrieb?"
        description="Schreiben Sie uns — ob Brockenstube, Refurbisher, Repair Café oder Vintage-Shop."
      />
    </>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function StatBlock({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-bold text-primary">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function Capability({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border p-4">
      <div className="mt-0.5 shrink-0 text-primary">{icon}</div>
      <span className="text-sm">{text}</span>
    </div>
  );
}
