# SafePlaces: Ortsdaten und Ausfallsicherheit

Stand: 26. Oktober 2026.

## Behobener Ausfall

Die produktive Anfrage für `21729 Freiburg (Elbe)` lieferte HTTP 503 nach rund
neun Sekunden. Nominatim erkannte den Ort korrekt; die bisher einzige
Overpass-Instanz meldete HTTP 502 wegen ausgelasteter Query-Worker bzw. lief in den
Timeout. Die früheren Layout-Tests mit Provider-Testdaten deckten das nicht ab.

Die korrigierte Funktion lieferte mit echten Quellen HTTP 200 und 40 Orte,
darunter Polizeistation Freiburg (Elbe), Edeka, Adler Apotheke und Freiwillige
Feuerwehr Freiburg (Elbe). Das ist eine konkrete Stichprobe, keine Vollständigkeits-
oder Verfügbarkeitsgarantie.

## Ablauf

1. PLZ / Ort werden über den bestehenden PlanS-/RedScore-API-Endpunkt
   `/api/places` geocodiert. Nur vorgegebene HTTPS-Hosts, keine frei übergebenen URLs.
2. Overpass erhält eine auf relevante Infrastruktur im 20-km-Umkreis begrenzte
   Anfrage. Timeout-/Fehlermeldungen in JSON werden auch bei HTTP 200 erkannt.
3. Bei Fehlern übernimmt Photons dokumentierte Umgebungssuche. Kategorien werden
   in einem einzigen `include`-Parameter als ODER-Liste übergeben. Mehrere
   `include`-Parameter wären UND-Bedingungen und würden die Suche fälschlich leeren.
4. Beide Adapter liefern dasselbe bestehende Ortsmodell. Koordinaten, OSM-IDs,
   erlaubte Kategorien und tatsächliche Entfernung werden geprüft. Es werden
   höchstens 40 Treffer angezeigt; keine erfundenen Anlaufstellen.

Ein Upstream-Aufruf dauert höchstens vier Sekunden, die gesamte Sucharbeit hat
ein Budget von 17 Sekunden innerhalb der bestehenden 20-Sekunden-Function.
Redirects sind deaktiviert, Antworten größenbegrenzt. Keine API-Schlüssel nötig.

## Cache und Rückfall

- HTTP-CDN-Cache: erfolgreiche Listen 30 Minuten, Teilantworten 30 Sekunden.
- Begrenzte Warm-Instance-Caches (max. je 100 Einträge): Ortsmittelpunkte 24 Stunden,
  erfolgreiche Listen 30 Minuten; Anfragen desselben Orts werden zusammengefasst.
- Nominatim-Aufrufe werden je Function-Instanz seriell mit mindestens 1,1 Sekunden
  Abstand ausgeführt. Kein Autocomplete, kein Hintergrund-Scan von Orten.
- Scheitern beide Ortsdienste, werden vorhandene Listen höchstens 24 Stunden als
  `placesStatus: stale` mit ihrem **ursprünglichen** Zeitstempel zurückgegeben.
- Ohne Liste bleibt ein erfolgreich ermittelter Kartenmittelpunkt verfügbar:
  `placesStatus: unavailable`, `generatedAt: null`. Das ist kein bestätigter leerer
  Suchbefund. Die UI zeigt weiterhin die Karte und erklärt den Listenausfall.
- Der Browser bewahrt eine vorhandene Liste bei fehlgeschlagener Aktualisierung
  auf und speichert den Status mit. Kein neuer Aktualitätszeitpunkt wird erfunden.

Die Caches im Function-Prozess überleben keine Cold Starts; sie ersetzen keine
dauerhafte Datenbank. Vor größerer Nutzung sind zentraler Cache, globales
Request-Limit über alle Instanzen und ein vertraglich geeigneter Datenbetrieb
weiterzuentwickeln. Öffentliche Dienste haben keine zugesicherte Verfügbarkeit.

## Quellen und Regeln

- [Nominatim-Nutzungsregeln](https://operations.osmfoundation.org/policies/nominatim/):
  maximal eine Anfrage pro Sekunde für die gesamte Anwendung, identifizierbarer
  User-Agent, Attribution und Caching. Die instanzlokale Queue allein ist kein
  globaler Rate-Limiter für eine skalierte Installation.
- [Photon-Projekt und Nutzungsbedingungen des Demo-Dienstes](https://github.com/komoot/photon):
  maßvolle Nutzung; keine Verfügbarkeitsgarantie, größere Nutzung selbst betreiben.
- [Photon-API](https://github.com/komoot/photon/blob/master/docs/api-v1.md) und
  [Kategorie-Filter](https://github.com/komoot/photon/blob/master/docs/categories.md).
- [OSM-Overpass-Dokumentation](https://wiki.openstreetmap.org/wiki/Overpass_API).

Die Datenschutzhinweise nennen Nominatim, Overpass, Photon und die Verbindung der
eingebetteten OSM-Karte. An Photon gehen Ortsmittelpunkt und Suchkategorien, keine
Kontodaten, Haushaltszusammensetzung oder genaue Wohnadresse.

## Prüfungen

`test/places.test.mjs`: Überlastung, Provider-Rückfall, ungültige Koordinaten,
Teilantworten, Cache-Übernahme / Ablauf und gemeinsame parallele Anfragen.
`test/client-state.test.mjs`: Karte bei Listenausfall, keine falsche Nulltreffer-
Anzeige und Erhalt gespeicherter Orte samt Alter.

`scripts/qa-places-recovery.mjs` verwendet einen einzigen isolierten Edge-Prozess,
synthetische Authentifizierung und die echte Ortsfunktion mit echten Quellen.
Anschließend werden Ausfälle gezielt im Test ausgelöst. Kein echtes Konto wird
verändert. Start: `node scripts/qa-server.mjs`, anschließend das QA-Skript mit dem
installierten Playwright-Paket ausführen. Testserver danach beenden.
