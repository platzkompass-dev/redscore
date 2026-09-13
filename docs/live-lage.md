# RedScore Live-Lage – MVP

## Datenfluss

```text
DWD / GDACS -> Source Adapter -> Supabase Import Function -> PostgreSQL
                                                    |
Browser <- /api/live-lage <- RedScore-Server <- Read Function + Relevanzmodell
```

Externe Quellen werden genau einmal zentral abgefragt. Nutzergeräte greifen nur auf
die RedScore-API zu. Der Importjob läuft minütlich; einzelne Quellen besitzen eigene,
konfigurierbare Intervalle.

## Datenmodell

- `news_sources`: Adapter, Typ, Vertrauensstufe, Allowlist, Intervall und Abrufstatus.
- `news_events`: normalisiertes Ereignis einschließlich Kategorie, Schweregrad,
  Verifizierung, Ort, Geodaten, geografischem Umfang und betroffenem Radius.
- `news_event_sources`: n:m-Zuordnung aller Originalmeldungen zu einem Ereignis.
- `news_sync_runs`: nachvollziehbare Importläufe und Fehler.

Auf allen Tabellen ist RLS aktiv. Direkter Tabellenzugriff für `anon` und
`authenticated` ist entzogen. Das Frontend erhält ausschließlich das bereinigte
Lesemodell der Security-Definer-RPCs.

## Adapter

`NewsSourceAdapter` normalisiert strukturierte öffentliche Feeds. Im MVP sind
`dwd.ts` und `gdacs.ts` registriert. Unterstützte Erweiterungen sind REST, RSS, Atom,
JSON Feed und CAP. HTML-Scraping ist nicht Bestandteil des MVP.

Eine neue Quelle wird so ergänzt:

1. Adapter unter `supabase/functions/_shared/live-lage/adapters/` implementieren.
2. Adapter in `adapters/index.ts` registrieren.
3. `news_sources` per Migration um eine aktivierte Quelle mit erlaubten Hosts,
   Vertrauensstufe und Abrufintervall ergänzen.
4. Parser-, Sicherheits- und Importtests ausführen; Edge Function neu deployen.

## Verifizierung und Deduplizierung

Statuswerte: `official`, `verified`, `multiple_sources`, `osint_unconfirmed` und
`unknown`. Ein offizieller Beleg hebt den Ereignisstatus auf `official`; mehrere
seriöse Quellen können `multiple_sources` ergeben. OSINT bleibt sichtbar als
unbestätigt gekennzeichnet.

Die Deduplizierung vergleicht Kategorie, Land/Region, Zeitfenster, Titel- und
Textähnlichkeit sowie erkannte Organisationen. Treffer werden zu einer Hauptmeldung
gruppiert. Originaltitel, Original-URL und Veröffentlichungszeit jeder Quelle bleiben
erhalten.

## Relevanz

Die modulare Bewertung kombiniert in dieser Reihenfolge:

1. Schweregrad,
2. Quellenvertrauen,
3. Land, Bundesland und Landkreis,
4. Infrastruktur-/Versorgungsbezug,
5. Entfernung bei vorhandenen Koordinaten,
6. Aktualität.

Das Ergebnis wird als `KRITISCH`, `HOCH`, `MITTEL` oder `GERING` angezeigt. Die
Gewichte liegen getrennt in `relevance.ts` und können später ohne Änderungen an den
Adaptern ersetzt werden.

## Offline-Verhalten

Nach einem erfolgreichen Abruf speichert der Browser das bereinigte Lesemodell in
`localStorage`. Bei Verbindungsverlust bleiben diese Meldungen sichtbar. Der rote
Live-Punkt wird grau, `LIVE-LAGE` wechselt zu `OFFLINE`, und statt Live-Aktualität
wird der letzte bekannte Lageabgleich angezeigt. Der Service Worker liefert für
fehlgeschlagene API-Aufrufe bewusst keine veraltete HTML- oder API-Antwort aus.

## Absicherung für Produktion

- Weitere offizielle CAP-/Warnadapter und etablierte Nachrichtenquellen ergänzen.
- Quellenverträge, Nutzungsbedingungen, Attribution und Aufbewahrungsfristen prüfen.
- Für jeden Adapter Parser-Fixtures, Schema-Validierung und Regressionstests ergänzen.
- Egress-Allowlisting zusätzlich auf Netzwerkebene durchsetzen.
- API- und Import-Rate-Limits, Observability, Alarmierung und Dead-Letter-Verarbeitung
  ergänzen.
- Anon-Key rotieren und Produktions-Secrets ausschließlich im Hosting hinterlegen.
- Authentifizierung und benutzerspezifische Profile serverseitig anbinden; derzeit ist
  Nicole der einzige lokale Testuser.
- Lokalen Cache je Benutzer verschlüsseln bzw. bei Abmeldung kontrolliert isolieren.
- Redaktionelle Eskalations- und Korrekturprozesse für sensible Sicherheitsmeldungen
  definieren.
- Kartenanzeige für `latitude`, `longitude`, `geographic_scope` und
  `affected_radius_km` ergänzen.
