# RedScore

RedScore ist ein Katastrophenvorbereitungssystem für Bürgerinnen und Bürger. Die
Website verbindet einen transparenten persönlichen Vorsorgestand mit Vorräten,
Warnschutz, verifizierten Orten, Notfallwissen und einer zentral aktualisierten
Live-Lage.

- Produktdomain: https://www.redscore.de
- Repository: https://github.com/platzkompass-dev/redscore
- MVP-Testprofil: Nicole Mrozinski, 2 Erwachsene, 1 Kind, 1 Hund,
  Freiburg (Elbe), Flecken, Niedersachsen

Es werden keine erfundenen Scores, Bestände, erledigten Aufgaben, Schutzräume oder
Live-Meldungen angezeigt. Persönliche Vorsorgeeingaben bleiben lokal im Browser.
Ein optionales Referenzfoto wird nur nach ausdrücklicher Auswahl an die serverseitige
Bildpersonalisierung übertragen; RedScore speichert das Original nicht serverseitig.
Die fertigen Motive werden lokal in IndexedDB abgelegt.

## Lokal starten

1. `.env.example` als `.env.local` ausfüllen.
2. `npm run dev` ausführen.
3. `http://127.0.0.1:4173` öffnen.

Der lokale Node-Server liefert die statische Website aus und vermittelt
`/api/live-lage` serverseitig an Supabase sowie `/api/personalize-image` an den
konfigurierten Bilddienst. Dadurch befinden sich keine API-Schlüssel im Frontend-Bundle.

## Deployment

Vercel liefert `dist/` über das Edge-CDN aus und betreibt die API-Endpunkte als
serverseitige Functions. Das Projekt benötigt dort `SUPABASE_URL` und
`SUPABASE_ANON_KEY`. Die Bildpersonalisierung nutzt bevorzugt das projektgebundene
Vercel AI Gateway über den automatisch bereitgestellten OIDC-Token (in Functions
über den Header `x-vercel-oidc-token`); als
Modell dient standardmäßig `openai/gpt-image-2`. `AI_GATEWAY_IMAGE_MODEL` kann das
Modell überschreiben. `OPENAI_API_KEY` und `OPENAI_IMAGE_MODEL` bleiben nur als
optionaler lokaler Fallback erhalten. Pushes auf `main` lösen nach aktivierter
GitHub-Integration automatisch ein Produktionsdeployment aus. Die kanonische Domain
ist `https://www.redscore.de`; `redscore.de` wird auf diese Adresse umgeleitet.

## Struktur

- `dist/`: installierbare responsive Website/PWA
- `server.mjs`: statischer Server und Live-Lage-Proxy
- `supabase/migrations/`: Datenmodell, abgesicherte Leseroutinen und Scheduler
- `supabase/functions/`: Import- und Read-Edge-Functions mit Quellenadaptern
- `docs/live-lage.md`: Architektur, Deduplizierung, Relevanz und Produktionshinweise
- `assets/branding/`: verbindliches RedScore-Logo für Website, App und Kommunikation

## Personalisierte Vorsorge-Motive

Nach Auswahl eines JPEG-, PNG- oder WebP-Fotos entfernt der Browser beim Skalieren
Metadaten und startet vier nacheinander ausgeführte Backend-Jobs: Dashboard, Vorräte,
Warnschutz und Wissen. Der Fortschrittsbalken springt erst weiter, wenn das jeweilige
Motiv tatsächlich vom Backend geliefert wurde. Das Frontend verwendet niemals das
Referenzfoto selbst als Katastrophenhintergrund.

Der Endpunkt akzeptiert nur dieselben vier serverseitig definierten Szenarien, prüft
Dateityp, Dateisignatur, Größe und Same-Origin und liefert WebP-Bilder ohne Cache aus.
Pro Anschluss sind in einer warmen Function-Instanz höchstens acht Bildaufträge pro
Stunde zulässig. Auf Vercel aktiviert ein vorhandener OIDC-Zugang den Bilddienst
automatisch; `PERSONALIZATION_ENABLED=false` kann ihn jederzeit vollständig sperren.
Für eine öffentliche Mehrnutzer-Version muss dieses vorläufige Limit durch ein
dauerhaftes, nutzerbezogenes Rate-Limit zusammen mit echter Authentifizierung ersetzt
werden.

## Quellenbasis des MVP

Der Live-Lage-Import verwendet ausschließlich strukturierte öffentliche Quellen:

- Deutscher Wetterdienst (DWD)
- Global Disaster Alert and Coordination System (GDACS)

Weitere Quellen werden über das Adapter-System ergänzt. Im Ereignisfall haben immer
amtliche Warnungen und behördliche Anweisungen Vorrang.
