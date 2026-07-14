# MWST-Fragen an die Treuhandstelle — Reparaturbonus & Anzahlungen

**Datum**: 2026-07-13
**Von**: revamp-it (Verein, Zürich)
**Betrifft**: Korrekte MWST-Behandlung für neue Reparatur-Abläufe in unserer ERP (Kivvi), bevor wir die Verbuchung automatisieren.
**Zweck**: Wir möchten die Verbuchung **einmal korrekt konfigurieren** und danach systemseitig anwenden. Bitte bestätigen oder korrigieren Sie die untenstehenden Annahmen und geben Sie pro Punkt an, **auf welche Ziffer der MWST-Abrechnung** der jeweilige Betrag gehört.

---

## Kontext

revamp-it (gemeinnütziger Verein seit 2003) nimmt gespendete Geräte an, refurbisht und verkauft sie, und betreibt Reparatur-Dienstleistungen (Werkstatt / Repair-Café / IT-Hilfe). Neu bilden wir in der ERP zwei Abläufe ab, die bisher nicht sauber verbucht wurden:

1. **Kundenreparatur mit Reparaturbonus der Stadt Zürich**: Ein:e Kund:in bringt ein **eigenes** Gerät zur Reparatur. Der Reparaturbonus reduziert den vom Kunden zu zahlenden Betrag; die Differenz wird uns durch die **Stadt Zürich (ERZ)** vergütet — Abrechnung mit ERZ erfolgt **monatlich, ausserhalb** der Kunden-Transaktion. Beispiel aus einem realen Beleg: Grundkosten CHF 30.00, mit Reparaturbonus zahlt der Kunde CHF 22.50 **im Voraus**.
2. **Anzahlungen** bei Auftragsannahme (Grundkosten im Voraus), bevor die Schlussrechnung gestellt wird.

Weil wir das Gerät **nie ins Eigentum** übernehmen (es bleibt Eigentum des Kunden), behandeln wir die Reparatur als reine Dienstleistung (keine Warenein-/-auslagerung).

---

## A. Rahmen — kurze Bestätigung vorab

Damit die weiteren Antworten eindeutig sind, bitte bestätigen:

- **A1** — Unsere Abrechnungsart: **effektive Methode** oder **Saldosteuersatz**? (Die Behandlung von Subventionen und Vorsteuerkürzung hängt hiervon ab.)
- **A2** — Abrechnung nach **vereinbarten** oder **vereinnahmten** Entgelten?
- **A3** — Steuersatz für Reparatur-Dienstleistungen: unsere Annahme **Normalsatz 8.1 %**. Korrekt?
- **A4** — Status des Vereins: sind wir für diese Umsätze **MWST-pflichtig / registriert** (Überschreitung der massgebenden Umsatzgrenze)? Ändert die Gemeinnützigkeit etwas an der Behandlung der Reparatur-Umsätze oder des Bonus?

---

## B. Reparaturbonus der Stadt Zürich

**Kernfrage — Rechtsnatur der ERZ-Vergütung.** Ist die vom ERZ vergütete Bonus-Differenz

- **(a) Entgelt von dritter Seite** (Art. 24 Abs. 1 MWSTG) — d.h. Teil des steuerbaren Entgelts für die konkrete Reparaturleistung, weil der Bonus **an eine bestimmte Leistung an eine bestimmte Kundin** gebunden und auf einen Prozentsatz der Reparatur begrenzt ist → **volle MWST auf dem vollen Reparaturbetrag** (Kundenanteil + Bonus); oder
- **(b) Subvention / Nicht-Entgelt** (Art. 18 Abs. 2 lit. a MWSTG) — öffentlich-rechtlicher Beitrag, **kein** steuerbares Entgelt, aber mit **Vorsteuerkürzung** (Art. 33 Abs. 2 MWSTG)?

Diese Einordnung bestimmt alles Weitere, deshalb bitte zuerst (b) vs. (a) klären.

