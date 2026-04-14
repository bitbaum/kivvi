---
title: "Die Kreislaufwirtschaft hat ein Software-Problem"
tag: "Einblicke"
readTime: "12 min"
excerpt: "62 Millionen Tonnen Elektroschrott jährlich. Ein Markt von EUR 102 Milliarden. Regulierung, die ab 2026 greift. Und kein ERP, das den Kreislauf wirklich abbildet."
lead: "Der Markt für Secondhand und Refurbishing wächst. Die Regulierung verschärft sich. Was fehlt, ist die Software: kein bestehendes ERP deckt den vollständigen Kreislauf von Intake bis Impact-Bericht nativ ab — und das kostet die Branche."
published: true
order: 1
---

## Was ein Kreislaufbetrieb wirklich tut

Um die Software-Lücke zu verstehen, muss man zunächst verstehen, was der Betrieb eines Reparatur-, Refurbishing- oder Secondhand-Betriebs tatsächlich beinhaltet — denn er unterscheidet sich grundlegend von dem, was jedes bestehende ERP zu handhaben gedacht ist.

Ein linearer Betrieb kauft Waren zu bekanntem Zustand und Preis ein, verkauft sie und verwaltet den Bestand als Mengen. Das ERP zählt Einheiten und erstellt Rechnungen.

Ein Kreislaufbetrieb tut etwas grundlegend anderes. Er nimmt Waren unbekannten Zustands, unbekannter Herkunft und unbekannten Werts an. Eine Spende kommt herein. Es könnte ein funktionstüchtiger Laptop sein, ein defekter — oder etwas dazwischen. Bevor er verkauft werden kann, muss er bewertet werden: Wie ist der Akkuzustand? Besteht der Speicher den SMART-Diagnosetest? Wurden Daten sicher gelöscht? Welchen Zustandsgrad erhält er — wie neu, gut, mittel, schlecht oder nur für Teile?

Dann muss möglicherweise repariert werden. Die Reparatur hat Kosten. Die Reparatur hat Stunden. Sie kann gelingen oder scheitern. Ein Gerät, das die Reparatur nicht besteht, wird zur Teilegewinnung oder zum Recycling weitergeleitet statt in den Verkauf.

Erst nach all dem beginnt die klassische ERP-Geschichte: Preis festlegen, inserieren, verkaufen, Rechnung ausstellen.

Das bestehende Software-Ökosystem beherrscht die letzten drei Schritte gut. Die ersten sieben — Intake, Zustandsbewertung, Testing, Routing, Reparatur, Datenlöschung, Nachtesting — werden durch Tabellenkalkulationen, Papierformulare und institutionelles Gedächtnis abgedeckt.

## Warum jede bestehende ERP-Lösung scheitert

Die ERP-Anbieter der Welt haben diesen Workflow weitgehend nicht adressiert — jeder aus strukturellen Gründen.

**Bexio** ist das dominierende Schweizer KMU-Buchhaltungsprodukt mit über 100.000 Betrieben und 1.300 zertifizierten Treuhänderpartnern. Für einen Schweizer Dienstleistungs- oder Einzelhandelsbetrieb ist es hervorragend. Aber es kennt kein Einzelartikel-Tracking — der Bestand wird als fungible Mengen verwaltet. Ein Brockenhaus, das 500 gespendete Artikel unterschiedlichen Zustands verwaltet, kann diese nicht auf Artikelebene unterscheiden. Kein Zustandsgrad, keine Reparaturhistorie, kein individueller Artikellebenszyklus.

**Odoo** kommt in der Allzweck-Kategorie am nächsten. Es hat ein Reparaturmodul, das Teile-Ein und -Aus, Arbeitskosten und Gerätehistorie abdeckt. Aber das Modul geht von einem bekannten Produkt aus, das gegen einen bekannten Reparaturauftrag repariert wird — es gibt kein Intake unbekannter Zustandsgeräte, keine checklisten-basierte Testworkflow, keine Zustandsklassifikation und keine Routing-Logik. Solche Workflows auf Odoo aufzubauen kostet CHF 50.000–150.000 an Customizing.

**Kivitendo** — das in der Schweiz und Deutschland verbreitete Open-Source-ERP — ist die einem funktionierenden System am nächsten kommende Lösung. Es hat ausgereifte Buchhaltung, Einkaufsworkflows und QR-Rechnungsunterstützung. Aber es hat keine Zustandsklassifikation, keine checklisten-basierte Prüfung, keine Reparaturwarteschlange, keinen individuellen Artikellebenszyklus.

