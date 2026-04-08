import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { KivviLogo } from "@/components/kivvi-logo";

export default function ImpressumPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-3xl px-4 py-12">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <KivviLogo size={32} />
          <h1 className="text-3xl font-bold">Impressum</h1>
        </div>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold">Betreiber</h2>
            <p className="text-muted-foreground">
              Verein revamp-it
              <br />
              Birmensdorferstr. 379
              <br />
              8055 Zürich
              <br />
              Schweiz
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Kontakt</h2>
            <p className="text-muted-foreground">
              E-Mail:{" "}
              <a
                href="mailto:info@revamp-it.ch"
                className="text-primary hover:underline"
              >
                info@revamp-it.ch
              </a>
              <br />
              Telefon: +41 43 960 32 64
              <br />
              Web:{" "}
              <a
                href="https://revampit.ch"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                revampit.ch
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Handelsregister</h2>
            <p className="text-muted-foreground">
              Eingetragen im Handelsregister des Kantons Zürich
              <br />
              Rechtsform: Verein (Art. 60 ff. ZGB)
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">
              Verantwortlich für den Inhalt
            </h2>
            <p className="text-muted-foreground">Verein revamp-it, Zürich</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Haftungsausschluss</h2>
            <p className="text-muted-foreground">
              Der Autor übernimmt keinerlei Gewähr hinsichtlich der inhaltlichen
              Richtigkeit, Genauigkeit, Aktualität, Zuverlässigkeit und
              Vollständigkeit der Informationen. Haftungsansprüche gegen den
              Autor wegen Schäden materieller oder immaterieller Art, welche aus
              dem Zugriff oder der Nutzung bzw. Nichtnutzung der
              veröffentlichten Informationen, durch Missbrauch der Verbindung
              oder durch technische Störungen entstanden sind, werden
              ausgeschlossen.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Urheberrechte</h2>
            <p className="text-muted-foreground">
              Kivvi ist Open-Source-Software, veröffentlicht unter der
              MIT-Lizenz. Der Quellcode ist auf{" "}
              <a
                href="https://github.com/g-but/kivvi"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                GitHub
              </a>{" "}
              verfügbar.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
