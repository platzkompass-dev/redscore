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
Live-Meldungen angezeigt. Persönliche Eingaben und das optionale Familienfoto bleiben
im aktuellen MVP lokal im Browser.

## Lokal starten

1. `.env.example` als `.env.local` ausfüllen.
2. `npm run dev` ausführen.
3. `http://127.0.0.1:4173` öffnen.

Der lokale Node-Server liefert die statische Website aus und vermittelt
`/api/live-lage` serverseitig an Supabase. Dadurch befindet sich kein API-Schlüssel
im Frontend-Bundle.

## Deployment

Vercel liefert `dist/` über das Edge-CDN aus und betreibt `api/live-lage.js` als
serverseitigen Proxy. Das Projekt benötigt dort die serverseitigen Variablen
`SUPABASE_URL` und `SUPABASE_ANON_KEY`. Pushes auf `main` lösen nach aktivierter
GitHub-Integration automatisch ein Produktionsdeployment aus. Die kanonische Domain
ist `https://www.redscore.de`; `redscore.de` wird auf diese Adresse umgeleitet.

## Struktur

- `dist/`: installierbare responsive Website/PWA
- `server.mjs`: statischer Server und Live-Lage-Proxy
- `supabase/migrations/`: Datenmodell, abgesicherte Leseroutinen und Scheduler
- `supabase/functions/`: Import- und Read-Edge-Functions mit Quellenadaptern
- `docs/live-lage.md`: Architektur, Deduplizierung, Relevanz und Produktionshinweise
- `assets/branding/`: verbindliches Wappen für Website, App und Kommunikation

## Quellenbasis des MVP

Der Live-Lage-Import verwendet ausschließlich strukturierte öffentliche Quellen:

- Deutscher Wetterdienst (DWD)
- Global Disaster Alert and Coordination System (GDACS)

Weitere Quellen werden über das Adapter-System ergänzt. Im Ereignisfall haben immer
amtliche Warnungen und behördliche Anweisungen Vorrang.
