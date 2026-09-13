# RedScore Live-Lage backend

Die Live-Lage nutzt das verbundene Supabase-Projekt als zentralen Import- und
Auslieferungsdienst:

1. `live-lage-import` wählt fällige, aktivierte Quellen aus `news_sources`.
2. Ein quellenspezifischer Adapter ruft ausschließlich freigegebene HTTPS-Endpunkte ab.
3. Inhalte werden validiert, in Klartext umgewandelt und normalisiert.
4. Ähnliche Ereignisse werden gruppiert; jede Originalquelle bleibt in
   `news_event_sources` nachvollziehbar.
5. `live-lage` liefert über abgesicherte RPCs ein bereinigtes und nach persönlicher
   Relevanz sortiertes Lesemodell aus.
6. Die Website erreicht die Edge Function nur über den gleichnamigen lokalen
   Server-Endpunkt `/api/live-lage`; kein API-Schlüssel liegt in `dist/`.

Die Quellen werden zentral und nicht pro Benutzer abgerufen. Der
`redscore-live-lage-import-every-minute`-Job startet minütlich. Das Feld
`polling_interval_seconds` jeder Quelle entscheidet, ob der Adapter tatsächlich
ausgeführt wird.

## Quellen im MVP

- DWD WarnWetter JSONP/JSON (amtlich, Abrufintervall 60 Sekunden)
- GDACS GeoRSS (amtliche internationale Kooperation, Abrufintervall 300 Sekunden)

Es werden weder HTML-Scraping noch erfundene Development-Meldungen verwendet.

## Lokale Serverkonfiguration

- `PORT` – standardmäßig `4173`
- `SUPABASE_URL` – URL des verbundenen Projekts
- `SUPABASE_ANON_KEY` – veröffentlichbarer/Anon-Key, ausschließlich im lokalen Server

Die Edge Functions erhalten `SUPABASE_URL`, `SUPABASE_ANON_KEY` und
`SUPABASE_SERVICE_ROLE_KEY` automatisch von Supabase. Der Service-Role-Key darf nie
in `dist/` oder in einem Client-Bundle stehen.

Weitere Architektur- und Erweiterungshinweise stehen in `docs/live-lage.md`.
