# Einwilligung und Statistik

`dist/analytics.js` und `dist/consent.css` gelten für Portal und DE-/EN-Ratgeber. Gleich gestaltete Buttons, keine Vorauswahl, jederzeitige Änderung über den Footer. Notwendige Anmeldung, Sprache und Offline-Vorsorge funktionieren unabhängig davon.

Version 2 speichert nur die Entscheidung und den Zeitpunkt in `redscore-consent-v2` für 180 Tage. Alte, abgelaufene und fehlerhafte Entscheidungen erlauben keine Statistik. Neue Zustimmung erforderlich, weil der bisherige Vercel-Tracker durch einen eigenen Zähler ersetzt wird.

Nur nach Zustimmung wird eine Tab-Kennung erzeugt und eine erlaubte öffentliche Route an `/api/visit` gesendet. Keine externen Statistikskripte oder Werbepixel. Ein Widerruf löscht die Kennung und stoppt weitere Requests, auch tabübergreifend. Bereits verarbeitete Tageszahlen werden nicht rückwirkend verändert. Details und Grenzen: [traffic-statistics.md](traffic-statistics.md).

`scripts/qa-consent.mjs` fängt alle Requests lokal ab; keine Testaufrufe in der Produktionsstatistik. Geprüft werden Zustimmung, Ablehnung, Widerruf, Ablauf, private Ansichten, Session-Wiederverwendung und mobile Darstellung. API-Validierung und Rate-Limit: `test/visit.test.mjs`.

Der Code ist keine rechtliche Zertifizierung. Bestehende Hosting- und Kontoauftragsverarbeitung bleibt separat zu beurteilen.
