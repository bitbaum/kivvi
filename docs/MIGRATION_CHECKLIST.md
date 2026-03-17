# Migration von kivitendo zu Kivvi

Schritt-für-Schritt-Anleitung für die Migration einer Schweizer KMU von kivitendo zu Kivvi.

---

## Voraussetzungen

- [ ] Kivvi läuft (lokal oder gehostet)
- [ ] PostgreSQL-Datenbank eingerichtet
- [ ] Zugang zu kivitendo für CSV-Exporte
- [ ] SMTP-Zugangsdaten bereit (z.B. Brevo)

---

## Phase 1: Daten aus kivitendo exportieren

Exportiere alle Stammdaten als CSV (UTF-8, Semikolon-getrennt):

- [ ] **Kunden** — Kundenstamm inkl. Adresse, E-Mail, Telefon
- [ ] **Lieferanten** — Lieferantenstamm
- [ ] **Artikel** — Artikelstamm inkl. Preise, MwSt-Sätze, Artikelgruppen
- [ ] **Rechnungen** — Alle Ausgangsrechnungen mit Positionen
- [ ] **Eingangsrechnungen** — Alle Eingangsrechnungen mit Positionen
- [ ] **Buchungssätze** — Journal mit Soll/Haben (optional, für Vergleich)

> **Tipp**: In kivitendo unter _System → CSV-Export_ oder via Perl-Skript.

---

## Phase 2: Kivvi einrichten

### 2.1 Konto erstellen

- [ ] Registrierung auf Kivvi
- [ ] E-Mail bestätigen

### 2.2 Onboarding-Assistent abschliessen

- [ ] **Schritt 1**: Firmenname, Adresse, MwSt-Nummer eingeben
- [ ] **Schritt 2**: Standard-MwSt-Satz, Zahlungsfrist, IBAN konfigurieren
  - Erstellt automatisch: 227 Konten (Swiss KMU Kontenrahmen), 11 Nummernkreise, Hauptlager, Geschäftsjahr
- [ ] **Schritt 3**: «Daten importieren» wählen

### 2.3 Firmeneinstellungen vervollständigen

- [ ] **Logo hochladen** — Einstellungen → Firma → Logo (PNG/JPEG/SVG, max. 500KB)
- [ ] **Bankverbindung** — IBAN und Bankname
- [ ] **Dokumentfusszeile** — Standard-Text für Rechnungen
- [ ] **MwSt-Satz** — 8.1% (Normal), 2.6% (Reduziert), oder 0% (Befreit)
- [ ] **Zahlungsfrist** — Anzahl Tage (z.B. 30)

---

## Phase 3: CSV-Import (Reihenfolge beachten!)

Die Import-Reihenfolge ist wichtig wegen Fremdschlüssel-Abhängigkeiten:

### 3.1 Kontakte (keine Abhängigkeiten)

- [ ] Kunden-CSV hochladen → Profil «kivitendo Kunden» wählen
- [ ] Lieferanten-CSV hochladen → Profil «kivitendo Lieferanten» wählen
- [ ] Vorschau prüfen → Importieren

### 3.2 Artikelgruppen & Hersteller (keine Abhängigkeiten)

- [ ] Falls vorhanden: Artikelgruppen importieren
- [ ] Falls vorhanden: Hersteller importieren

### 3.3 Artikel (abhängig von Gruppen/Herstellern)

- [ ] Artikel-CSV hochladen → Profil «kivitendo Artikel» wählen
- [ ] Vorschau prüfen: Preise, MwSt-Sätze korrekt?
- [ ] Importieren

### 3.4 Dokumente (abhängig von Kontakten & Artikeln)

- [ ] Rechnungen-CSV hochladen → Profil «kivitendo Rechnungen» wählen
- [ ] Vorschau prüfen: Positionen, Beträge, Kundenzuordnung
- [ ] Importieren
- [ ] Eingangsrechnungen-CSV hochladen → Profil «kivitendo Eingangsrechnungen» wählen
- [ ] Importieren

### 3.5 Buchungssätze (abhängig von Kontenrahmen)

- [ ] Journal-CSV hochladen → Profil «kivitendo Buchungssätze» wählen
- [ ] Vorschau prüfen: Soll/Haben, Kontonummern
- [ ] Importieren

### 3.6 Lagerbestände (abhängig von Artikeln)

- [ ] Falls vorhanden: Lagerbestände importieren

> **Hinweis**: Nummernkreise werden automatisch auf MAX(vorhandene Nummer) + 1 aktualisiert.

---

## Phase 4: Import verifizieren

### 4.1 Kontakte

- [ ] Stichprobe: 5 Kunden in Kivvi öffnen, mit kivitendo vergleichen
- [ ] Adressen, E-Mail, Telefon korrekt?
- [ ] Kundennummern (K-00001 ff.) vorhanden?

### 4.2 Artikel

- [ ] Stichprobe: 5 Artikel prüfen
- [ ] Preise korrekt (CHF, keine Rundungsfehler)?
- [ ] MwSt-Sätze korrekt?
- [ ] Artikelnummern (ART-00001 ff.) vorhanden?

