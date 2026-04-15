import { CheckCircle } from "lucide-react";
import type { Metadata } from "next";
import { buildPageMeta } from "@/lib/config/site";
import { ContactForm } from "./_contact-form";

export const metadata: Metadata = {
  title: "Demo anfragen — Kivvi ERP",
  description:
    "Demo anfragen oder direkt loslegen. Kivvi ist das Open-Source-ERP für Brockenhäuser, IT-Refurbisher, Repair Cafés und Vintage-Shops — Swiss-native, MIT-Lizenz.",
  ...buildPageMeta(
    "Demo anfragen — Kivvi ERP",
    "Demo anfragen oder direkt loslegen. Kivvi ist das Open-Source-ERP für Brockenhäuser, IT-Refurbisher, Repair Cafés und Vintage-Shops — Swiss-native, MIT-Lizenz.",
  ),
};

const BENEFITS = [
  "Speziell für Kreislaufwirtschaft gebaut",
  "Schweizer QR-Rechnungen & MWST nativ",
  "Open Source, MIT-Lizenz — kein Vendor Lock-in",
  "KI-Schnelleingabe für schnellen Wareneingang",
  "Kivitendo-Migration in wenigen Stunden",
] as const;

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-4xl py-16 px-4">
      {/* Header */}
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Demo anfragen
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Schreiben Sie uns, wir antworten innerhalb von 2 Werktagen.
        </p>
      </div>

      {/* Two-column layout: mobile = stacked (form first), desktop = side by side */}
      <div className="grid gap-12 lg:grid-cols-2">
        {/* Right column on mobile (rendered first = shown first) */}
        <div className="order-1 lg:order-2">
          <ContactForm />
        </div>

        {/* Left column: benefits */}
        <div className="order-2 lg:order-1">
          <h2 className="mb-6 text-xl font-semibold">Warum Kivvi?</h2>
          <ul className="space-y-4">
            {BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-start gap-3">
                <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span className="text-sm leading-relaxed">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Cloud CTA */}
      <div className="mt-20 rounded-2xl border bg-muted/30 px-8 py-10 text-center">
        <h2 className="mb-2 text-xl font-semibold">
          Direkt loslegen
        </h2>
        <p className="mb-6 text-sm text-muted-foreground">
          Die Cloud-Version ist verfügbar — gehostet in der Schweiz, betrieben von revamp-it. Oder Self-Hosting mit vollständiger Datenkontrolle.
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <a
            href="/register"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
          >
            Kostenlos testen
          </a>
          <a
            href="/pricing"
            className="inline-flex items-center gap-2 rounded-lg border px-6 py-2.5 text-sm font-semibold hover:bg-muted transition-colors"
          >
            Preise ansehen
          </a>
        </div>
      </div>
    </div>
  );
}
