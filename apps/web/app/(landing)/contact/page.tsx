import { CheckCircle } from "lucide-react";
import type { Metadata } from "next";
import { ContactForm, WaitlistForm } from "./_contact-form";

export const metadata: Metadata = {
  title: "Demo anfragen — Kivvi ERP",
  description:
    "Demo anfragen oder auf die Cloud-Warteliste setzen lassen. Kivvi ist das Open-Source-ERP für Brockenhäuser, IT-Refurbisher, Repair Cafés und Vintage-Shops — Swiss-native, MIT-Lizenz.",
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

      {/* Waitlist section */}
      <div className="mt-20 rounded-2xl border bg-muted/30 px-8 py-10 text-center">
        <h2 className="mb-2 text-xl font-semibold">
          Cloud-Version coming soon
        </h2>
        <p className="mb-6 text-sm text-muted-foreground">
          Tragen Sie sich auf die Warteliste ein — wir benachrichtigen Sie,
          sobald die Cloud-Version verfügbar ist.
        </p>
        <div className="mx-auto max-w-md">
          <WaitlistForm />
        </div>
      </div>
    </div>
  );
}
