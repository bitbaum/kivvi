import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import type { Metadata } from "next";
import { KNOWLEDGE_ARTICLES } from "@/lib/content/knowledge-articles";

export const metadata: Metadata = {
  title: "Wissen für Kreislaufbetriebe — Kivvi Knowledge Base",
  description:
    "Praxiswissen zu Zustandsbewertung, Impact-Messung, Spendenquittungen und QR-Rechnungen — entwickelt aus dem Betrieb eines der grössten IT-Refurbisher der Schweiz.",
};

// All article metadata is defined in lib/content/knowledge-articles.ts (SSOT).
// To add an article: add an entry there, then add the JSX content in knowledge/[slug]/page.tsx.

const TAG_COLORS: Record<string, string> = {
  Einblicke:
    "bg-slate-100 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200",
  Betrieb: "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200",
  Compliance:
    "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200",
  Impact:
    "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200",
  Migration:
    "bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200",
  Kundentypen:
    "bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-200",
};

export default function KnowledgePage() {
  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-3xl py-16 text-center">
        <div className="mb-4 flex justify-center">
          <div className="rounded-full bg-primary/10 p-4">
            <BookOpen className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
          Wissen für Kreislaufbetriebe
        </h1>
        <p className="text-xl text-muted-foreground">
          Praxiswissen zu Betrieb, Compliance und Impact — entwickelt aus echter
          Erfahrung. Nicht Theorie, sondern konkrete Antworten auf konkrete
          Fragen.
        </p>
      </section>

      {/* Articles */}
      <section className="mx-auto max-w-4xl py-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {KNOWLEDGE_ARTICLES.map((article) =>
            article.published ? (
              <Link
                key={article.slug}
                href={`/knowledge/${article.slug}`}
                className="group flex flex-col rounded-xl border bg-card p-6 transition-shadow hover:shadow-md"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${TAG_COLORS[article.tag] ?? ""}`}
                  >
                    {article.tag}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {article.readTime}
                  </span>
                </div>
                <h2 className="mb-2 font-semibold leading-snug group-hover:text-primary transition-colors">
                  {article.title}
                </h2>
                <p className="flex-1 text-sm text-muted-foreground leading-relaxed">
                  {article.excerpt}
                </p>
                <div className="mt-4 flex items-center gap-1 text-sm font-medium text-primary">
                  Lesen <ArrowRight className="h-3 w-3" />
                </div>
              </Link>
            ) : (
              <div
                key={article.slug}
                className="flex flex-col rounded-xl border bg-card/50 p-6 opacity-70"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${TAG_COLORS[article.tag] ?? ""}`}
                  >
                    {article.tag}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {article.readTime}
                  </span>
                </div>
                <h2 className="mb-2 font-semibold leading-snug">
                  {article.title}
                </h2>
                <p className="flex-1 text-sm text-muted-foreground leading-relaxed">
                  {article.excerpt}
                </p>
                <div className="mt-4 text-xs text-muted-foreground">
                  Bald verfügbar
                </div>
              </div>
            ),
          )}
        </div>
      </section>

      {/* Cross-links */}
      <section className="mx-auto max-w-4xl py-8">
        <div className="grid gap-4 sm:grid-cols-3">
          <Link
            href="/circular-economy"
            className="group rounded-xl border bg-card p-5 hover:shadow-md transition-shadow"
          >
            <p className="text-xs text-muted-foreground mb-1">Überblick</p>
            <h3 className="font-semibold group-hover:text-primary transition-colors">
              Die Kreislaufwirtschaft verstehen
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Wer ist dabei? Welche Geschäftsmodelle gibt es?
            </p>
          </Link>
          <Link
            href="/why-kivvi"
            className="group rounded-xl border bg-card p-5 hover:shadow-md transition-shadow"
          >
            <p className="text-xs text-muted-foreground mb-1">Das Argument</p>
            <h3 className="font-semibold group-hover:text-primary transition-colors">
              Warum ein eigenes ERP?
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              8 Dimensionen, in denen Standard-Software scheitert.
            </p>
          </Link>
          <Link
            href="/how-it-works"
            className="group rounded-xl border bg-card p-5 hover:shadow-md transition-shadow"
          >
            <p className="text-xs text-muted-foreground mb-1">In der Praxis</p>
            <h3 className="font-semibold group-hover:text-primary transition-colors">
              Wie Kivvi funktioniert
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Intake, Bewertung, Reparatur, Verkauf, Impact.
            </p>
          </Link>
        </div>
      </section>

      {/* Contact */}
      <section className="mx-auto max-w-2xl py-16 text-center">
        <h2 className="mb-4 text-2xl font-bold">Eine Frage, die noch fehlt?</h2>
        <p className="mb-8 text-muted-foreground">
          Schreiben Sie uns — wir antworten und dokumentieren die Antwort für
          alle.
        </p>
        <Link
          href="/contact"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground hover:bg-primary/90"
        >
          Frage stellen
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </>
  );
}
