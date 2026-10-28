# Mobile Prüfung · 28.10.2026

## Änderungen

- Größere Touchflächen in Kopfzeile, Filtern, Packliste, Live-Lage, Artikelaktionen und Footer; zentrale Bedienelemente mindestens 44 Pixel hoch.
- Packliste: besser lesbare Beschreibungen und Mengen, 44-Pixel-Checkboxen, kompakte Fortschrittskarte. Bei 320 Pixeln entfällt das dekorative Artikelbild zugunsten des Textes.
- Live-Lage: lesbare, seitlich wischbare Kategorien ohne Zusammenschieben; dynamische Höhe statt großer leerer Nachrichtenfläche. Lange Listen bleiben scrollbar.
- Nur ein unterer Abstand für die feste Navigation statt doppelter Leerflächen vor dem Footer. Geräte-Sicherheitsabstände bleiben berücksichtigt.
- Formulare mindestens 16 Pixel Schriftgröße und ausreichend hohe Eingabefelder. Schließen-Buttons in langen Haushalts-, Check- und Rechtstextdialogen bleiben beim Scrollen erreichbar.

## Nachweis

`scripts/qa-mobile.mjs` startet eine einzelne isolierte Headless-Edge-Instanz mit Touch-/Mobile-Emulation und synthetischem lokalen Konto. Kein Zugriff auf echte Benutzerkonten, keine Produktions-Schreibzugriffe.

- 27 Seitenprüfungen bei 320, 390 und 430 Pixeln: öffentliche Startseite sowie eingeloggte Startseite, Vorräte, Packliste, SafePlaces, Warnschutz, Informationen, Angebote und Profil.
- Kein seitlicher Dokumentüberlauf, keine JavaScript-Fehler. In den erfassten Hauptseiten-Buttons und Kopfzeilenaktionen keine Touchflächen unter 40 Pixeln mehr.
- 12 Dialogprüfungen bei 320 und 390 Pixeln: Registrierung, Haushalt, Vorsorge-Check, Trinkwasser, eigener Vorrat und Zeitmaschine. Keine horizontalen Dialogüberläufe und keine sichtbaren Eingabefelder unter 16 Pixel Schriftgröße.
- Reduzierte Höhe von 430 Pixeln: letzte Formularaktion erreichbar; bei langen Haushalts-/Checkdialogen bleibt Schließen sichtbar. Dies approximiert wenig Bildschirmhöhe, emuliert keine echte Betriebssystem-Tastatur.
- Querformat 740 × 390 ohne Dokumentüberlauf.
- Packlisten-Abhaken funktioniert und bleibt nach Neuladen erhalten.

Ausführen: `node scripts/qa-server.mjs`, danach mit vorhandenem Playwright-Paket `PLAYWRIGHT_PACKAGE=<Pfad> node scripts/qa-mobile.mjs`. Bericht und Screenshots landen unter dem temporären Ordner `redscore-mobile-qa`; der Browser wird geschlossen.

Die Prüfung bestätigt die responsive Darstellung im Chromium-Browser. Sie ersetzt keinen Test auf echter iOS-/Android-Hardware. Externe Kartenkacheln, reale Ortungsberechtigungen und echte Bildschirmtastaturen sind durch diese lokale Prüfung nicht bestätigt. Die SafePlaces-Schnittstelle verwendet hier ausschließlich lokale Testantworten.
