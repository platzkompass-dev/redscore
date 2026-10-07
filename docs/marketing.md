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

Am 7. Oktober 2026 wurde eine separate URL-Präfix-Property für
`https://www.redscore.de/` angelegt und die Inhaberschaft per HTML-Tag bestätigt.
Die vorhandene PlatzKompass-Property wurde nicht verändert. Die Startseite ist
bereits im Google-Index. Der Live-Test meldet „URL ist für Google verfügbar“ und
„Seite kann indexiert werden“. Die erneute Indexierung der aktualisierten
Startseite wurde von Google bestätigt und in die Crawling-Warteschlange gestellt.

Die Sitemap wurde eingereicht. Google meldet beim ersten Abruf noch
„Konnte nicht abgerufen werden“; nach dem erfolgreichen Live-Test wurde sie
einmal erneut eingereicht. Der unabhängige öffentliche Abruf liefert HTTP 200,
`application/xml` und gültiges XML mit neun URLs, auch mit Googlebot-User-Agent.
Eine erfolgreiche Verarbeitung durch Google ist damit noch nicht nachgewiesen.
Den Sitemap-Status bei der nächsten Search-Console-Auswertung erneut prüfen;
keine wiederholten Indexierungsanträge für dieselbe URL senden.

Das neue Radar-Favicon liegt unter stabilen öffentlichen URLs. Wann Google das
Suchergebnis-Symbol erneuert, entscheidet Google beim erneuten Crawlen; eine
sofortige Änderung oder bestimmte Positionen in den Suchergebnissen sind nicht
garantiert. Bing-Einreichung und tatsächliche Social-Media-Veröffentlichungen
sind noch offen.

## Wirkung prüfen

Nach zwei bis vier Wochen die tatsächlich erfassten Impressionen, Klicks und
Suchbegriffe in der Search Console vergleichen. In Vercel Web Analytics die
Ratgeber-Seitenaufrufe und Herkunft vergleichen. Registrierungen sind anhand
der aggregierten Auth-Zahlen zu prüfen; ohne echte Daten keine Reichweiten-
oder Erfolgszahlen behaupten. Erst anhand dieser Daten weitere Themen wählen.

Keine bezahlten Anzeigen, kostenpflichtigen Erweiterungen oder fremden
Trackingpixel sind für diesen Stand eingebaut. Die öffentlichen Rechner und
Probe-Checklisten speichern keine personenbezogenen Daten.
