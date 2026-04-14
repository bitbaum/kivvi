---
title: "Marge pro Artikel: Warum Standard-ERPs bei Secondhand rechnerisch scheitern"
tag: "Einblicke"
readTime: "10 min"
excerpt: "Ein ThinkPad kommt für CHF 0 herein. Nach Reinigung, Datenträger-Löschung und Austausch des Akkus kostet er CHF 47. Welches ERP kennt diesen Betrag?"
lead: "Marge ist Erlös minus Kosten. Im linearen Handel ist das trivial — Einkaufspreis ist bekannt, Verkaufspreis steht im System. Im Kreislaufbetrieb ist die Kostenbasis veränderlich: Sie wächst mit jeder Reparatur, jedem Ersatzteil, jedem Arbeitsstundeneinsatz. Standard-ERPs bilden das nicht ab — und die Folge sind Schätzmargen statt echter Margen."
published: true
order: 3
---

## Das Problem mit CHF 0

Nehmen wir einen konkreten Fall. Ein IT-Refurbisher erhält eine Spendenpalette mit 20 Lenovo ThinkPad T480. Einkaufspreis: CHF 0. Die Geräte sind gespendet.

Im Standard-ERP entsteht sofort ein Problem: Was ist die Kostenbasis? Null. Jeder Erlös ist dann technisch 100% Marge — was offensichtlich falsch ist.

Denn bevor das Gerät verkauft werden kann, passiert folgendes:
- Gesamtaufnahme und Zustandsbewertung: 15 Minuten
- Festplatte sichern und Daten unwiderruflich löschen (Blancco oder gleichwertig): 20 Minuten + Lizenzkosten
- Akku-Test: falls unter 70% Kapazität, Austausch nötig, Kosten CHF 25–40 pro Stück
- Reinigung Gehäuse und Tastatur: 10 Minuten
- Funktionstest mit Protokoll: 20 Minuten
- Kosmetische Reparaturen falls nötig: variabel

Allein die Arbeitszeit für ein durchschnittliches Gerät liegt bei einer Stunde. Dazu kommen die Materialkosten. Und für ein Gerät mit defektem Akku sind es schnell CHF 60–70 in Kosten, bevor es in den Verkauf geht.

Welche ERP-Lösung in der Schweiz erfasst diese Kostenentwicklung pro Einzelgerät? Keine marktgängige.

## Wie Kostenbasis im Kreislaufbetrieb entsteht

Das entscheidende Merkmal von Kreislaufbetrieben ist, dass die Kostenbasis variabel und akkumulierend ist.

Bei einem neuen Artikel ist das trivial: Einkaufspreis = Kostenbasis. Immer gleich für alle Einheiten desselben SKUs.

Bei einem Secondhand-Artikel:

**Startpunkt** — Eingangskosten. Kann CHF 0 sein (Spende), CHF 15 (Kauf am Flohmarkt), CHF 200 (Ankauf von einem Unternehmen). Dieser Betrag ist für jeden Artikel individuell.

**Phase Aufbereitung** — Reinigung, Datenträger-Löschung, Grundtest. Weitgehend fix pro Gerätekategorie. Etwa CHF 20–30 Arbeitskosten für einen Laptop, weniger für ein Handy, mehr für einen Desktop-Computer.

**Phase Reparatur** — Tritt nur ein, wenn der Test Mängel zeigt. Kann entfallen (Gerät ist in einwandfreiem Zustand), kann CHF 50 betragen (neuer Akku), kann CHF 150 betragen (neue Tastatur + Scharnier-Reparatur). Für jeden Artikel unterschiedlich.

**Phase Kosmetik** — Gehäuse-Aufkleber entfernen, Kratzer polieren, Reinigung nach Reparatur. Variabel.

**Resultat**: Die Kostenbasis eines Geräts ist erst bekannt, wenn die Aufbereitung abgeschlossen ist — manchmal Tage nach dem Eingang. Ein ERP, das die Kostenbasis beim Eingang einfriert, arbeitet mit falschen Zahlen.

## Was das in der Praxis bedeutet

Ein mittelgrosser IT-Refurbisher verarbeitet 200–300 Geräte pro Monat. Ohne Einzelartikel-Kostenverfolgung passiert folgendes:

**Schätzmargen.** Die Geschäftsleitung schätzt die Durchschnittsmarge. «Wir kaufen ein für CHF X und verkaufen für CHF Y, also ist die Marge Z%». Das stimmt im Durchschnitt — aber es verbirgt, welche Gerätetypen profitabel sind und welche nicht.