Darauf aufbauend:

- **B1** — Auf **welchem Betrag** schulden wir die MWST: auf dem **vollen** Reparaturpreis oder nur auf dem **Kundenanteil**?
- **B2** — Falls **Subvention (b)**: Wie berechnet sich die **Vorsteuerkürzung** (verhältnismässig / gilt sie bei Saldosteuersatz überhaupt)? Auf welche Ziffer der Abrechnung gehört der Bonus (u.E. Ziff. 900/910)?
- **B3** — Falls **Entgelt von dritter Seite (a)**: Ist die **ERZ-Vergütung** ihrerseits ein steuerbarer Umsatz, den wir dem ERZ **mit MWST** in Rechnung stellen, oder ist die monatliche Abrechnung mit ERZ MWST-**neutral** (reine Weiterleitung des bereits auf der Kundenleistung versteuerten Betrags)? Wir möchten **Doppelbesteuerung** vermeiden.
- **B4** — **Beleganforderungen gegenüber dem Kunden**: Muss der Kundenbeleg den **vollen Preis** und den Bonusabzug separat ausweisen, oder genügt der Ausweis des reduzierten Kundenanteils? Wie ist die MWST auf dem Kundenbeleg darzustellen?
- **B5** — **Buchungssatz**: Unsere geplante Verbuchung bei Abschluss (Beispiel Reparatur CHF 60, Bonus CHF 30):
  - Soll 1100 Debitoren (Kunde) 30.00 / Soll 1109 Forderung ERZ 30.00 / Haben 3200 Dienstleistungsertrag + 2200 Geschuldete MWST.
  - Monatliche ERZ-Abrechnung: Soll 1020 Bank 30.00 / Haben 1109 Forderung ERZ 30.00.

  Ist die **Aufteilung Debitor Kunde / Forderung ERZ** und die MWST-Behandlung so korrekt?

- **B6** — Spielt die **Kategorie** der Reparatur eine Rolle (das Bonusprogramm erfasst nur Elektro/Elektronik, Kleidung, Schuhe)? Hat das MWST-Konsequenzen, oder ist es nur ein Förderkriterium?

---

## C. Anzahlungen (Grundkosten im Voraus)

Bei Auftragsannahme kassieren wir häufig die Grundkosten im Voraus (z.B. CHF 22.50), bevor die Reparatur ausgeführt und schlussabgerechnet wird.

- **C1** — **Steuerentstehung**: Entsteht die MWST bereits mit **Vereinnahmung der Anzahlung** (Vorauszahlung, Art. 40 MWSTG), oder erst mit der **Schlussrechnung**? (Antwort abhängig von A2.)
- **C2** — Falls die MWST bei Vereinnahmung entsteht: Ist die Anzahlung **brutto inkl. MWST** zu behandeln, und wie buchen wir sie sauber? Unsere Annahme: Soll 1020 Bank / Haben 2030 Erhaltene Anzahlungen, mit MWST-Split im Zeitpunkt der Vereinnahmung — **bitte bestätigen oder Alternative angeben**.
- **C3** — **Beleganforderung für die Anzahlung**: Muss der Anzahlungsbeleg bereits ein MWST-konformer Beleg sein (MWST-Ausweis, MWST-Nr.)?
- **C4** — **Verrechnung bei Schluss**: Bei Schlussrechnung verrechnen wir die Anzahlung (Soll 2030 / Haben 1100). Ist die Reihenfolge/Behandlung korrekt, damit die MWST **nicht doppelt** anfällt?
- **C5** — **Storno / Rückerstattung**: Wird der Auftrag storniert und die Anzahlung zurückerstattet — wie korrigieren wir eine allenfalls bereits deklarierte MWST?

---

## D. Kombination & Grenzfälle

