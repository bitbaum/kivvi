import Link from "next/link";
import {
  ArrowRight,
  PackageOpen,
  ClipboardCheck,
  Tag,
  BarChart3,
  Sparkles,
  Shield,
  Mail,
  Recycle,
  X,
  BookOpen,
  Laptop,
  Store,
  Wrench,
  Shirt,
  Server,
  Cloud,
  Code2,
  Zap,
  MessageSquare,
} from "lucide-react";
import type { Metadata } from "next";
import { CONTACT_EMAIL } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "Kivvi — Das ERP für die Kreislaufwirtschaft",
  description:
    "Kivvi ist das ERP für Brockenhäuser, IT-Refurbisher, Repair Cafés und Vintage-Shops. Einzelartikel-Tracking, KI-Schnelleingabe, QR-Rechnungen — Open Source, Swiss-native.",
};

export default function Home() {
  return (
    <>
      {/* ============================================================ */}
      {/* HERO                                                         */}
      {/* ============================================================ */}
      <section className="mx-auto max-w-3xl py-20 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground">
          <Recycle className="h-3.5 w-3.5 text-primary" />
          Open Source · Swiss-native · MIT-Lizenz
        </div>
        <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          Das ERP, das Secondhand wirklich versteht.
        </h1>
        <p className="mb-6 text-xl font-medium text-primary sm:text-2xl">
          50 gespendete Laptops? In 30 Sekunden erfasst.
        </p>
        <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground">
          Kivvi wurde für Betriebe gebaut, die gebrauchte Waren verkaufen:
          Brockenhäuser, IT-Refurbisher, Repair Cafés, Vintage-Shops.
          Einzelartikel-Tracking, KI-Schnelleingabe, Schweizer QR-Rechnungen —
          alles in einem.
        </p>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a
            href="#contact"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground hover:bg-primary/90"
          >
            Demo anfragen
            <ArrowRight className="h-4 w-4" />
          </a>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-lg border px-6 py-3 font-medium hover:bg-muted"
          >
            Selbst ausprobieren
          </Link>
        </div>
      </section>

      {/* ============================================================ */}
      {/* FOR WHOM — 4 cards with clear value propositions             */}
      {/* ============================================================ */}
      <section className="mx-auto max-w-5xl py-8">
        <p className="mb-8 text-center text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Für wen ist Kivvi?
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <VerticalCard
            icon={<Laptop className="h-5 w-5" />}
            href="/for/it-refurbishers"
            title="IT-Refurbisher"
            hook="Laptop #47 mit Seriennummer, Reparaturkosten und Marge — nicht «100 ThinkPad auf Lager»."
            bullets={[
              "Reparaturkosten akkumulieren sich pro Gerät",
              "Zustand, Akku, Marge — auf einen Blick",
              "Spendenquittungen und Impact-Bericht automatisch",
            ]}
          />
          <VerticalCard
            icon={<Store className="h-5 w-5" />}
            href="/for/brockenhaeuser"
            title="Brockenhäuser"
            hook="Spendenquittungen auf Knopfdruck — nicht mehr in Word getippt."
            bullets={[
              "Strukturierter Wareneingang für Spenden und Einkäufe",
              "Donorenverwaltung und Impact-Nachweis für Förderanträge",
              "Schweizer QR-Rechnungen und MWST nativ",
            ]}
          />
          <VerticalCard
            icon={<Wrench className="h-5 w-5" />}
            href="/for/repair-cafes"
            title="Repair Cafés"
            hook="Was repariert, von wem, welche Teile, wie viel CO₂ — ohne Excel."
            bullets={[
              "Auftragserfassung auch für Freiwillige ohne IT-Kenntnisse",
              "Reparaturhistorie pro Gerät für Folgereparaturen",
              "Impact-Bericht auf Knopfdruck für Förderanträge",
            ]}
          />
          <VerticalCard
            icon={<Shirt className="h-5 w-5" />}
            href="/for/vintage"
            title="Vintage-Shops"
            hook="Jedes Stück einmalig — mit Zustand, Herkunft und eigenem Preis."
            bullets={[
              "Kein SKU-Denken: jedes Teil ist ein eigener Artikel",
              "Kommissionsverkauf mit Auszahlungsabrechnung",
              "Zustandssystem und Provenienz pro Stück",
            ]}
          />
        </div>
      </section>

      {/* ============================================================ */}
      {/* PROBLEM — What standard ERPs can't do                        */}
      {/* ============================================================ */}
      <section className="mx-auto max-w-3xl py-16">
        <h2 className="mb-8 text-center text-2xl font-bold">
          Was Standard-ERPs nicht können
        </h2>
        <div className="space-y-3">
          {[
            "Den Unterschied zwischen Spende, Einkauf und Reparatur kennen",
            "Einzelne Artikel mit eigenem Zustand, Geschichte und Kosten verfolgen",
            "Kosten über Intake → Reparatur → Verkauf akkumulieren",
            "Spendenquittungen und Impact-Berichte automatisch erstellen",
            "QR-Rechnung, MWST und Schweizer Compliance nativ abbilden",
          ].map((problem) => (
            <div
              key={problem}
              className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4"
            >
              <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <span className="text-sm">{problem}</span>
            </div>
          ))}
        </div>
        <div className="mt-6 text-center">
          <Link
            href="/how-it-works"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            Wie es funktioniert <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </section>

      {/* ============================================================ */}
      {/* AI / AUTOPILOT — Organisation auf Autopilot                  */}
      {/* ============================================================ */}
      <section className="mx-auto max-w-4xl py-8">
        <div className="rounded-2xl border bg-card p-8 sm:p-12">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Ihr Betrieb auf Autopilot</h2>
              <p className="text-sm text-muted-foreground">
                KI-gestützte Eingabe für den Alltag
              </p>
            </div>
          </div>
          <div className="mb-8 rounded-xl border border-primary/20 bg-primary/5 p-4 font-mono text-sm">
            <span className="text-muted-foreground">Sie tippen: </span>
            <span className="font-medium">
              &ldquo;50 ThinkPad T14 aus UBS-Spende, Zustand mittel&rdquo;
            </span>
            <br />
            <span className="text-primary">
              → 50 Artikel erfasst · Spendenquittung generiert · QR-Etiketten
              druckbereit
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <AIFeature
              icon={<MessageSquare className="h-4 w-4" />}
              text="Natürlichsprachige Erfassung: Tippen, was passiert — Kivvi erledigt den Rest"
            />
            <AIFeature
              icon={<Zap className="h-4 w-4" />}
              text="Bulk-Intake: Hunderte Artikel in Minuten erfassen, nicht Stunden"
            />
            <AIFeature
              icon={<Tag className="h-4 w-4" />}
              text="Automatische Beschreibungen und Kategorisierung"
            />
            <AIFeature
              icon={<ClipboardCheck className="h-4 w-4" />}
              text="Intelligente Preisvorschläge basierend auf Zustand und Markt"
            />
          </div>
        </div>
      </section>

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
          <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-4">
            <StatBlock value="23 Jahre" label="Praxiserfahrung" />
            <StatBlock value="5'000+" label="Artikel verwaltet" />
            <StatBlock value="Open Source" label="MIT-Lizenz" />
            <StatBlock value="CHF 0" label="Lizenzkosten" />
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* SCENARIOS — A typical day, not a feature list                */}
      {/* ============================================================ */}
      <section className="mx-auto max-w-4xl py-16">
        <h2 className="mb-12 text-center text-3xl font-bold">
          Ein ganz normaler Tag
        </h2>

        <div className="space-y-12">
          <ScenarioCard
            time="Dienstag, 9 Uhr"
            title="Wareneingang"
            text="Eine Firma liefert 50 ausgemusterte Laptops. Sie tippen '50 Lenovo ThinkPad' und drücken Enter. 50 Artikel erfasst, QR-Etiketten druckbereit, Spendenquittung generiert."
            icon={<PackageOpen className="h-5 w-5" />}
            color="blue"
          />
          <ScenarioCard
            time="Mittwoch, 14 Uhr"
            title="Prüfung & Reparatur"
            text="Freiwillige Maria öffnet Laptop #23. Akku: 78%. Bildschirm: Kratzer. Zustand: Mittel. Neue Batterie: CHF 40. In 30 Sekunden erfasst — Reparaturkosten fliessen direkt in die Margenberechnung."
            icon={<ClipboardCheck className="h-5 w-5" />}
            color="amber"
          />
          <ScenarioCard
            time="Freitag, 16 Uhr"
            title="Verkauf & Impact"
            text="Kunde kommt rein. CHF 80 statt CHF 135 — Richtpreis, angepasst an sein Budget. QR scannen. Fertig. Dashboard zeigt: CHF 30 Marge, 25 kg Elektroschrott vermieden."
            icon={<BarChart3 className="h-5 w-5" />}
            color="green"
          />
        </div>
      </section>

      {/* ============================================================ */}
      {/* DEPLOYMENT OPTIONS — Open Source / Cloud / On-Premise        */}
      {/* ============================================================ */}
      <section className="mx-auto max-w-4xl py-8">
        <h2 className="mb-8 text-center text-2xl font-bold">
          Wie Sie Kivvi nutzen
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <DeploymentCard
            icon={<Code2 className="h-5 w-5" />}
            title="Open Source"
            subtitle="Selbst hosten"
            description="MIT-Lizenz. Sie kontrollieren alles. Kein Vendor Lock-in. Für technische Teams oder mit IT-Support."
            href="https://github.com/g-but/kivvi"
            cta="GitHub ansehen"
            external
          />
          <DeploymentCard
            icon={<Cloud className="h-5 w-5" />}
            title="Cloud"
            subtitle="Verwaltet · Demnächst"
            description="Wir betreiben, Sie nutzen. Keine Infrastruktur, keine Updates. Ideal für Betriebe ohne IT-Ressourcen."
            href="#contact"
            cta="Warteliste"
          />
          <DeploymentCard
            icon={<Server className="h-5 w-5" />}
            title="On-Premise"
            subtitle="Mit Support"
            description="Ihre Infrastruktur, unser Support. Installation, Konfiguration und laufende Betreuung durch uns."
            href="#contact"
            cta="Kontakt aufnehmen"
          />
        </div>
      </section>

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
            <Link
              href="/knowledge"
              className="inline-flex shrink-0 items-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
            >
              Wissensdatenbank öffnen
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* CTA + CONTACT                                                */}
      {/* ============================================================ */}
      <section
        id="contact"
        className="mx-auto max-w-2xl py-16 text-center scroll-mt-16"
      >
        <h2 className="mb-4 text-3xl font-bold">Kivvi für Ihren Betrieb?</h2>
        <p className="mb-8 text-lg text-muted-foreground">
          Schreiben Sie uns — ob Brockenstube, Refurbisher, Repair Café oder
          Vintage-Shop.
        </p>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Mail className="h-4 w-4" />
            {CONTACT_EMAIL}
          </a>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-lg border px-6 py-3 font-medium hover:bg-muted"
          >
            Kivvi ausprobieren
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function VerticalCard({
  icon,
  href,
  title,
  hook,
  bullets,
}: {
  icon: React.ReactNode;
  href: string;
  title: string;
  hook: string;
  bullets: string[];
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-4 rounded-xl border bg-card p-6 transition-colors hover:border-primary/40 hover:bg-muted/50"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
          {icon}
        </div>
        <div className="flex items-center gap-2 font-semibold">
          {title}
          <ArrowRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
      </div>
      <p className="text-sm font-medium">{hook}</p>
      <ul className="space-y-1.5">
        {bullets.map((b) => (
          <li
            key={b}
            className="flex items-start gap-2 text-sm text-muted-foreground"
          >
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            {b}
          </li>
        ))}
      </ul>
    </Link>
  );
}

