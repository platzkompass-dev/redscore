# Themenratgeber und Flugblatt

Veröffentlicht am 7. November 2026. Sechs zusätzliche Ratgeber mit eigener
deutscher und englischer URL: Bevölkerungsschutzkampagne, Eigenvorsorge,
Krisenkommunikation, Bürgerinformationsportal, digitale Öffentlichkeitsarbeit und
Selbstschutz. Inhalte in `scripts/public-guide-topics.mjs`; Ausgabe über den
bestehenden Generator. Sitemap: 23 URLs einschließlich Startseite. Quellen,
Canonical, Sprachverweise, Artikel- und Breadcrumb-Daten sind enthalten.
Verwandte Artikel sind thematisch begrenzt statt auf jeder Seite den gesamten
Katalog zu wiederholen. Lange Begriffe umbrechen auf kleinen Bildschirmen.

Der vorhandene Prepping-Ratgeber beschreibt jetzt Vorbereitung mit Augenmaß,
kleinen Schritten und überschaubaren Ausgaben. Veröffentlichung bleibt der
6. November, tatsächliche Überarbeitung der 7. November. RedScore wird als
unabhängiges Angebot dargestellt, keine amtliche Rolle oder institutionelle
Integration behauptet.

Die Statistik-Allowlist umfasst zusätzlich die zwölf öffentlichen Sprachpfade.
Migration `track_civil_protection_guides` und `public-visit` v4 sind angewendet.
Die Probe wurde zurückgerollt; keine künstlichen Besuche bleiben in Berichten.
Datenschutzentscheidungen und Ausschluss privater Seiten bleiben bestehen.

## A4-Flugblatt

- Öffentlicher Download: `/downloads/redscore-flugblatt-a4.pdf`.
- Auch unter Informationen erreichbar, sowohl öffentlich in der Ratgeberübersicht
  als auch eingeloggt in der Wissensansicht.
- Einseitiges A4, eingebettete Segoe-Schriften, eigener Radar-Markenauftritt,
  eigene Szenarioillustrationen, klickbare Website und QR-Code zu
  `https://www.redscore.de/`. Keine Trackingparameter oder Drittanbieter-QR-URL.
- Sichtbar: kostenloser Einstieg, Kernfunktionen und unabhängiger Status.
- Reproduzierbare Quelle: `scripts/build-flyer.py`; benötigt ReportLab und Pillow.
  Ausgabe zusätzlich lokal unter `output/pdf/RedScore-Flugblatt-A4.pdf`.
- Mit Poppler gerendert und visuell auf Abstände, Schrift und QR-Ruhezone geprüft;
  mit pypdf eine A4-Seite, extrahierbarer Text und zwei URL-Annotationen bestätigt.

Inhalte, Quellen und Vorlagen sind redaktionell geprüft. Bestimmte Rankings oder
eine neue Google-Indexierung werden damit nicht zugesichert.

## Score-focused flyer

- Second independent download: `/downloads/redscore-score-flugblatt-a4.pdf`.
- Editable source `scripts/build-score-flyer.py`, local deliverable `output/pdf/RedScore-Score-Flugblatt-A4.pdf`.
- One A4 page with vector score gauge (64/100 explicitly labelled example), three concrete preparation steps, QR and website links. Score describes self-reported preparedness, not a safety guarantee.
- Uses the same unmodified BBK logo as the website with explicit source attribution and no official cooperation claim. `dist/assets/bbk-logo-print.png` is a 1240px raster export of `bbk-logo.svg` for print embedding.
- Offered beside the general flyer in the signed-in information view and German/English public guide indexes; both PDFs are German.
- Verified with Poppler visual rendering and pypdf (one A4 page, text and two URL annotations). Public download indexes checked at 320/768/1440px in both languages.

## SafePlaces / bunker question flyer

- Third download: `/downloads/redscore-safeplaces-flugblatt-a4.pdf`; source `scripts/build-safeplaces-flyer.py`, local output `output/pdf/RedScore-SafePlaces-Flugblatt-A4.pdf`.
- Headline: “Weißt du, wo der nächste Bunker ist?” Promotes SafePlaces, the personal score and preparation without promising accessible bunkers. Clearly states SafePlaces is not an official bunker directory; local authority instructions prevail.
- Same BBK source attribution and logo as the other score flyer. Background checked against BBK Schutzbauwerke: https://www.bbk.bund.de/DE/Themen/Risikomanagement/Baulicher-Bevoelkerungsschutz/Schutzbauwerke/schutzbauwerke_node.html
- One A4 page visually checked through Poppler; pypdf confirms three link annotations. ZXing decoded the actual rendered PDF QR at 150 and 96 dpi to https://www.redscore.de/.
- German/English download indexes checked at 320/768/1440px. PDF language is German.

## Berlin power outage campaign flyer

- Fourth download: `/downloads/redscore-stromausfall-berlin-flugblatt-a4.pdf`; editable source `scripts/build-blackout-flyer.py`, local output `output/pdf/RedScore-Stromausfall-Berlin-Flugblatt-A4.pdf`.
- Provocative editorial message “Vorsorge aufschieben ist fahrlässig.” Historical reference explicitly labelled Berlin southwest / January 2026 / retrospective. Approx. 100 hours refers to the overall disruption, not every household or all Berlin; earlier reconnections are acknowledged.
- Primary factual source printed and linked: Stromnetz Berlin, 08.01.2026, https://www.stromnetz.berlin/uber-uns/presse/pressemitteilungen-2026/strom-ist-fur-alle-wieder-da/
- The three household prompts are hypothetical, not additional reported impacts. BBK source attribution and no-cooperation statement retained.
- One A4 page visually checked via Poppler; extracted text/source and three links verified. Actual rendered QR decoded at 150 and 96 dpi. German/English download indexes checked at 320/768/1440px.