- **D1** — **Anzahlung auf einer bonus-subventionierten Reparatur**: Wenn die im Voraus kassierten CHF 22.50 der um den Bonus **reduzierte Kundenanteil** sind — in welcher Reihenfolge sind Bonus (B) und Anzahlung (C) zu behandeln, und auf welchem Betrag entsteht wann die MWST?
- **D2** — **Periodenübergreifend**: Anzahlung in einer MWST-Periode, Bonus-Abrechnung mit ERZ in einer späteren — ergeben sich Zuordnungsprobleme?
- **D3** — **Gratis-/Teilgratis-Reparaturen** (Repair-Café, wenn Bonus die Kosten vollständig deckt): MWST-Folgen, wenn der Kundenanteil CHF 0 ist?

---

## E. Was wir von Ihnen benötigen

Damit wir die ERP-Konfiguration festlegen können, bitten wir **pro Punkt** um:

1. **Bestätigung oder Korrektur** unserer Annahme (ja / nein / stattdessen …).
2. Den **korrekten Buchungssatz** (Konten nach Schweizer KMU-Kontenrahmen).
3. Die **Ziffer der MWST-Abrechnung**, auf die der Betrag gehört (z.B. 200/205 Entgelte, 900/910 Subventionen/Nicht-Entgelte).
4. Falls relevant: die **Belegpflichten** gegenüber Kunde bzw. ERZ.

Die für uns wichtigste Einzelfrage ist **B (Subvention vs. Entgelt von dritter Seite)** — davon hängt ab, ob wir auf dem vollen Reparaturbetrag oder nur auf dem Kundenanteil MWST schulden und ob eine Vorsteuerkürzung greift.

Wir kodieren Ihre Antworten anschliessend als **Konfiguration pro Förderprogramm** (nicht fest verdrahtet auf Zürich), damit weitere Gemeinden/Programme später sauber ergänzt werden können.

Besten Dank!

---

## F. FER-21 Fondsrechnung (zweckgebundene Fonds) — separater Themenblock

Wir bilden neu **zweckgebundene Fonds** (Spenden/Beiträge mit Verwendungsauflage) nach **Swiss GAAP FER 21** ab und möchten die Verbuchung korrekt konfigurieren. Bitte pro Punkt bestätigen/korrigieren:

- **F1 — Zuweisung**: Wird zweckgebundenes Geld zuerst als **Ertrag** erfasst und dann über eine Betriebsrechnungszeile **«Zuweisung an Fonds»** ins **Fondskapital** umgebucht (operatives Ergebnis neutral), oder direkt gegen Fondskapital gebucht?
- **F2 — Verwendung**: Bei Zweckerfüllung — Aufwand normal buchen und über **«Verwendung/Entnahme aus Fonds»** aus dem Fondskapital entnehmen (begrenzt auf den Fondsbestand)? Ist die Deckelung (kein negativer Fonds → Rest zulasten freies Kapital) korrekt?
- **F3 — Kontocodes**: bestätigte Konten für **Fondskapital (zweckgebunden, extern)**, **Organisationskapital gebunden** (Vorstand) und **Organisationskapital frei** im Kontenrahmen.
- **F4 — Ausweis Bilanz**: Passivseite als drei Blöcke **Fremdkapital / Fondskapital / Organisationskapital** — korrekt?
- **F5 — Interne Transfers**: Bestätigung, dass **extern zweckgebundenes** Fondskapital **nicht** intern umgewidmet werden darf (nur Verwendung bei Zweckerfüllung), intern gebundenes hingegen schon.
- **F6 — Art. 33 MWSTG**: Bei einem durch **öffentliche Subvention** gespiesenen Fonds — Auswirkung auf die **Vorsteuerkürzung**.

---

_Interne Referenz: Umsetzung in `docs/REPAIR_INTAKE_AND_SUBSIDY_SPEC.md` §5–6 (Reparaturbonus) und `docs/FER21_FUND_ACCOUNTING_SPEC.md` §6–8 (Fonds). Die dort mit „‹policy›“ markierten Buchungszeilen bleiben blockiert, bis diese Fragen beantwortet sind._
