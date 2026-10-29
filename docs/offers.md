# Angebote

Stand: 28. Oktober 2026. Öffentliche und eingeloggte Seite: `/#/angebote`.

Die Seite verwendet das vorhandene Routing, die gemeinsame Navbar, den Footer und
denselben persönlichen Score wie die Startseite. Ohne vollständigen Vorsorge-Check
erscheint kein erfundener Score. Käufe beeinflussen die Bewertung nicht.

## Katalog und Quellen

`dist/offers.js` enthält die redaktionelle Auswahl, sechs Kategorien, deutsche und
englische Texte, offizielle Anbieter-URLs und das tatsächliche Prüfdatum
28. Oktober 2026. Keine Werbung, Provision, Affiliate-Parameter oder behaupteten
Partnerschaften. Die Recherche bestätigt das Angebot auf der offiziellen Seite,
nicht Produktqualität, freie Plätze, Lieferbarkeit oder aktuelle Preise.

- [DRK-Rotkreuzkurse](https://www.rotkreuzkurs.de/start.html): bundesweiter Kursfinder.
- [Malteser](https://www.malteser.de/erste-hilfe/grundlagen.html): Ausbildung und Kurssuche.
- [THW](https://rb-hamburg.thw.de/mitmachen-unterstuetzen/aktiv-helfen): Einstieg und Ortsverbandssuche; regional Hamburg.
- [Johanniter Stade](https://www.johanniter.de/dienste-leistungen/angebote-fuer-privatpersonen/lokale-angebote/dienstleistung/erste-hilfe-ausbildung-betriebliche-erste-hilfe-ausbildung-stade-5467/): belegter Kursstandort, Termine direkt prüfen.
- [THW Stade](https://www.thw-stade.de/): belegtes Angebot zum ehrenamtlichen Mitmachen.
- [DRK Heidelberg](https://service.drk-heidelberg.de/kurse/rotkreuzkurse-erste-hilfe/rotkreuzkurs-erste-hilfe.html): regionale Kursübersicht.
- [DECATHLON](https://www.decathlon.de/alle-sportarten-a-z/wandern-trekking/wanderrucksacke-50-liter): Online-Rucksacksortiment.
- [Globetrotter](https://www.globetrotter.de/ausruestung/campingkueche/wasserfilter/?show=all): Online-Wasseraufbereitung.
- [ABUS](https://www.abus.com/de/Privat/Brandschutz-Gefahrenmelder/Brandschutz/Rauchwarnmelder): Herstellerinformationen zu Warnmeldern, keine Lieferzusage.
- [Bevölkerungsschutztag](https://bevoelkerungsschutztag.de/): Veranstalter meldet Verschiebung auf 2027 ohne festen neuen Termin. Kein kommender Termin erfunden.

## Standort und Filter

Eine lokale Suche berücksichtigt deutsche und englische Titel, Anbieter und Beschreibungen sowie Schreibweisen mit/ohne Umlaute. Alle Suchwörter müssen passen. Sortierung: regionale Einträge zuerst oder Anbieter A–Z. Suche und Filter umgehen nie den Ortsabgleich. Leere Suchergebnisse unterscheiden sich von fehlender regionaler Katalogabdeckung; separate bundesweite Finder berücksichtigen ebenfalls den Suchbegriff.

Angemeldete Nutzer sehen bei fehlendem/zu geringem Wasserbestand oder explizit offenem Notgepäck zuerst einen Verweis zu ihren Vorräten bzw. zur Packliste. Fehlende Daten werden nicht als bestätigter Mangel behandelt, Käufe nicht als Lösung unterstellt. Ein Filter wird ausdrücklich nicht als Ersatz für Trinkwasservorrat empfohlen. Kein Profil wird dazu an einen Anbieter geschickt.

Jede Angebotskarte zeigt eine ausklappbare Prüfcheckliste und die Ziel-Domain des externen Links. Mobile Kategorien sind kompakte Auswahlflächen. Quellenseiten wurden am 28.10.2026 erneut redaktionell geprüft; Preise, Termine und Plätze werden weiterhin nicht erfunden oder als live zugesichert.

Der Abgleich bleibt vollständig im Browser. Angemeldete Nutzer sehen keine PLZ-/
Ortseingabe: Es zählt ausschließlich der aktuelle Standort aus den Einstellungen,
auch wenn vor dem Login ein anderer Ort gesucht wurde. Eine Standortkarte führt
bei Bedarf zum Profil; fehlende Angaben werden dort ergänzt.
Nur Gäste erhalten die freiwillige PLZ-/Ortseingabe. Manuelle Gästeangaben gelten
nur während der aktuellen Sitzung und ändern kein Profil. Keine Browser-Ortungsberechtigung.
Anbieter werden erst durch ausdrückliches Öffnen des externen Links kontaktiert.

Regionale Treffer verlangen einen passenden Ort samt bekannter PLZ oder einen
explizit hinterlegten Landkreis. Erfasst sind zunächst Stade / Landkreis Stade,
Hamburg und Heidelberg. Es wird keine Entfernung berechnet. Außerhalb dieser
Abdeckung erscheinen keine erfundenen örtlichen Treffer; bundesweite Finder sind
separat als Suchportale gekennzeichnet. Online-Einträge sind ortsunabhängig.

Der Katalog wird mit der App ausgeliefert und vom bestehenden Service Worker
gespeichert. Kein zusätzlicher Datenbankdienst, keine API-Keys, kein Scraping oder
unnötiges Polling. Offline bzw. nach 90 Tagen erscheint ein Hinweis auf den
gespeicherten Stand. Externe Seiten benötigen weiterhin Internet.

## Neue Anbieter

1. Offizielle Seite, Betreiberidentität und konkret relevantes Angebot prüfen.
2. Eintrag mit eindeutiger ID, Kategorie, Modus `online`, `finder` oder `local`,
   DE-/EN-Text, HTTPS-URL und tatsächlichem Prüfdatum ergänzen.
3. Bei `local` nur nachgewiesenen Ort / Landkreis und passende PLZ hinterlegen;
   keine bloßen Namensähnlichkeiten oder großflächigen PLZ-Präfixe verwenden.
4. Prüfdatum pro Eintrag beibehalten; den Katalogstand nur nach tatsächlicher
   redaktioneller Prüfung aktualisieren. Abgelaufene Termine entfernen.
5. `test/offers.test.mjs` und `scripts/qa-offers.mjs` ausführen, `offers.js`-Version
   in App-Import und Service-Worker-Shell gemeinsam erhöhen.

Für eine flächendeckende automatische Suche braucht es später eine rechtlich
nutzbare Anbieter-Schnittstelle mit belegten Standorten und laufender Pflege.
Dieser erste Katalog behauptet keine vollständige Markt- oder Ortsabdeckung.
