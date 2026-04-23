import {
  Sparkles,
  MessageSquare,
  Zap,
  Tag,
  ClipboardCheck,
} from "lucide-react";

function AIFeature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0 text-primary">{icon}</div>
      <span className="text-sm text-muted-foreground">{text}</span>
    </div>
  );
}

export function AIAutopilotSection() {
  return (
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
  );
}