Die Reparatursoftware-Kategorie (RepairShopr, Fixably) deckt die Mitte des Workflows gut ab: Intake-Tickets, Technikerenzuweisung, Teile-Tracking. Aber diese Tools sind keine ERPs. Sie erstellen keine QR-Rechnungen, führen keine doppelte Buchführung, kennen kein Differenzbesteuerungsverfahren für Gebrauchwaren und erstellen keine Bilanzen.

Niemand hat diese Teile verbunden.

## Das regulatorische Fenster

Diese Software-Lücke war bereits ein Problem. Sie wird jetzt zu einem dringenden Problem — wegen drei sich überlagernder regulatorischer Veränderungen.

**Die EU-Reparierbarkeitsrichtlinie (2024/1799)** trat am 30. Juli 2024 in Kraft; die Umsetzung durch die Mitgliedstaaten muss bis zum 31. Juli 2026 erfolgen. Sie verpflichtet Hersteller von Smartphones, Laptops, Waschmaschinen und anderen Produkten, Ersatzteile zu angemessenen Preisen innerhalb von 15 Tagen verfügbar zu machen — für 7 bis 10 Jahre nach dem letzten Produktionsdatum.

Die strukturelle Wirkung ist klar: mehr Geräte werden repariert. Ersatzteile, die bisher nicht verfügbar oder zu teuer waren, werden gesetzlich vorgeschrieben. Der Markt für unabhängige Reparaturen wird wachsen. Organisationen, die bereits in diesem Bereich tätig sind — Reparaturcafés, Refurbisher, Brockenhäuser — werden mehr Volumen verarbeiten und höheren Qualitätsanforderungen gegenüberstehen.

Höheres Volumen erfordert bessere Betriebssoftware. "Wir benutzen Tabellenkalkulationen" ist nicht skalierbar.

**Die EU-ESPR-Verordnung (2024/1781)** führt den Digitalen Produktpass ein — einen maschinenlesbaren Datensatz für jedes in der EU verkaufte Produkt, der Materialzusammensetzung, CO₂-Fussabdruck, Reparaturhistorie, Ersatzteilversorgung und Entsorgungshinweise enthält. Der DPP muss während des gesamten Produktlebens aktualisiert werden — auch durch Reparatur- und Aufbereitungsereignisse. Für Elektronik-Produkte gilt die DPP-Anforderung ab 2028–2029.

Das ist strukturell ein ERP-Problem. Ein Refurbisher, der ein Gerät empfängt, testet, repariert und verkauft, muss diese Handlungen so protokollieren, dass der DPP des Geräts aktualisiert wird. Das ist keine Tabellenkalkulationsfunktion. Es ist eine Datenbankfunktion — verbunden mit einem Versorgungskettenprotokoll, nach Seriennummer nachverfolgbar, mit Zeitstempel und verantwortlicher Partei.

**Das nDSG** — das neue Schweizer Datenschutzgesetz, in Kraft seit September 2023 — schafft explizite rechtliche Haftung für Organisationen, die Gebrauchtgeräte mit personenbezogenen Daten verarbeiten. Ein Factory-Reset ist rechtlich nicht ausreichend. Organisationen müssen überprüfbare Datenlöschungszertifikate nach Standards wie NIST SP 800-88 oder DIN 66399 vorweisen. Unter dem nDSG können einzelne Manager und Direktoren persönlich mit bis zu CHF 250.000 für vorsätzliche Verletzungen gebüsst werden.

## Der Impact, der sich nicht messen lässt

Kreislaufwirtschaftsorganisationen haben eine Geschichte zu erzählen, die kein ERP derzeit hilft, zu erzählen.

Ein aufbereiteter Laptop erzeugt 6,34% der CO₂-Emissionen eines neuen Geräts — laut einer von Cranfield University in Auftrag gegebenen Studie für Circular Computing. Jedes aufbereitete Gerät spart ungefähr 316 kg CO₂-Äquivalent und 190.000 Liter Wasser. Ein aufbereitetes Smartphone erzeugt 91,6% weniger CO₂ als ein neues.

Diese Zahlen sind nicht klein. Sie sind real, messbar und werden zunehmend von Fördergebern, Spendern, Kunden und Regulatoren gefordert. Die Schweiz plant, CSRD-ähnliche Nachhaltigkeitsberichtspflichten auf etwa 3.500 Unternehmen auszuweiten — wirksam ab Januar 2026. Organisationen in der Kreislaufwirtschaft werden gebeten werden, ihren Impact nachzuweisen, nicht nur zu beschreiben.