**Keine Feedback-Schleife.** Wenn der Austausch eines Akkus CHF 35 kostet und das Gerät danach für CHF 20 mehr verkauft wird, ist das ein Verlustgeschäft. Aber es fällt nicht auf, weil die Reparaturkosten nicht dem Gerät, sondern einem allgemeinen Kostenkonto zugebucht werden.

**Falsche Beschaffungsentscheidungen.** Wenn man nicht weiss, welche Gerätetypen nach Kosten die beste Marge erzielen, kann man keine informierten Entscheidungen über Ankäufe treffen. Man kauft nach Bauchgefühl statt nach Datenlage.

**Verpasste Preisoptimierungen.** Ein Laptop, der nach CHF 80 Aufbereitungskosten für CHF 220 verkauft wird, hat eine gute Marge. Ein Laptop, der nach CHF 140 Aufbereitungskosten für CHF 250 verkauft wird, hat eine schlechte Marge — obwohl der Verkaufspreis höher ist. Nur mit Einzelartikel-Tracking sieht man das.

## Was ein Kreislaufbetrieb braucht

Drei Dinge, die kein Standard-ERP nativ kann:

**1. Reparaturprotokoll pro Artikel.** Jeder Eingriff an einem Gerät — Reinigung, Datenträger-Löschung, Bauteil-Austausch, Test — wird mit Datum, Aufwand in Stunden und Materialkosten in CHF dem Artikel zugebucht. Die Kostenbasis wächst mit jedem Eintrag.

**2. Effektive Marge zum Zeitpunkt des Verkaufs.** Wenn das Gerät verkauft wird, berechnet das System die tatsächliche Marge: Verkaufspreis minus akkumulierten Kosten (Eingang + alle Reparaturen + Overhead-Anteil falls gewünscht). Nicht eine geschätzte Marge — die echte.

**3. Mindestpreis-Mechanismus.** Der Mindestpreis eines Artikels muss immer über der Kostenbasis liegen — automatisch. Wenn der Mitarbeiter beim Preisabschlag im Kundengespräch unter den Mindestpreis gehen will, warnt das System. Verkauf unter Kosten ist im Kreislaufbetrieb keine Seltenheit, wenn es kein explizites Limit gibt.

## Die buchhalterische Seite

Das Problem hat auch eine buchhalterische Dimension.

Im linearen Handel bucht man Wareneinkäufe auf ein Lager-Konto und die Waren gehen bei Verkauf aus dem Lager in den Aufwand (Wareneinsatz). Einfach.

Im Kreislaufbetrieb ist der «Wareneingang» nicht das Ende — es ist der Beginn eines Wertentstehungsprozesses. Reparaturkosten erhöhen den Buchwert des Lagers. Datenträger-Löschung ist ein Aufwand, der direkt einem Artikel zugeordnet werden sollte, nicht einem allgemeinen Konto.

Wenn ein IT-Refurbisher professionell bilanziert, muss er den Lagerbestand zum Einstandswert berechnen — und der Einstandswert eines aufbereiteten Geräts ist nicht der Einkaufspreis, sondern die akkumulierten Kosten bis zur Verkaufsbereitschaft.

Das ist nicht nur ERP-Theorie. Das ist für einen Jahresabschluss relevant.

## Warum Standard-ERP-Anbieter das Problem nicht lösen

Standard-ERPs wurden für einen anderen Anwendungsfall gebaut. Ihr Datenmodell kennt SKUs und Bestände — fungible Einheiten, die alle denselben Wert haben. Artikel-individuelle Kostenhistorie ist nicht vorgesehen, weil sie im linearen Handel nicht nötig ist.

Auf dieses Fundament lässt sich schwerlich aufbauen. Keine Add-On-Lösung kann den Kern des Problems lösen, wenn das Kern-Datenmodell Einzelartikel als Spezialfall und nicht als Normalfall behandelt.

Das ist kein Fehler dieser Systeme — sie tun, wofür sie gebaut wurden. Es ist eine strukturelle Inkompatibilität mit dem Kreislaufbetrieb.

## Was das für die Entscheidung bedeutet

Für einen Kreislaufbetrieb, der seine Marge ernst nimmt, ist die Frage nicht «Welches ERP ist am günstigsten?» — sondern «Welches ERP kann mir sagen, was ein Artikel tatsächlich gekostet hat und was er tatsächlich gebracht hat?»

Solange die Antwort «keines» ist, arbeitet man mit Schätzungen. Und Schätzungen in der Buchhaltung sind, langfristig gesehen, kein tragfähiges Fundament.
