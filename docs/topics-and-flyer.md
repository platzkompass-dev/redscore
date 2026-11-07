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
