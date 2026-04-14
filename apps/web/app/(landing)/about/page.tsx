import Link from "next/link";
import { ArrowRight, Github, Recycle, Heart, Code2, Leaf } from "lucide-react";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Über Kivvi — Das ERP für die Kreislaufwirtschaft",
  description:
    "Kivvi ist das erste Open-Source-ERP, das von Grund auf für Kreislaufbetriebe entwickelt wurde.",
};

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-3xl py-16 text-center">
        <div className="mb-4 flex justify-center">
          <div className="rounded-full bg-primary/10 p-4">
            <Recycle className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
          Software, die die Kreislaufwirtschaft versteht.
        </h1>
        <p className="text-xl text-muted-foreground">
          Kivvi ist das erste ERP, das von Grund auf für Betriebe entwickelt
          wurde, die Waren ein zweites, drittes oder viertes Leben geben.
        </p>
      </section>

      {/* Mission */}
      <section className="mx-auto max-w-3xl py-8">
        <div className="rounded-2xl border bg-card p-8 sm:p-10">
          <h2 className="mb-4 text-2xl font-bold">Was wir glauben</h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              Die Kreislaufwirtschaft ist keine Nische. Sie ist das Gegenmittel
              zu einem Wirtschaftssystem, das voraussetzt, dass Güter nur einmal
              benutzt werden. Brockenhäuser, IT-Refurbisher, Repair Cafés und
              Vintage-Shops machen täglich vor, dass das Gegenteil möglich ist.
            </p>
            <p>
              Das Problem: Die Software, die diese Betriebe nutzen müssen, wurde
              für das Gegenteil gebaut. Für neue Waren, feste Preise, klare
              Lieferketten. Kein Feld für Zustand. Kein Konzept für
              Spendenquittungen. Keine Marge pro Einzelartikel.
            </p>
            <p className="font-medium text-foreground">
              Kivvi schließt diese Lücke — mit einem ERP, das die Realität der
              Kreislaufwirtschaft nativ abbildet, statt dagegen anzuarbeiten.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="mx-auto max-w-4xl py-16">
        <h2 className="mb-10 text-center text-2xl font-bold">
          Was Kivvi antreibt
        </h2>
        <div className="grid gap-6 sm:grid-cols-3">
          <ValueCard
            icon={<Leaf className="h-6 w-6" />}
            title="Kreislauf zuerst"
            text="Jede Entscheidung im Produkt fragt: Hilft das Betrieben, die Dingen ein zweites Leben geben? Wenn nicht, gehört es nicht rein."
          />
          <ValueCard
            icon={<Code2 className="h-6 w-6" />}
            title="Offen per Prinzip"
            text="Kivvi ist MIT-lizenziert. Nicht weil es keine Alternativen gibt — sondern weil wir glauben, dass offene Infrastruktur die Kreislaufwirtschaft schneller voranbringt als proprietäre Insellösungen."
          />
          <ValueCard
            icon={<Heart className="h-6 w-6" />}
            title="Gebaut aus Praxis"
            text="Kivvi entstand nicht in einer Produktabteilung. Es wurde in einem laufenden Betrieb entwickelt — mit echten Prozessen, echten Fehlern, echten Anforderungen."
          />
        </div>
      </section>

      {/* Open source section */}
      <section className="mx-auto max-w-3xl py-8">
        <div className="rounded-2xl border bg-card p-8">
          <h2 className="mb-4 text-xl font-bold">Warum Open Source?</h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              Kreislaufwirtschaft ist eine gesellschaftliche Aufgabe. Wenn
              Hunderte von Brockenhäusern, Repair Cafés und IT-Refurbishern die
              gleichen Probleme haben, sollten sie die gleiche Lösung teilen
              können — und gemeinsam verbessern.
            </p>
            <p>
              Kivvi unter MIT-Lizenz bedeutet: kein Vendor-Lock-in, keine
              Lizenzkosten, keine Abhängigkeit von einem einzelnen Anbieter. Wer
              Kivvi selbst hosten will, kann das. Wer beitragen will, ist
              willkommen.
            </p>
            <p>
              Wir glauben, dass die besten ERP-Lösungen für spezifische Sektoren
              von denjenigen gebaut werden, die in diesen Sektoren arbeiten —
              nicht von Software-Unternehmen, die Circular Economy als Zielmarkt
              entdeckt haben.
            </p>
          </div>
          <div className="mt-6 flex items-center gap-4">
            <Button asChild variant="secondary">
              <a
                href="https://github.com/g-but/kivvi"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="h-4 w-4" />
                GitHub öffnen
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Who builds it */}
      <section className="mx-auto max-w-3xl py-16">
        <h2 className="mb-4 text-2xl font-bold">Wer baut Kivvi?</h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Kivvi wird von einem Team entwickelt, das seit Jahren in der
          Kreislaufwirtschaft arbeitet — in der Praxis, nicht nur in der
          Theorie. Die Anforderungen kommen nicht aus Marktanalysen, sondern aus
          echtem Betrieb: kaputte Laptops, Spendencontainer,
          Werkstattprotokolle, Quartalszahlen.
        </p>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Das macht Kivvi anders: Wenn eine neue Funktion gebaut wird, wissen
          wir, warum sie gebraucht wird — weil wir das Problem selbst hatten.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          Beitragende aus der Community sind willkommen. Wer in einem
          Kreislaufbetrieb arbeitet und Ideen hat, was Kivvi besser machen kann
          — wir hören zu.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/contact">
              Kontakt aufnehmen
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link href="/circular-economy">
              Kreislaufwirtschaft verstehen <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}

function ValueCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="mb-3 text-primary">{icon}</div>
      <h3 className="mb-2 font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
    </div>
  );
}
