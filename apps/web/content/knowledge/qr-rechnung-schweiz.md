---
title: "QR-Rechnung: Was Kreislaufbetriebe wissen müssen"
tag: "Compliance"
readTime: "5 min"
excerpt: "Seit 2022 gesetzlich vorgeschrieben. Wer braucht QR-Rechnungen? Pflichtangaben, MWST-Besonderheiten, Rappen-Rundung — und wie Kivvi das automatisiert."
lead: "Seit 2022 gesetzlich vorgeschrieben: Rechnungen brauchen einen QR-Einzahlungsschein. Was Kreislaufbetriebe über Pflichtangaben, MWST-Besonderheiten und Rappen-Rundung wissen müssen."
published: true
order: 6
---

## Was ist die QR-Rechnung?

Die QR-Rechnung ersetzt seit 2022 den roten und orangen Einzahlungsschein vollständig. Sie besteht aus der eigentlichen Rechnung (Papier oder PDF) und einem standardisierten QR-Einzahlungsschein (Empfangsschein + Zahlteil).

Der QR-Code enthält alle Zahlungsinformationen maschinenlesbar: IBAN, Empfänger, Betrag, Referenznummer. Banken und Buchhaltungssoftware können eingehende Zahlungen damit automatisch zuordnen — das spart erheblichen manuellen Abgleichsaufwand.

## Wer braucht sie?

Jedes Schweizer Unternehmen, das Rechnungen an andere Unternehmen oder Privatkunden stellt, sollte QR-Rechnungen ausstellen. Es gibt keine gesetzliche Pflicht für eine Mindestsumme — aber de facto ist es der Standard. Ohne QR-Slip können viele Kunden die Zahlung nicht mehr digital verarbeiten.

| Situation                                       | QR-Rechnung nötig?                                                         |
| ----------------------------------------------- | -------------------------------------------------------------------------- |
| Einzelhandel, Barzahlung                        | Nein — Kassenbon reicht                                                    |
| Rechnung an Privatperson (Zahlungsziel 30 Tage) | Ja — QR-Slip dringend empfohlen                                            |
| Rechnung an Firmenkunden                        | Ja — ohne QR oft Verarbeitungsprobleme beim Kunden                         |
| Kleinbetragsrechnungen unter CHF 1              | Technisch nicht unterstützt — aber solche Rechnungen sind sowieso unüblich |

## Pflichtangaben

Der QR-Code auf der Rechnung muss folgende Felder enthalten — alle anderen Felder sind optional:

| Feld                                 | Hinweis                                                   |
| ------------------------------------ | --------------------------------------------------------- |
| IBAN                                 | Schweizer oder Liechtensteinisches Konto (CH.. oder LI..) |
| Empfänger (Name + Adresse)           | Exakt wie auf dem Bankkonto registriert                   |
| Betrag                               | Optional — kann auch leer bleiben (Betrag offen)          |
| Währung                              | Nur CHF oder EUR                                          |
| QR-Referenz oder SCOR-Referenz       | Für automatische Zahlungszuordnung — dringend empfohlen   |
| Zusatzinformationen (Unstrukturiert) | Z.B. Rechnungsnummer, max. 140 Zeichen — optional         |

## MWST bei Kreislaufbetrieben

Die Mehrwertsteuer spielt bei Kreislaufbetrieben eine besondere Rolle. Gespendete Waren haben keine Vorsteuerbasis — Sie zahlen beim Eingang keine MWST und können daher auch keine Vorsteuer abziehen. Das bedeutet: Der gesamte Verkaufserlös ist MWST-pflichtig (kein Abzug).

Für Vereine und gemeinnützige Organisationen: Die MWST-Pflicht gilt ab CHF 100'000 Jahresumsatz. Unter dieser Schwelle sind Sie nicht steuerpflichtig — müssen aber auch keine Vorsteuer geltend machen. Auf der Rechnung erscheint dann kein MWST-Betrag und keine Steuernummer.

**Wichtig: Margenbesteuerung**

Händler, die gebrauchte Waren von Privatpersonen kaufen (nicht geschenkt bekommen), können unter bestimmten Bedingungen die Margenbesteuerung anwenden: MWST wird nur auf die Marge (Verkaufspreis minus Einkaufspreis) erhoben. Für Kreislaufbetriebe mit Spenden-Intake ist dies in der Regel nicht anwendbar. Bei Unsicherheit: Rücksprache mit dem kantonalen Steueramt.

## Rappen-Rundung: CHF 0.05

In der Schweiz werden CHF-Beträge auf 5 Rappen gerundet (0.00, 0.05, 0.10, ...). Das gilt für den Gesamtbetrag auf der Rechnung, nicht für einzelne Positionen. Die Rundungsdifferenz ist als separate Position oder als Fussnote auszuweisen.

```
Laptop CHF 189.00
MWST 8.1% CHF 15.31
Zwischentotal CHF 204.31
Rundung CHF +0.04

Gesamtbetrag CHF 204.35
```

Kivvi berechnet die Rappen-Rundung automatisch und weist sie korrekt aus. Sie müssen nichts manuell adjustieren.

## Kivvi automatisiert QR-Rechnungen

Jede Rechnung in Kivvi generiert automatisch einen gültigen QR-Einzahlungsschein. Die Referenznummer wird aus Firmennummer und Rechnungsnummer gebildet — eindeutig und maschinenlesbar. Die IBAN kommt aus Ihren Bankkonten-Einstellungen.

Der PDF-Export enthält Rechnung und QR-Slip auf einer Seite, direkt druckfertig. Bei digitaler Zustellung reicht der PDF-Anhang — der Kunde kann den QR-Code mit seiner Banking-App einlesen und mit einem Klick zahlen.
