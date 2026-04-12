import type { Metadata } from "next";
import { CONTACT_EMAIL } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "Impressum — Kivvi",
  description: "Angaben zum Anbieter von Kivvi gemäss Impressumspflicht.",
};

export default function ImpressumPage() {
  return (
    <section className="mx-auto max-w-2xl py-16">
      <h1 className="mb-8 text-3xl font-bold">Impressum</h1>

      <div className="space-y-8 text-sm text-muted-foreground leading-relaxed">
        <div>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            Anbieter
          </h2>
          <p>
            revamp-it Genossenschaft
            <br />
            Hardstrasse 41
            <br />
            8004 Zürich
            <br />
            Schweiz
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            Kontakt
          </h2>
          <p>
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
            Verantwortlich für den Inhalt
          </h2>
          <p>revamp-it Genossenschaft, Zürich</p>
        </div>

        <div>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            Quellcode
          </h2>
          <p>
            Kivvi ist Open Source (MIT-Lizenz).{" "}
            <a
              href="https://github.com/g-but/kivvi"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground hover:underline"
            >
              github.com/g-but/kivvi
            </a>
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            Haftungsausschluss
          </h2>
          <p>
            Die Inhalte dieser Website wurden mit grösster Sorgfalt erstellt.
            Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte
            übernimmt revamp-it keine Gewähr. Als Diensteanbieter sind wir für
            eigene Inhalte verantwortlich. Für externe Links übernehmen wir
            keine Haftung; die Verantwortung liegt beim jeweiligen Anbieter.
          </p>
        </div>
      </div>
    </section>
  );
}
