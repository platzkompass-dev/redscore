# Besucherstatistik RedScore

Eigener Zähler für öffentliche Seiten, mit der bestehenden Supabase-Datenbank und ohne neue API-Schlüssel.

## Messung und Grenzen

- Erst nach **Statistik erlauben**, Consent-Version 2. Frühere Vercel-Zustimmungen werden nicht übernommen.
- Seitenaufrufe: Startseite, Angebote und acht DE-/EN-Ratgeber. Eingeloggte Ansichten, Authentifizierung und Rechtstexte werden nicht gemessen.
- Besuche: tägliche Browser-Tab-Sitzungen. Zufallskennung in `sessionStorage`, nach 30 Minuten Inaktivität erneuert und bei Widerruf gelöscht. Mehrere Tabs können mehrere Besuche bedeuten. **Keine eindeutigen Personen, keine registrierten Nutzer.**
- Keine Namen, E-Mail-Adressen, Haushaltsdaten, Bestände, Referrer, URL-Parameter oder IP-Adressen in den Statistikdatensätzen. Technische Netzwerkverarbeitung und kurzzeitige IP-basierte Rate-Limits im Server-Arbeitsspeicher bleiben erforderlich.
- Tageswechsel Europe/Berlin. Serverseitig täglich wechselnde SHA-256-Hashes, keine Rohkennung. Hashes spätestens nach drei Tagen gelöscht, Tageszahlen nach 400 Tagen.
- Keine rückwirkende Rekonstruktion. Ablehnung, Blocker, Offline-Betrieb und Ausfälle führen zu Untererfassung. Kein manipulationssicherer Abrechnungszähler.

## Datenweg

`dist/analytics.js` → `/api/visit` → Edge Function `public-visit` → RPC `record_redscore_visit` → privates Schema `redscore_private`.

Payload exakt `{route, session, consent: 2}`, maximal 1024 Byte. Routen-Whitelist auf allen Ebenen; Zeitstempel vom Server. Keine öffentlichen Lese-Endpunkte. Tabellen haben RLS und keine Rechte für `anon`/`authenticated`; RPC nur `service_role`, ohne SECURITY DEFINER. Edge-JWT-Prüfung aktiviert. Service-Role-Schlüssel bleibt in Supabase.

Vercel nutzt vorhandene Servervariablen `SUPABASE_URL` und `SUPABASE_ANON_KEY` (Legacy-Anon-JWT). `SUPABASE_PUBLISHABLE_KEY` ist als Alternative im Proxy vorgesehen; für diesen muss die Gateway-Unterstützung bei aktivierter JWT-Prüfung vor Umstellung geprüft werden. Keine Schlüssel im Browser. Fehler beeinträchtigen die Seite nicht. Keine Offline-Warteschlange.

## Spätere Berichte

Mit autorisiertem Supabase-SQL-Zugriff `scripts/traffic-report.sql` ausführen. `route='*'` enthält die Gesamtsumme; niemals mit einzelnen Routen addieren. Besuche je Route überlappen. Zeitraum und Zustimmungslimit angeben; Besucher nicht mit Registrierungen gleichsetzen.

## Inbetriebnahme

1. Aktive Datenbank: Basismigration und `20261104115701_activate_public_visit_statistics.sql` anwenden, Rechte und Cron prüfen.
2. Edge Function `public-visit` samt `_shared/visits.js` mit JWT-Prüfung deployen.
3. Git-Deployment abwarten und Erfassung bis in die Datenbank testen. Eigene Testereignisse anschließend entfernen.

Aktivierung am 04.11.2026: Datenbank nach Zahlung wieder ACTIVE_HEALTHY. Abschlussmigration angewandt, Edge Function `public-visit` Version 2 mit JWT-Prüfung aktiv. Schreibzugriff der Service-Rolle, Deduplizierung und tägliche Besuchszählung mit `scripts/verify-traffic.sql` in einer zurückgerollten Transaktion erfolgreich geprüft. Keine Statistik-Leserechte für öffentliche oder angemeldete Nutzer; tägliche Löschung aktiv. Erfassung beginnt mit Veröffentlichung dieses Git-Stands. Vorherige Seitenaufrufe sind nicht rekonstruierbar.

141 automatisierte Tests und Browserprüfung der Einwilligung bestanden: kein Request vor Zustimmung, Widerruf auch tabübergreifend, Sitzung bleibt bei Neuladen erhalten, URL-Parameter und Kontoansichten ausgeschlossen. Die Produktionsprüfung verwendet eine eigene Zufallskennung; nur deren Testeinträge werden anschließend aus der Statistik entfernt.

## Missbrauchsgrenzen

60 Anfragen pro Minute/IP im warmen Vercel-Prozess (kein verteiltes Limit), 200 Ereignisse pro Tages-Sitzung in SQL, zehn Sekunden Deduplizierung derselben Route. Bei größerer Reichweite verteiltes/WAF-Limit ergänzen und Ingestion überwachen. Öffentliche Ingestion kann von Bots nachgebildet werden; Zufallskennungen sind keine Authentifizierung.
