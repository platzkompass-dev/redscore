# RedScore

RedScore ist ein Katastrophenvorbereitungssystem für Bürgerinnen und Bürger. Die
Website verbindet einen transparenten persönlichen Vorsorgestand mit Vorräten,
Warnschutz, verifizierten Orten, Notfallwissen und einer zentral aktualisierten
Live-Lage.

- Produktdomain: https://www.redscore.de
- Repository: https://github.com/platzkompass-dev/redscore
Es werden keine erfundenen Scores, Bestände, erledigten Aufgaben, Schutzräume oder
Live-Meldungen angezeigt. Persönliche Vorsorgeeingaben bleiben offline lokal verfügbar
und werden nach Anmeldung kontogebunden mit Supabase synchronisiert. RedScore fordert
keine privaten Fotos an und führt keine Gesichtsanalyse durch. Das Haushaltsmotiv wird
aus einem vorab geprüften, inklusiven Bildportfolio ausgewählt.

## Lokal starten

1. `.env.example` als `.env.local` ausfüllen.
2. `npm run dev` ausführen.
3. `http://127.0.0.1:4173` öffnen.

Der lokale Node-Server liefert die statische Website aus und vermittelt
`/api/live-lage` sowie `/api/account` serverseitig an Supabase. Dadurch befinden sich
keine API-Schlüssel im Frontend-Bundle.

## Deployment

Vercel liefert `dist/` über das Edge-CDN aus und betreibt die API-Endpunkte als
serverseitige Functions. Das Projekt benötigt dort `SUPABASE_URL` und
`SUPABASE_ANON_KEY` (alternativ `SUPABASE_PUBLISHABLE_KEY`). Pushes auf `main` lösen
nach aktivierter GitHub-Integration automatisch ein Produktionsdeployment aus. Die
kanonische Domain ist `https://www.redscore.de`; `redscore.de` wird auf diese Adresse
umgeleitet.

## Struktur

- `dist/`: installierbare responsive Website/PWA
- `dist/assets/households/`: kuratiertes Haushalts-Bildportfolio
- `server.mjs`: statischer Server, Konto- und Live-Lage-Proxy
- `supabase/migrations/`: Datenmodell, abgesicherte Leseroutinen und Scheduler
- `supabase/functions/`: Import- und Read-Edge-Functions mit Quellenadaptern
- `docs/live-lage.md`: Architektur, Deduplizierung, Relevanz und Produktionshinweise
- `assets/branding/`: verbindliches RedScore-Logo für Website, App und Kommunikation

## Konten und Haushaltsmotive

Supabase Auth übernimmt Registrierung, E-Mail-Bestätigung, Anmeldung und Sitzungen.
`user_profiles` speichert ausschließlich das eigene Profil und die freiwillige
Haushaltskonstellation; `user_app_state` speichert Vorsorgeantworten und Bestände.
Row-Level-Security beschränkt alle Zugriffe auf `auth.uid() = user_id`.
Neben den BBK-orientierten Vorratsgruppen können Nutzer eigene Vorräte mit Kategorie,
Menge, Einheit und Notiz ergänzen. Diese Einträge werden offline vorgehalten und über
`custom_supplies` kontogebunden synchronisiert, fließen aber nicht in den RedScore ein.

Bei der Ersteinrichtung wird jede erwachsene Person freiwillig als Frau, Mann,
divers/nichtbinär oder ohne Angabe erfasst. Kinder und Haustiere werden als Anzahl bzw.
Art und Anzahl gespeichert. Die Auswahl des Bildmotivs bildet nur die angegebene
Personenkonstellation ab, nicht Beziehungsstatus oder sexuelle Orientierung. Bei einer
nicht exakt abgedeckten Konstellation wird ein neutrales Motiv statt einer falschen
Darstellung verwendet.

## Quellenbasis des MVP

Der Live-Lage-Import verwendet ausschließlich strukturierte öffentliche Quellen:

- Deutscher Wetterdienst (DWD)
- Global Disaster Alert and Coordination System (GDACS)

Weitere Quellen werden über das Adapter-System ergänzt. Im Ereignisfall haben immer
amtliche Warnungen und behördliche Anweisungen Vorrang.
