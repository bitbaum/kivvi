---
title: "Von Kivitendo zu Kivvi migrieren"
tag: "Migration"
readTime: "8 min"
excerpt: "Schritt-für-Schritt: Daten aus Kivitendo exportieren, in Kivvi importieren, Nummernkreise übernehmen. Ohne Datenverlust, ohne Engineering-Aufwand."
lead: "Noch in Kivitendo? So exportieren Sie Kundenstammdaten, Artikel und offene Posten — und importieren sie in wenigen Stunden in Kivvi. Kein Engineering, kein Datenverlust."
published: true
order: 7
---

## Warum jetzt wechseln?

Kivitendo ist ein solides Open-Source-ERP — aber es wurde für klassischen Handel gebaut, nicht für Kreislaufwirtschaft. Einzelartikel-Tracking, Zustandsbewertung, Reparaturkosten-Akkumulation, Impact-Kennzahlen: das alles braucht man in Kivitendo als Workarounds oder Excel-Ergänzung.

Kivvi übernimmt Ihre Daten vollständig: Kontakte, Artikel, offene Rechnungen, Buchungshistorie. Die Migration ist selbst durchführbar — CSV-Export aus Kivitendo, CSV-Import in Kivvi, fertig.

## Was wird importiert?

| Was                     | Details                                                  | Status                                  |
| ----------------------- | -------------------------------------------------------- | --------------------------------------- |
| Kunden & Lieferanten    | Name, Adresse, Kundennummer, E-Mail, Zahlungsbedingungen | Vollständig                             |
| Artikel & Leistungen    | Artikelnummer, Bezeichnung, Preis, Warengruppe, Einheit  | Vollständig                             |
| Offene Rechnungen (AR)  | Rechnungsnummer, Betrag, Fälligkeit, Kunde               | Vollständig                             |
| Eingangsrechnungen (AP) | Belegnummer, Betrag, Lieferant, Fälligkeit               | Vollständig                             |
| Buchungssätze           | Datum, Konto, Gegenkonto, Betrag, Buchungstext           | Vollständig                             |
| Lagerbestand            | Artikel, Menge, Lager — aber keine Einzelartikel-IDs     | Summiert (keine Seriennummern)          |
| Dokumente / Anhänge     | PDF-Rechnungen, Belege                                   | Nicht importierbar — extern archivieren |

## Schritt für Schritt: Export aus Kivitendo

Kivitendo exportiert über Berichte und den integrierten CSV-Export. Gehen Sie in der folgenden Reihenfolge vor — die Reihenfolge ist wichtig wegen Abhängigkeiten (Rechnungen brauchen Kunden und Artikel).

**Schritt 1: Kunden exportieren**

Pfad: `Stammdaten → Kunden → Liste → CSV-Export`

Alle Felder aktivieren; insbesondere Kundennummer, Zahlungsziel, Steuernummer.

**Schritt 2: Lieferanten exportieren**

Pfad: `Stammdaten → Lieferanten → Liste → CSV-Export`

Gleiche Vorgehensweise wie Kunden.

**Schritt 3: Artikel exportieren**

Pfad: `Stammdaten → Artikel → Liste → CSV-Export`

Warengruppen werden als Text exportiert — Kivvi erstellt sie automatisch beim Import.

**Schritt 4: Offene Rechnungen exportieren**

Pfad: `Debitorenbuchhaltung → Berichte → Offene Posten → CSV`

Nur offene Posten — bereits bezahlte Rechnungen brauchen Sie in der Regel nicht zu migrieren.

**Schritt 5: Buchungsjournal exportieren (optional)**

Pfad: `Finanzbuchhaltung → Buchungsjournal → CSV`

Für Jahresvergleiche sinnvoll; nicht zwingend für den laufenden Betrieb.

## Schritt für Schritt: Import in Kivvi

Nach dem Onboarding (Firmendaten, Kontenrahmen, Nummernkreise) finden Sie unter Einstellungen → Datenimport den CSV-Importassistenten. Kivvi erkennt Kivitendo-Exporte automatisch und schlägt die richtigen Spaltenzuordnungen vor.

Importreihenfolge (zwingend einhalten):

1. Kunden und Lieferanten
2. Warengruppen und Hersteller (werden automatisch aus Artikeln erzeugt)
3. Artikel
4. Offene Rechnungen und Eingangsrechnungen
5. Buchungsjournal (optional)
6. Lagerbestand

Kivvi übernimmt nach dem Import automatisch die höchsten bestehenden Nummern und setzt die Nummernkreise entsprechend fort. Ihre erste neue Rechnung bekommt die nächste freie Nummer — nahtlos.

## Nach dem Import

Prüfen Sie nach dem Import stichprobenartig: 3 Kunden, 3 Artikel, 2 offene Rechnungen. Stimmen Adresse, Preis und Betrag? Wenn ja, ist die Migration erfolgreich.

Tipp: Behalten Sie Kivitendo für 30 Tage parallel aktiv — nur im Lesemodus. Führen Sie ab Migrationsstichtag alle neuen Transaktionen in Kivvi. So haben Sie im Zweifelsfall eine Vergleichsquelle, ohne Daten doppelt zu pflegen.
