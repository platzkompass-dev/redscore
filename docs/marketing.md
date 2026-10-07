# RedScore: kostenlose Reichweite aufbauen

## Ausgelieferte Inhalte am 7. Oktober 2026

Die öffentlichen Ratgeber sind ohne Konto und ohne JavaScript lesbar. Jede Seite
hat eine eigene kanonische Adresse, deutsche und englische Sprachverweise,
Social-Vorschaudaten und nachvollziehbare BBK-Quellen. Die Sitemap enthält alle
acht Ratgeberseiten plus Startseite. `npm run build:guides` erzeugt die Seiten
aus `scripts/build-public-guides.mjs`; Vercel führt den Befehl beim Build aus.

Einstieg: https://www.redscore.de/ratgeber/index.html

## Drei veröffentlichungsfertige Beiträge

Die Texte sind vorbereitet, nicht auf Social-Media-Konten veröffentlicht.
Sie eignen sich für eigene bestehende Kanäle. In Gruppen zuerst prüfen,
ob Eigenwerbung erlaubt ist. Keine Direktnachrichten oder Massenkommentare.

### Wasser und Vorrat

Wie viel Wasser steht bei dir wirklich bereit? Mit dem kostenlosen RedScore-
Rechner kannst du den Richtwert für Erwachsene direkt ausprobieren. Dazu gibt
es praktische Tipps, um einen Vorrat Schritt für Schritt aufzubauen – ohne
Anmeldung. Deinen tatsächlichen Bestand kannst du anschließend in RedScore
erfassen.

https://www.redscore.de/ratgeber/notvorrat.html

### Notfallrucksack

Eine Packliste ist leichter als alles im Kopf zu behalten. Was gehört für dich
in einen Notfallrucksack? Probiere den kurzen Packcheck aus, drucke die Liste
oder führe deine persönliche Packliste kostenlos in RedScore weiter.

https://www.redscore.de/ratgeber/notfallrucksack.html

### Stromausfall

Taschenlampe gefunden? Radio einsatzbereit? Powerbank geladen? Vorbereitung
beginnt mit kleinen Schritten. Unser kostenloser Stromausfall-Ratgeber hilft
beim Einstieg. RedScore verbindet deinen Vorsorge-Check mit Vorräten und
konkreten Aufgaben.

https://www.redscore.de/ratgeber/stromausfall.html

## Suchmaschinen einrichten

1. In Google Search Console die Inhaberschaft von `https://www.redscore.de/`
   bestätigen. Bestehende Property verwenden, wenn vorhanden.
2. `https://www.redscore.de/sitemap.xml` einreichen.
3. Über URL-Prüfung die Startseite erneut crawlen lassen; sie verweist auf das
   neue Radar-Favicon. Anschließend die drei deutschen Ratgeber prüfen.
4. In Bing Webmaster Tools dieselbe Sitemap einreichen. Einen vorhandenen
   Zugang verwenden; keine Konten ohne bestätigte Eigentümerschaft anlegen.

Der Search-Console-Zugang ist am 7. Oktober wieder verfügbar. Eine separate
URL-Präfix-Property für `https://www.redscore.de/` wurde angelegt. Der von Google
bereitgestellte öffentliche Bestätigungs-Tag steht im Head der Startseite.
Nach dem Deployment werden die Inhaberschaft und Sitemap in Google geprüft.

## Wirkung prüfen

Nach zwei bis vier Wochen die tatsächlich erfassten Impressionen, Klicks und
Suchbegriffe in der Search Console vergleichen. In Vercel Web Analytics die
Ratgeber-Seitenaufrufe und Herkunft vergleichen. Registrierungen sind anhand
der aggregierten Auth-Zahlen zu prüfen; ohne echte Daten keine Reichweiten-
oder Erfolgszahlen behaupten. Erst anhand dieser Daten weitere Themen wählen.

Keine bezahlten Anzeigen, kostenpflichtigen Erweiterungen oder fremden
Trackingpixel sind für diesen Stand eingebaut. Die öffentlichen Rechner und
Probe-Checklisten speichern keine personenbezogenen Daten.
