# RedScore-Betrieb · Stand 5. November 2026

## Konto-API

Im separaten Vercel-Projekt `redscore` ist die Regel `RedScore Konto-API: 30 Anfragen pro Minute` veröffentlicht. Bedingung: Request Path entspricht `/api/account`. Schlüssel: IP Address. Fester Zeitraum: 60 Sekunden. Grenze: 30. Aktion: HTTP 429. Die Regel gilt für alle Methoden auf diesem Pfad und benötigt keine neue Servervariable. Projekt war beim Speichern im Hobby-Tarif; kein Tarifwechsel oder kostenpflichtiges Zusatzprodukt wurde bestätigt.

Verifiziert: 30 absichtlich ungültige JSON-Anfragen ergeben HTTP 400; Anfrage 31 wird mit HTTP 429 begrenzt. Keine Registrierungen, Mails oder Kennwörter im Lasttest. Normale Anfragen werden nach Ablauf des Fensters wieder zugelassen. Geteilte IP-Adressen teilen auch diese Grenze. Direkte Aufrufe der Supabase-Auth-API bleiben von deren eigenen Limits abhängig. Die WAF-Regel schützt nicht automatisch alle übrigen API-Pfade.

## Live-Lage

`/api/health` prüft über eine feste Supabase-RPC die tatsächliche Datenbankverbindung und Quellengesundheit. Konfigurationsvariablen allein reichen nicht mehr für ein positives Ergebnis. Der kurze Prozesscache bündelt gleichzeitige Prüfungen. Timeout: drei Sekunden; Fehlerdetails, Schlüssel und Kontodaten werden nicht ausgegeben.

- `healthy`: alle aktivierten Quellen aktuell, keine neueren Abruffehler.
- `degraded`: einzelne Quellen veraltet oder letzter Abruf fehlgeschlagen; HTTP 200, Status im JSON beachten.
- `unavailable`: keine aktivierten oder keine frischen Quellen; HTTP 503. Unerreichbare Datenbank ebenfalls HTTP 503 und `databaseReachable: false`.

Eine Quelle gilt nach dem größeren Wert aus 15 Minuten und drei konfigurierten Abrufintervallen als veraltet. Bewusst deaktivierte Quellen werden nicht berücksichtigt. BMDS und GDELT wurden schon im Oktober gezielt ersetzt; sie sind keine aktuell defekten aktivierten Feeds.

Der Datenbankjob `redscore-live-lage-health` prüft alle fünf Minuten. Private Tabelle `redscore_private.operational_alerts`: Warnung je veralteter Quelle, kritischer Eintrag bei Gesamtausfall. Nach Erholung wird der Eintrag automatisch als erledigt markiert; Wiederholungen erhöhen die Anzahl der Vorfälle. Kein öffentliches Leserecht auf Störungsdetails. Die öffentliche Status-RPC liefert nur zusammengefasste Anzahlen und den letzten erfolgreichen Abgleich.

Das ist interne Störungserfassung. Externe E-Mail-/SMS-Benachrichtigungen oder ein externes Uptime-Monitoring wurden nicht eingerichtet. Für eine spätere Auswertung:

```sql
select alert_key,severity,status,first_seen_at,last_seen_at,resolved_at,occurrences
from redscore_private.operational_alerts order by last_seen_at desc;
```

`scripts/verify-operational-health.sql` prüft einzelne Ausfälle, Gesamtausfall, Erholung und komplett deaktivierte Quellen in einer zurückgerollten Transaktion. Nachrichteninhalte und Benutzerkonten werden nicht verändert.

## Suche

`scripts/submit-indexnow.mjs` meldet ausschließlich die neun öffentlichen kanonischen Sitemap-URLs. Standard ist eine lokale Vorschau; erst `--submit` sendet. Vorher wird die veröffentlichte Domain-Verifikationsdatei geprüft. Keine Kontoseiten, URL-Parameter oder Profile werden eingereicht. Eine Annahme durch IndexNow beweist keine Indexierung oder Platzierung. Google-Search-Console-Berichte sind separat zu prüfen.
