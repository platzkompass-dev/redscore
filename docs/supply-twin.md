# Vorrats-Zeitmaschine

Im eingeloggten Bereich Vorräte: interaktive, rein lokale Was-wäre-wenn-Rechnung auf Grundlage der gespeicherten Haushaltsgröße sowie Wasser- und Lebensmittelbestände. Keine neue API, keine Environment Variables und keine Datenbankmigration.

## Bedienung

- Szenario ohne Einkauf oder zusätzlich ohne Herd. Beim Herd-Ausfall muss der Nutzer selbst den nutzbaren Lebensmittelanteil auswählen; es wird kein Anteil erfunden.
- Bis zu sechs zusätzliche Personen simulieren.
- Wasser und Lebensmittel hypothetisch ergänzen; beide Reichweiten und der erste Engpass werden unmittelbar neu berechnet.
- Einzelschritte zeigen den marginalen Zeitgewinn. Der gemeinsame Zielplan ergänzt beide Bestände bis Tag 3, 7 oder 10.
- Zeitregler zeigt den verbleibenden Vorrat am gewählten Zeitpunkt. Mobile Vorschau bleibt bei den Reglern sichtbar.

## Rechenmodell

`dist/supply-twin.js` trennt die reine Funktion `supplyTwinModel` von Markup und DOM-Aktualisierung. Wasserverbrauch: zwei Liter pro Person und Tag. Erfasste Lebensmittel-Haushaltstage werden in Personentage umgerechnet und auf die simulierte Personenzahl verteilt. Ohne Herd zählt nur der explizit geschätzte Anteil. Ergänzungen gelten als ohne Kochen nutzbar und ab Tag 0 verfügbar. Der kleinere Wert aus Wasser- und Lebensmittelreichweite bestimmt den ersten rechnerischen Engpass.

Fehlende Bestände bleiben unbekannt, erfasste Null bleibt Null. Keine automatische Verrechnung eigener Vorratseinträge ohne passende Verbrauchseinheit. Tierbedarf, Medikamente, Hygiene und besondere Bedürfnisse sind außerhalb dieses Modells.

## Zustand und Offline

Der hypothetische Plan bleibt nur im Arbeitsspeicher und wird beim Wechsel von Konto, Haushaltsgröße oder realem Wasser-/Lebensmittelbestand zurückgesetzt. Er verändert weder gespeicherte Vorräte noch RedScore und löst keinen Account-Speichervorgang aus. Der Service Worker nimmt das neue Modul in den Offline-App-Shell auf. Für Offline-Nutzung müssen App und Bestände zuvor geladen worden sein.

## Prüfung am 28.10.2026

- Modelltests: unbekannt/Null, Haushaltswechsel, Gäste, Herd-Ausfall, kombinierte Ergänzungen, Zielplanung, Zeitreise und Unveränderlichkeit der Eingaben.
- Client-Test: delegierte Bedienung verändert weder tatsächliche Bestände noch Score; geänderte reale Bestände verwerfen den Plan.
- Isolierter Edge-Test mit synthetischem Konto: 360, 390, 768 und 1440 Pixel; kein horizontaler Seitenüberlauf; DE/EN; Offline-Bedienung; Tastaturfokus; keine JavaScript-Fehler und keine Account-Schreibzugriffe durch die Simulation.
- Der Tablet-Überlauf der bisherigen Vorratsliste wurde bei dieser Prüfung behoben.

Ausführen: `node --test` sowie `PLAYWRIGHT_PACKAGE=<Pfad zu Playwright> node scripts/qa-supply-twin.mjs` bei laufendem `node scripts/qa-server.mjs` auf Port 4181. Die Browserprüfung nutzt nur ein isoliertes Headless-Edge-Fenster und schließt es anschließend.
