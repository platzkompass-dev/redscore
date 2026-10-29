# Cookie- und Datenschutz-Auswahl

Implementiert am 29.10.2026 in `dist/analytics.js` und `dist/consent.css`, für Portal und generierte DE-/EN-Ratgeber. Keine zusätzliche externe Consent-Plattform und keine neuen API-Schlüssel.

## Auswahl

- Erstbesuch: gleich gestaltete Buttons „Nur notwendige“ und „Statistik erlauben“. Keine voreingestellte optionale Zustimmung. Impressum und Datenschutz bleiben erreichbar.
- Notwendige Funktionen für Konto, Sprache, Vorsorgedaten und Offline-Betrieb bleiben verfügbar.
- Optionaler Zweck: Vercel Web Analytics auf öffentlichen Seiten. Keine Werbepixel. Der Dienst verwendet standardmäßig keine Tracking-Cookies; die Oberfläche benennt deshalb lokalen Speicher und Webstatistik ausdrücklich.
- Auswahl liegt als versionierter boolescher Status mit Zeitstempel in `redscore-consent-v1`, ohne eindeutige Nutzer-ID. Gültigkeit: 180 Tage. Ungültige, unbekannte oder abgelaufene Werte erlauben keine Statistik.
- „Cookie-Einstellungen“ im Portal- und Ratgeber-Footer öffnet die Auswahl erneut. Statistik-Entscheidungen werden nicht mit dem Benutzerprofil synchronisiert.

## Technische Sperre

Vor expliziter Erlaubnis wird `/_vercel/insights/script.js` überhaupt nicht eingefügt. Das Skript lädt nur auf `redscore.de` bzw. Subdomains und tatsächlich gerenderten öffentlichen Seiten. Ein `beforeSend`-Callback prüft vor jedem Ereignis den aktuellen Status. Er entfernt URL-Suchparameter und Hash; eingeloggte Ansichten senden keine Statistikereignisse. Ein Widerruf blockiert sofort weitere Ereignisse, auch wenn das Skript bereits geladen wird oder läuft. Er macht bereits rechtmäßig gesendete Ereignisse nicht rückgängig.

Der `storage`-Listener übernimmt Änderungen aus anderen Tabs. Bei fehlender dauerhafter Speicherbarkeit gilt eine ausdrückliche Auswahl nur für die aktuelle Seitensitzung; erneutes Laden startet ohne optionale Freigabe. Hosting- und API-Betriebsprotokolle sind von Web Analytics getrennt; die Auswahl schaltet keine technisch notwendigen Serverprotokolle ab. Die bewusst geöffnete Umgebungskarte hat ihre eigene Datenübermittlung, beschrieben im Datenschutztext.

## Nachweis

`scripts/qa-consent.mjs` verwendet den tatsächlichen Vercel-Statistik-Code auf einer vollständig lokal abgefangenen Test-Origin. Der normale Browserpfad wird simuliert, da das Skript automatisierte Clients sonst überspringt. Alle Statistik-Endpunkte werden abgefangen: keine Testereignisse gehen an die Produktion.

Bestanden: keine Skript-/Statistik-Anfragen vor Zustimmung; gespeicherte Ablehnung; Laden erst nach Erlaubnis; Widerruf auch bei bereits geladenem Skript; tabübergreifender Widerruf; erneute Abfrage nach Ablauf; Entfernung von URL-Suchparametern; keine Statistik in Kontoansichten; englische Ratgeber; gleichwertige, erreichbare Buttons und kein Bannerüberlauf bei 320, 390 und 1440 Pixeln.

Diese Implementierung ist keine rechtliche Zertifizierung. Ausrichtung: [Hinweise der Datenschutzaufsicht Hessen](https://datenschutz.hessen.de/datenschutz/internet-und-medien/haeufige-fragen-zu-cookies), [FAQ der Datenschutzaufsicht Baden-Württemberg](https://www.baden-wuerttemberg.datenschutz.de/faq-zu-cookies-und-tracking-2/) und [Vercel-Dokumentation zu Statistik und Datenschutz](https://vercel.com/docs/analytics/privacy-policy).