Kein bestehendes ERP berechnet CO₂-Einsparungen pro verkauftem Artikel. Keines aggregiert Reparaturerfolgsraten nach Gerätekategorie. Keines erstellt Impact-Berichte neben Finanzberichten. Das Restart Project, das über 208.000 Reparaturversuche in 31 Ländern protokolliert hat, nutzt ein separates Open-Source-Tool — genau weil kein ERP diese Daten unterstützt.

Ein impact-natives ERP würde CO₂e-Einsparungen automatisch berechnen — unter Verwendung veröffentlichter Lebenszyklusanalysedaten — zum Zeitpunkt des Verkaufs. Es würde eine spendengerichtete Quittung erzeugen, die lautet: "Die 3 Laptops, die Sie letzten Monat gespendet haben, wurden repariert und verkauft. Zusammen haben sie 948 kg CO₂e vermieden — entsprechend 6.000 km Fahren."

Diese Quittung existiert heute nicht.

## Was gute Software für diesen Bereich bedeutet

Die Anforderungen sind nicht exotisch. Sie sind spezifisch und aus ersten Prinzipien ableitbar:

- **Einzelartikel-Tracking als Grundlage.** Jeder Artikel, der in die Organisation kommt, hat eine einzigartige Identität — eine Artikelnummer, einen Zustandsgrad, eine Geschichte.
- **Strukturierte, konsistente Zustandsklassifikation.** "Gut" bedeutet etwas Spezifisches: sichtbare Gebrauchsspuren, 80%+ Akkukapazität. "Wie neu" bedeutet etwas anderes. Die Klassifikation muss gegen einen definierten Standard erfolgen, konsistent über Techniker und Zeit hinweg.
- **Checklisten-gesteuertes, kategoriespezifisches Testing.** Eine Laptop-Checkliste ist nicht dieselbe wie eine Fahrrad-Checkliste. Was getestet wurde, was bestanden hat, was nicht, wer wann getestet hat.
- **Erzwungene Qualitätsgates.** Ein Artikel mit einem fehlgeschlagenen Speicher-SMART-Test sollte nicht für den Verkauf freigegeben werden können. Ein Artikel ohne bestätigte Datenlöschung sollte nicht verkäuflich sein. Diese sind keine Erinnerungen — sie sind strukturelle Beschränkungen.
- **Reparaturkosten-Tracking auf Artikelebene.** Wenn ein Techniker 2,5 Stunden und CHF 40 für Teile aufwendet, muss dieser Aufwand an genau diesen Artikel gebunden sein. Die Marge beim Verkauf wird gegen Anschaffungskosten plus Reparaturkosten berechnet.
- **Schweizer Compliance nativ, nicht als Plugin.** QR-Rechnung, Rappen-Rundung, Schweizer MWST-Sätze inklusive Margenbesteuerung für Gebrauchwaren, 10-jährige Dokumentenaufbewahrung nach OR Art. 958f.
- **Impact als erstklassige Daten.** CO₂ eingespart pro Gerät, Reparaturerfolgsquote nach Kategorie, Geräte aus dem Recycling gerettet — diese Zahlen sollten abfragbar, berichtsfähig und teilbar sein ohne Datenexport.

## Die Chance

Die Schweiz hat 609+ Brockenhäuser. Sie hat eine Regierung, die CHF 12 Millionen zur Unterstützung von Kreislaufwirtschaftsorganisationen zugesagt hat. Sie hat eine der höchsten Pro-Kopf-Elektroschrottquoten Europas und eine Infrastruktur durch SENS und SWICO, die jährlich 121.000 Tonnen verarbeitet.

Europaweit hat Back Market 2.700 Refurbisher-Partner, die EUR 3 Milliarden GMV erwirtschaften — jeder davon verwaltet seinen operativen Workflow ausserhalb jedes integrierten Systems.

Die EU-Reparierbarkeitsrichtlinie tritt im Juli 2026 in Kraft und wird den Reparaturmarkt strukturell ausweiten. Die Anforderung an den Digitalen Produktpass schafft eine Datenmanagementpflicht für jede Organisation, die Gebrauchtelektronik verarbeitet. Das Schweizer nDSG schafft persönliche Haftung für Datenlöschungsversäumnisse.

Der Markt ist real. Die Regulierung kommt. Die Software existiert nicht.

Das ist die Definition eines Problems, das es sich zu lösen lohnt.
