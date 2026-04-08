import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { KivviLogo } from "@/components/kivvi-logo";

export default function DatenschutzPage() {
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
          <h1 className="text-3xl font-bold">Datenschutzerklärung</h1>
        </div>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold">Verantwortliche Stelle</h2>
            <p className="text-muted-foreground">
              Verein revamp-it
              <br />
              Birmensdorferstr. 379, 8055 Zürich
              <br />
              info@revamp-it.ch
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Erhobene Daten</h2>
            <p className="text-muted-foreground">
              Bei der Nutzung von Kivvi werden folgende Daten erhoben und
              verarbeitet:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Kontodaten (Name, E-Mail-Adresse) bei der Registrierung</li>
              <li>Unternehmensdaten (Firmenname, Adresse, MWST-Nummer)</li>
              <li>Geschäftsdaten (Kontakte, Artikel, Dokumente, Buchungen)</li>
              <li>
                Technische Daten (IP-Adresse, Browser-Typ) in Serverprotokollen
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Zweck der Verarbeitung</h2>
            <p className="text-muted-foreground">
              Die Daten werden ausschliesslich zur Bereitstellung der
              Kivvi-Dienstleistung verarbeitet. Es findet kein Verkauf oder
              Weitergabe von Daten an Dritte statt, ausser wo dies für den
              Betrieb notwendig ist (siehe Drittanbieter).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Drittanbieter</h2>
            <p className="text-muted-foreground">
              Folgende Drittanbieter können zur Verarbeitung eingesetzt werden:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>
                <strong>KI-Anbieter</strong> (Anthropic, OpenAI, Groq, xAI): Für
                KI-gestützte Funktionen. Es werden nur Geschäftsdaten
                übermittelt, keine persönlichen Daten.
              </li>
              <li>
                <strong>Sentry</strong>: Für Fehlerprotokollierung und
                Leistungsüberwachung. Es werden technische Daten übermittelt.
              </li>
              <li>
                <strong>Datenbank</strong>: PostgreSQL (selbst gehostet oder bei
                Neon). Alle Geschäftsdaten werden in der Datenbank gespeichert.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Cookies</h2>
            <p className="text-muted-foreground">
              Kivvi verwendet ausschliesslich technisch notwendige Cookies für
              die Authentifizierung und Spracheinstellung. Es werden keine
              Tracking-Cookies oder Analyse-Cookies eingesetzt.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Datensicherheit</h2>
            <p className="text-muted-foreground">
              Alle Daten werden verschlüsselt übertragen (HTTPS/TLS). Der
              Zugriff auf Unternehmensdaten ist durch Mandantentrennung
              (companyId) geschützt — jedes Unternehmen sieht nur seine eigenen
              Daten. Passwörter werden mit bcrypt gehasht und nie im Klartext
              gespeichert.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Ihre Rechte</h2>
            <p className="text-muted-foreground">
              Sie haben das Recht auf Auskunft, Berichtigung, Löschung und
              Datenportabilität. Kontaktieren Sie uns unter{" "}
              <a
                href="mailto:info@revamp-it.ch"
                className="text-primary hover:underline"
              >
                info@revamp-it.ch
              </a>{" "}
              für alle datenschutzrelevanten Anfragen.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Open Source</h2>
            <p className="text-muted-foreground">
              Kivvi ist Open-Source-Software. Der vollständige Quellcode ist auf{" "}
              <a
                href="https://github.com/g-but/kivvi"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                GitHub
              </a>{" "}
              einsehbar. Sie können jederzeit prüfen, welche Daten erhoben und
              wie sie verarbeitet werden.
            </p>
          </section>

          <p className="text-sm text-muted-foreground">Stand: April 2026</p>
        </div>
      </div>
    </div>
  );
}
