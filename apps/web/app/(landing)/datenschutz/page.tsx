import type { Metadata } from "next";
import { CONTACT_EMAIL, buildPageMeta } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "Datenschutzerklärung — Kivvi",
  description:
    "Datenschutzerklärung von Kivvi gemäss Schweizer Datenschutzgesetz (nDSG).",
  ...buildPageMeta(
    "Datenschutzerklärung — Kivvi",
    "Datenschutzerklärung von Kivvi gemäss Schweizer Datenschutzgesetz (nDSG).",
  ),
};

export default function DatenschutzPage() {
  return (
    <section className="mx-auto max-w-2xl py-16">
      <h1 className="mb-2 text-3xl font-bold">Datenschutzerklärung</h1>
      <p className="mb-10 text-sm text-muted-foreground">
        Gültig ab 1. Januar 2025 · Gemäss Schweizer Datenschutzgesetz (nDSG)
      </p>

      <div className="space-y-8 text-sm text-muted-foreground leading-relaxed">
        <div>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            1. Verantwortliche Stelle
          </h2>
          <p>
            revamp-it Genossenschaft, Zürich, Schweiz
            <br />
            E-Mail:{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-foreground hover:underline"
            >
              {CONTACT_EMAIL}
            </a>
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            2. Welche Daten wir erheben
          </h2>
          <p className="mb-3">
            <strong className="text-foreground">Kontodaten:</strong> Bei der
            Registrierung erheben wir E-Mail-Adresse, Firmenname und ein
            Passwort (gespeichert als Hashwert).
          </p>
          <p className="mb-3">
            <strong className="text-foreground">Nutzungsdaten:</strong> Die
            Applikation speichert die von Ihnen eingegebenen Geschäftsdaten
            (Kontakte, Produkte, Dokumente) — ausschliesslich zur Bereitstellung
            des Dienstes.
          </p>
          <p>
            <strong className="text-foreground">Technische Logdaten:</strong>{" "}
            Serverseitige Logs (IP-Adresse, Zeitstempel, aufgerufene URLs)
            werden für maximal 30 Tage aufbewahrt und ausschliesslich zur
            Fehlerdiagnose verwendet.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            3. Zweck der Datenbearbeitung
          </h2>
          <ul className="space-y-1 list-disc list-inside">
            <li>Bereitstellung und Betrieb der Kivvi-Applikation</li>
            <li>Authentifizierung und Zugriffskontrolle</li>
            <li>Fehlerbehebung und Sicherheit</li>
            <li>Beantwortung von Support-Anfragen</li>
          </ul>
          <p className="mt-3">
            Wir verwenden Ihre Daten nicht für Werbezwecke und geben sie nicht
            an Dritte weiter.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            4. Speicherort und Hosting
          </h2>
          <p>
            Alle Daten werden auf Servern in der Schweiz oder der EU
            gespeichert. Bei Self-Hosting-Installationen obliegt die Wahl des
            Speicherorts dem Betreiber der Instanz.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            5. Aufbewahrungsdauer
          </h2>
          <p>
            Kontodaten werden aufbewahrt, solange das Konto aktiv ist. Nach
            Löschung des Kontos werden personenbezogene Daten innerhalb von 30
            Tagen gelöscht, soweit keine gesetzlichen Aufbewahrungspflichten
            bestehen (z.B. Buchführungspflicht nach OR 958f: 10 Jahre).
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            6. Ihre Rechte
          </h2>
          <p className="mb-3">Gemäss nDSG haben Sie das Recht auf:</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>Auskunft über die zu Ihrer Person gespeicherten Daten</li>
            <li>Berichtigung unrichtiger Daten</li>
            <li>Löschung Ihrer Daten</li>
            <li>Einschränkung der Bearbeitung</li>
            <li>Datenübertragbarkeit (Export als CSV)</li>
          </ul>
          <p className="mt-3">
            Zur Ausübung dieser Rechte wenden Sie sich an:{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-foreground hover:underline"
            >
              {CONTACT_EMAIL}
            </a>
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            7. Cookies
          </h2>
          <p>
            Kivvi verwendet ausschliesslich funktionale Cookies für die
            Authentifizierung (Session-Cookie). Es werden keine
            Tracking-Cookies, Analyse-Cookies oder Werbe-Cookies eingesetzt.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            8. Änderungen dieser Erklärung
          </h2>
          <p>
            Wir behalten uns vor, diese Datenschutzerklärung bei Bedarf
            anzupassen. Die jeweils aktuelle Version ist auf dieser Seite
            abrufbar. Bei wesentlichen Änderungen werden registrierte Nutzer per
            E-Mail informiert.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            9. Kontakt
          </h2>
          <p>
            Bei Fragen zum Datenschutz:{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-foreground hover:underline"
            >
              {CONTACT_EMAIL}
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
