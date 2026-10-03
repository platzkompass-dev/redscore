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
- Vercel Web Analytics als datensparsame, first-party Reichweitenmessung.

Das Analytics-Skript wird ausschließlich auf `redscore.de` geladen. Lokale
Entwicklung, Vorschau-Hosts und fremde Domains erzeugen keine Seitenaufrufe.
Werbenetzwerk-Pixel werden ohne Anbieter-ID, Rechtsgrundlage und passende
Einwilligungsverwaltung nicht geladen.

Web Analytics ist im getrennten Vercel-Projekt `redscore` aktiviert. Die
Sitemap kann anschließend kostenlos in Google Search Console und
Bing Webmaster Tools hinterlegt werden. Verifikations-Tokens gehören in die
Deployment-Konfiguration beziehungsweise DNS-Verwaltung und niemals als
erfundene Werte in den Quellcode.