### 4.3 Dokumente

- [ ] Stichprobe: 5 Rechnungen prüfen
- [ ] Positionen, Mengen, Einzelpreise korrekt?
- [ ] Gesamtbeträge stimmen?
- [ ] Kundenzuordnung korrekt?
- [ ] Status korrekt (bezahlt/offen)?

### 4.4 Buchungssätze

- [ ] Saldo der Konten mit kivitendo vergleichen
- [ ] Eröffnungsbilanz prüfen

---

## Phase 5: Erste Rechnung erstellen

### 5.1 Rechnung anlegen

- [ ] Neue Rechnung erstellen (Verkauf → Rechnungen → Neu)
- [ ] Kunde, Positionen, MwSt eingeben
- [ ] Speichern

### 5.2 PDF prüfen

- [ ] PDF herunterladen → Logo vorhanden?
- [ ] QR-Rechnung am Seitenende korrekt?
- [ ] Beträge korrekt berechnet?
- [ ] Fusszeile vorhanden?
- [ ] Bankverbindung auf QR-Zahlteil korrekt?

### 5.3 E-Mail-Versand

- [ ] SMTP konfiguriert (Einstellungen → SMTP/Brevo)
- [ ] Rechnung per E-Mail versenden
- [ ] E-Mail empfangen? PDF-Anhang korrekt?

### 5.4 Zahlung erfassen

- [ ] Zahlung manuell erfassen → Status wechselt zu «Bezahlt»

---

## Phase 6: Banking einrichten

- [ ] CAMT.053-Datei von der Bank herunterladen
- [ ] In Kivvi importieren (Banking → Import)
- [ ] Vorschau prüfen: Transaktionen korrekt?
- [ ] Importieren
- [ ] Auto-Matching prüfen: Werden offene Rechnungen erkannt?
- [ ] Abstimmen (Reconciliation) → Zahlungen werden erfasst

---

## Phase 7: Berichte vergleichen

- [ ] **Erfolgsrechnung (P&L)** — Kivvi vs. kivitendo (gleicher Zeitraum)
- [ ] **Bilanz** — Summen vergleichen
- [ ] **MwSt-Abrechnung** — Beträge vergleichen
- [ ] **Altersstruktur** — Offene Posten vergleichen
- [ ] **Umsatzbericht** — Umsatz nach Kunde/Monat

> Alle Berichte unterstützen CSV-Export für den Vergleich.

---

## Phase 8: Parallelbetrieb (1–2 Wochen)

- [ ] Beide Systeme parallel nutzen
- [ ] Neue Rechnungen in **Kivvi** erstellen
- [ ] Zahlungseingänge in **Kivvi** erfassen
- [ ] Am Ende jeder Woche: Salden vergleichen
- [ ] Probleme dokumentieren und beheben

---

## Phase 9: Umstellung (Cutover)

Wenn alle Prüfungen bestanden:

- [ ] Letzten CAMT-Import in Kivvi durchführen
- [ ] Offene Posten in kivitendo abschliessen
- [ ] kivitendo auf «nur lesen» setzen (oder Backup erstellen)
- [ ] Team informieren: Ab sofort nur noch Kivvi
- [ ] kivitendo-Daten archivieren (10 Jahre Aufbewahrungspflicht CH)

---

## Troubleshooting

| Problem                | Lösung                                                                                  |
| ---------------------- | --------------------------------------------------------------------------------------- |
| CSV-Import bricht ab   | Encoding prüfen (UTF-8 mit BOM), Trennzeichen (Semikolon)                               |
| Beträge falsch         | Schweizer Zahlenformat? Apostrophe in Tausendern (5'007.20) werden automatisch entfernt |
| Daten nicht zugeordnet | Import-Reihenfolge beachten (Kontakte vor Dokumenten)                                   |
| MwSt falsch berechnet  | Standard-MwSt-Satz in Firmeneinstellungen prüfen                                        |
| QR-Rechnung fehlt      | IBAN in Firmeneinstellungen eingeben                                                    |
| Logo nicht auf PDF     | Logo unter Einstellungen → Firma hochladen (PNG/JPEG/SVG, max. 500KB)                   |
| E-Mail kommt nicht an  | SMTP-Einstellungen prüfen, Spam-Ordner kontrollieren                                    |

---

## Zeitplanung

| Schritt                           | Geschätzter Aufwand |
| --------------------------------- | ------------------- |
| CSV-Export aus kivitendo          | 30 Min.             |
| Kivvi Onboarding + Einstellungen  | 30 Min.             |
| CSV-Import + Verifikation         | 1–2 Std.            |
| Erste Rechnung + E-Mail-Test      | 30 Min.             |
| Banking-Import + Abstimmung       | 30 Min.             |
| Berichte vergleichen              | 1 Std.              |
| Parallelbetrieb                   | 1–2 Wochen          |
| **Gesamt (ohne Parallelbetrieb)** | **4–5 Stunden**     |
