# Sichtbarkeit für Vorrat und Prepping

6. November 2026. Kostenlose organische Suchoptimierung, keine gebuchten Anzeigen.

## Suchintentionen und Zielseiten

- `/ratgeber/notvorrat.html`: Vorrat anlegen, Notvorrat, Vorratsliste, Wasservorrat
  berechnen, Vorrat für zwei Personen, Vorrat für eine Familie, Lebensmittel ohne
  Strom. Bestehende URL erhalten; der vorhandene Rechner bleibt nutzbar. Neuer
  abhakbarer Vorratscheck mit eigener Druckansicht, keine Speicherung der Eingaben.
- `/ratgeber/prepping-anfaenger.html`: Prepping für Anfänger, Prepper-Vorrat,
  Prepper-Checkliste, Grundausstattung und Prepping mit Familie. Vollständig
  lesbarer Ratgeber mit eigenem Inhalt, Quellenlink und konkreten ersten Schritten.
- Beide Seiten besitzen englische Fassungen und wechselseitige `hreflang`-Links.

Die bereits vorhandenen Seiten zu Notfallrucksack und Stromausfall werden passend
verlinkt. Keine parallelen nahezu identischen Landingpages für jede Schreibweise.

## Umsetzung

- Individuelle Seitentitel und Beschreibungen, aktualisierte Startseiten-Metadaten
  und Social-Preview-Texte. Der ausdrücklich gewünschte Browser-Tabtitel der App
  bleibt bestehen.
- Reale HTML-Links von Startseite und Ratgeberübersicht zu den Themen; die
  Startseite enthält bereits im ausgelieferten HTML eine lesbare Einleitung und
  Themenlinks. JavaScript ersetzt sie durch die bestehende App. Gleicher Inhalt
  für Menschen und Suchmaschinen, kein verstecktes Keyword-Feld und kein Cloaking.
- `Article`-/`CollectionPage`-Daten, sichtbare Brotkrumennavigation mit passender
  `BreadcrumbList`, Inhaltsverzeichnisse mit funktionierenden Abschnittslinks.
- Veröffentlichungsdatum des neuen Ratgebers 06.11.2026; Vorratsartikel tatsächlich
  überarbeitet am 06.11.2026. Ursprüngliche Publikationsdaten und unveränderte
  Artikeldaten werden nicht künstlich erneuert. Sitemap: elf kanonische URLs.
- Der von Google nicht verwendete Keywords-Meta-Tag wurde entfernt.
- Die bestehende Statistik erlaubt zusätzlich nur die zwei neuen öffentlichen
  Ratgeberpfade. Zustimmung, Ausschluss privater Seiten, Tageshashes und
  Aufbewahrung bleiben unverändert. Produktionsmigration und `public-visit` v3
  bereitgestellt. Datenbankprobe in zurückgerollter Transaktion: keine künstlichen
  Besuche in den Berichten.

## Fachliche Quellen

- [BBK: Essen und Trinken bevorraten](https://www.bbk.bund.de/DE/Warnung-Vorsorge/Vorsorge/So-koennen-Sie-sich-vorbereiten/Bevorraten/bevorraten_node.html)
- [BZfE: Private Ernährungsvorsorge](https://www.bzfe.de/kueche-und-alltag/private-ernaehrungsvorsorge)

Planungswerte für Erwachsene; Kinder, Haustiere und Mehrbedarf werden ausdrücklich
separat berücksichtigt. Keine individuelle Ernährungs- oder medizinische Beratung.

## Google-Grundlagen und Erfolgsmessung

- [SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)
- [Titel in Suchergebnissen](https://developers.google.com/search/docs/appearance/title-link)
- [Beschreibungen und Snippets](https://developers.google.com/search/docs/appearance/snippet)
- [Google verwendet den Keywords-Meta-Tag nicht](https://developers.google.com/search/blog/2009/09/google-does-not-use-keywords-meta-tag)

Google entscheidet über Crawling, Indexierung und angezeigten Titel/Snippet.
Keine bestimmten Positionen oder neue Besucher behauptet. Die bereits in Search
Console eingereichte Sitemap behält ihre URL. Dort nach erneuter Verarbeitung
die neuen Seiten sowie Impressionen/Klicks für „Vorrat“, „Notvorrat“,
„Vorratsliste“, „Prepper“ und „Prepping“ vergleichen. Keine Indexing-API verwenden,
die nur für andere Inhaltstypen vorgesehen ist. IndexNow ist separat für
unterstützende Suchmaschinen; eine Annahme dort beweist keine Google-Indexierung.

## Verifikation

155 Tests bestanden. HTML- und JSON-LD-Prüfung für alle zehn Ratgeberseiten,
Sitemap und lokale Links; kein JavaScript nötig, um Themen und Inhalte zu lesen.
Browsertest: 320, 390, 768, 1024 und 1440 Pixel, Deutsch/Englisch, kein horizontaler
Überlauf. Rechner für zwei Erwachsene/drei Tage ergibt zwölf Liter; sieben
abhakbare Vorratsbereiche, getrennte PDF-/Druckansicht geprüft. Sicherheitsberater
der Datenbank zeigen gegenüber dem vorherigen Stand keine zusätzlichen Hinweise.
