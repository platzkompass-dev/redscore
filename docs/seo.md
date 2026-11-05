# SEO und datensparsame Reichweitenmessung

RedScore stellt für Suchmaschinen eine kanonische, öffentlich erreichbare
Startseite unter `https://www.redscore.de/` bereit.

Umgesetzt sind:

- präzise Title-, Description-, Robots-, Open-Graph- und Twitter-Metadaten,
- strukturierte Daten für `Organization`, `WebSite` und `WebApplication`,
- ein kostenloses Angebot (`Offer` mit Preis 0 EUR),
- `robots.txt` mit Sitemap-Verweis und Ausschluss der API-Routen,
- eine XML-Sitemap mit dem kanonischen Startseiten- und Vorschaubild,
- eine JavaScript-freie Inhaltszusammenfassung für Nutzer ohne JavaScript,
- einwilligungsgebundene eigene Besucherstatistik in Supabase, seit 4. November 2026.

Das Analytics-Skript wird ausschließlich auf `redscore.de` geladen. Lokale
Entwicklung, Vorschau-Hosts und fremde Domains erzeugen keine Seitenaufrufe.
Werbenetzwerk-Pixel werden ohne Anbieter-ID, Rechtsgrundlage und passende
Einwilligungsverwaltung nicht geladen.

## Kostenlose Reichweite und nächste Schritte

RedScore bietet auf der öffentlichen Startseite eine freiwillige Teilen-Funktion
an. Sie verwendet ausschließlich die vom Nutzer selbst gewählte Share-Funktion
des Geräts; ohne diese Funktion wird nur die URL kopiert. Dabei werden keine
E-Mail-Adressen, Profil- oder Haushaltsdaten übertragen.

Die technische Grundlage für organische Auffindbarkeit ist
ausgeliefert: kanonische URL, robots.txt, XML-Sitemap, strukturierte Daten,
Social-Preview-Metadaten und eine JavaScript-freie Inhaltszusammenfassung.
Die folgenden kostenlosen Schritte erfordern den Zugriff der Inhaberin auf die
jeweiligen Dienste und werden deshalb nicht automatisiert im Namen der Website
ausgeführt:

1. `https://www.redscore.de/sitemap.xml` in der Google Search Console
   einreichen und die Startseite über die URL-Prüfung zur Indexierung anfragen.
2. Dieselbe Sitemap in Bing Webmaster Tools hinterlegen; Bing kann Sitemaps
   auch aus der Google Search Console importieren.
3. Regelmäßig die Indexierungs- und Suchanfragenberichte prüfen und die
   Wissensinhalte daran ausrichten – nie mit alarmistischen oder irreführenden
   Schlagzeilen arbeiten.

Die eigene Statistik zählt öffentliche Seitenaufrufe und tägliche Browser-Sitzungen nach Zustimmung. Sie übermittelt keine URL-Suchparameter oder Haushaltsdaten. Details und Auswertungsabfragen stehen in `traffic-statistics.md`.

Für Bing und weitere teilnehmende Suchmaschinen ist die manuelle IndexNow-Einreichung der öffentlichen Sitemap vorbereitet: `node scripts/submit-indexnow.mjs --submit`. Die echte Domain-Verifikationsdatei wird zusammen mit der Website veröffentlicht. Google Search Console und Bing Webmaster Tools liefern weiterhin die eigentlichen Indexierungs- und Suchberichte.

## Öffentliche Ratgeber und aktuelles Suchlogo

Seit 7. Oktober 2026 gibt es einen öffentlichen Ratgeber-Einstieg sowie drei
Artikel auf Deutsch und Englisch. Sie sind als vollständiges HTML erreichbar,
intern verlinkt und in der Sitemap mit gegenseitigen Sprachverweisen enthalten.
Die Beiträge enthalten Quellen, Druck-/Teilen-Funktionen und kostenlose
Einstiegswerkzeuge. Weitere Maßnahmen und fertige Beitragstexte: `marketing.md`.

Das aktuelle rote Radar wird als 192×192-PNG unter der stabilen Adresse
`/favicon.png` und zusätzlich als `/favicon.ico` ausgeliefert. Die Startseite und
Ratgeber verweisen darauf; das Organisationslogo ist ebenfalls das Radar.
Eine sofortige Aktualisierung des Google-Suchergebnisses ist nicht erzwingbar.
Die erneute Indexierung wird über die Search Console angefordert, sobald der
Zugang wieder verfügbar ist.
