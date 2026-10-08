# RedScore Live-Lage – MVP

## Datenfluss

```text
DWD / GDACS / NASA EONET / USGS / NOAA-NWS / BBK / UN News / Medienmonitor -> Source Adapter -> Supabase Import Function -> PostgreSQL
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
`dwd.ts`, `gdacs.ts`, `eonet.ts`, `usgs.ts`, `nws.ts`, `rss.ts` und `gdelt.ts` registriert. Der RSS-Adapter verarbeitet
BBK-, Behörden-, UN-News- und RTL-News-Feeds. UN News wird über den spezifischen
RSS-Feed „Peace and Security“ statt über den kurzen allgemeinen Nachrichtenfeed
abgerufen. Dadurch werden unter anderem Russland/Ukraine und USA/Iran erfasst.
Kriegs- und Konfliktmeldungen werden nur bei
konkreten Ereignissignalen wie Angriffen, Beschuss, Gefechten oder Waffenruhen
aufgenommen; allgemeine Außenpolitik und Meinungsbeiträge werden verworfen. Der
Adapter erkennt auch „Ukraine attacks“, „greift … an“ und Meldungen zur Beendigung
eines laufenden Krieges. Jahrestage, Analysen und Meldungen ohne Publikationszeit
werden verworfen. Fehlende Zeitangaben werden niemals durch die Abrufzeit ersetzt.
Explizite Quellensprachen und Konfliktthemen bleiben als Tags erhalten; bei
fremdsprachigen Quellen erscheinen eigene lokalisierte Kurzbeschreibungen, keine
behauptete vollständige Artikelübersetzung.

RTL stellt unter seinen [RSS-Nutzungsbedingungen](https://www.rtl.de/cms/rss-feed-abonnieren-sie-die-rtl-de-auf-ihrem-feedreader-4476976.html)
Feeds zum Einbinden bereit und kann diese Freigabe widerrufen. RedScore übernimmt
keine Bilder, Videos oder vollständigen Artikel. Tagesschau und Deutschlandfunk
wurden **nicht** ungeprüft aktiviert: Ihre aktuellen Bedingungen verlangen für
Wiederveröffentlichung beziehungsweise kommerzielle Drittplattformen eine Freigabe.
Eine spätere Einbindung setzt geklärte Nutzungsrechte voraus.

Der GDELT-Adapter verarbeitet ausschließlich Treffer etablierter
Originalquellen aus einer Domain-Allowlist. Unterstützte Erweiterungen sind REST, RSS,
Atom, JSON Feed und CAP. HTML-Scraping ist nicht Bestandteil des MVP.

Für die Weltlage ergänzen drei strukturierte Primärquellen die GDACS-Lage: NASA
EONET führt laufende Naturereignisse, USGS liefert signifikante Erdbeben und
NOAA/NWS liefert ausschließlich aktive US-Wetterwarnungen der Schweregrade
`Severe` und `Extreme`. Die Adapter validieren URLs gegen Host-Listen. Abgelaufene
Warnungen werden deaktiviert und nicht als aktiv angezeigt.

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

Die RPC `get_filtered_live_lage_events` filtert Kategorie, geografische Auswahl,
Aktivität, Ablaufzeit und Publikationszeit **vor** der Ergebnisbegrenzung. Die
begrenzte Kandidatenmenge wird reihum aus allen Kategorien befüllt; passende
Landkreise und Bundesländer werden innerhalb jeder Kategorie zuerst berücksichtigt.
Das verhindert die bisherige Verdrängung aller anderen Kategorien durch neue
Wetterwarnungen. Der abschließende Rang wird weiterhin im Relevanzmodell berechnet.

In gemischten Übersichten reserviert `selection.ts` bis zu zwei der zwölf Plätze
für schwerwiegende Konfliktmeldungen, falls vorhanden. Die erste Meldung und nahe
kritische Ereignisse werden dabei nicht ersetzt. Ein expliziter Kategorienfilter
bekommt keine Beimischung. Fehlende Koordinaten werden nicht mehr zu `(0,0)`;
Koordinaten müssen als gültiges, vollständiges Paar übergeben werden.

Dies ist keine Garantie vollständiger oder sekundengenauer Kriegsberichterstattung:
Quellen berichten unterschiedlich schnell; jede Meldung zeigt ihren tatsächlichen
Veröffentlichungszeitpunkt und ihre Quelle. Mehrere Feeds eines einzigen Herausgebers
gelten nicht als unabhängige Bestätigung. Daher wurde der bestehende UN-Quelleneintrag
umgestellt, kein zusätzlicher vermeintlich unabhängiger UN-Eintrag angelegt.

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
- Authentifizierung und benutzerspezifische Profile sind über Supabase Auth, RLS und
  den RedScore-Konto-Endpunkt angebunden; produktive E-Mail-Flows und Wiederherstellung
  müssen vor dem öffentlichen Start vollständig end-to-end geprüft werden.
- Lokalen Cache je Benutzer verschlüsseln bzw. bei Abmeldung kontrolliert isolieren.
- Redaktionelle Eskalations- und Korrekturprozesse für sensible Sicherheitsmeldungen
  definieren.
- Kartenanzeige für `latitude`, `longitude`, `geographic_scope` und
  `affected_radius_km` ergänzen.