function AIFeature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0 text-primary">{icon}</div>
      <span className="text-sm text-muted-foreground">{text}</span>
    </div>
  );
}

function DeploymentCard({
  icon,
  title,
  subtitle,
  description,
  href,
  cta,
  external,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  description: string;
  href: string;
  cta: string;
  external?: boolean;
}) {
  const linkProps = external
    ? { target: "_blank", rel: "noopener noreferrer" }
    : {};
  return (
    <div className="flex flex-col rounded-xl border bg-card p-6">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="font-semibold">{title}</div>
      <div className="mb-3 text-xs text-muted-foreground">{subtitle}</div>
      <p className="mb-6 flex-1 text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>
      <a
        href={href}
        {...linkProps}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
      >
        {cta}
        <ArrowRight className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}

function StatBlock({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-bold text-primary">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

const SCENARIO_COLORS = {
  blue: "border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20",
  amber: "border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20",
  green: "border-l-green-500 bg-green-50/50 dark:bg-green-950/20",
};

function ScenarioCard({
  time,
  title,
  text,
  icon,
  color,
}: {
  time: string;
  title: string;
  text: string;
  icon: React.ReactNode;
  color: "blue" | "amber" | "green";
}) {
  return (
    <div
      className={`rounded-xl border-l-4 p-6 sm:p-8 ${SCENARIO_COLORS[color]}`}
    >
      <div className="mb-3 flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {icon}
          <span>{time}</span>
        </div>
        <span className="text-sm font-bold">{title}</span>
      </div>
      <p className="leading-relaxed text-muted-foreground">{text}</p>
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
