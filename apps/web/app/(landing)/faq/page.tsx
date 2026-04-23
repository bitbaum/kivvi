import Link from "next/link";
import { ArrowRight, HelpCircle } from "lucide-react";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { buildPageMeta } from "@/lib/config/site";
import { ORGANIZATION_LD, FAQ_PAGE_LD, FAQ_GROUPS } from "./faq-data";

export const metadata: Metadata = {
  title: "FAQ — Häufige Fragen zu Kivvi",
  description:
    "Antworten auf die häufigsten Fragen zu Kivvi: Kosten, Self-Hosting, Unterschied zu Bexio und Kivitendo, Kreislaufwirtschaft, QR-Rechnungen, Datenschutz und mehr.",
  ...buildPageMeta(
    "FAQ — Häufige Fragen zu Kivvi",
    "Antworten auf die häufigsten Fragen zu Kivvi: Kosten, Self-Hosting, Unterschied zu Bexio und Kivitendo, Kreislaufwirtschaft, QR-Rechnungen, Datenschutz und mehr.",
  ),
};

export default function FaqPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_LD) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_PAGE_LD) }}
      />
      {/* Hero */}
      <section className="mx-auto max-w-3xl py-16 text-center">
        <div className="mb-4 flex justify-center">
          <div className="rounded-full bg-primary/10 p-4">
            <HelpCircle className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
          Häufige Fragen
        </h1>
        <p className="text-xl text-muted-foreground">
          Alles, was Sie vor dem Start wissen wollen.
        </p>
      </section>

      {/* In-page nav */}
      <section className="mx-auto max-w-3xl py-4">
        <div className="flex flex-wrap gap-2 justify-center">
          {FAQ_GROUPS.map((group) => (
            <a
              key={group.id}
              href={`#${group.id}`}
              className="rounded-full border bg-card px-4 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
            >
              {group.title}
            </a>
          ))}
        </div>
      </section>

      {/* FAQ content */}
      <section className="mx-auto max-w-3xl py-8 space-y-16">
        {FAQ_GROUPS.map((group) => (
          <div key={group.id} id={group.id}>
            <h2 className="mb-6 text-2xl font-bold border-b pb-3">
              {group.title}
            </h2>
            <div className="space-y-6">
              {group.questions.map((item) => (
                <FaqItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* Bottom CTA */}
      <section className="mx-auto max-w-2xl py-16 text-center">
        <h2 className="mb-4 text-2xl font-bold">Frage nicht gefunden?</h2>
        <p className="mb-8 text-muted-foreground">
          Schreiben Sie uns — wir antworten und ergänzen die FAQ.
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg">
            <Link href="/contact">
              Demo anfragen
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link href="/register">
              Kivvi ausprobieren <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="mt-8 flex justify-center gap-6 text-sm">
          <Link
            href="/why-kivvi"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Warum Kivvi →
          </Link>
          <Link
            href="/how-it-works"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Wie es funktioniert →
          </Link>
          <Link
            href="/knowledge"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Wissensdatenbank →
          </Link>
        </div>
      </section>
    </>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <div className="rounded-xl border bg-card p-6">
      <h3 className="mb-3 font-semibold text-base leading-snug">{q}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
    </div>
  );
}
