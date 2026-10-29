# Handy- und Tabletprüfung · 29.10.2026

Geprüft mit einem isolierten Headless-Edge-Browser, Touch- und Viewport-Emulation. Lokaler QA-Server mit synthetischem Konto; keine echten Registrierungen, E-Mails oder Kontodaten verändert. Kein Ersatz für physische iOS-/Android-Geräte.

## Befunde und Korrekturen

- Tablet-Steuerelemente waren zum Teil nur 21–39 Pixel hoch. Bis 1100 Pixel jetzt mindestens 44 Pixel für die geprüften Aktionen: Profil, Sprache, Live-Lage, Packliste, Kartenaktionen und Angebote.
- Standortfelder auf der öffentlichen Angebotsseite hatten auf Tablets zu kleine Schrift. Texteingaben und Auswahlfelder jetzt mindestens 16 Pixel und 48 Pixel hoch.
- Packlisten-Häkchen auf Tablets vergrößert und Spaltenabstände angepasst. Beschreibungen lesbarer.
- Live-Lage auf Tablets ohne feste überlange Leerfläche. Filter und Quelleninformationen lesbarer, Liste bleibt bei vielen Meldungen scrollbar.
- Pop-ups auf Tablets mit erreichbarem Schließen-Button und passenden Eingabefeldern.
- Footerlinks auch auf Tablets mit größeren Touch-Flächen. Aktualisierte CSS-/Offline-Cache-Versionen sorgen für Auslieferung an bestehende Installationen.

## Nachweis

`scripts/qa-mobile.mjs`: 61 Seitenzustände und 24 Dialogansichten bei 320, 390, 430, 768, 820 und 1024 Pixeln. Start und Angebote öffentlich; Start, Vorräte, Packliste, SafePlaces, Warnschutz, Informationen, Angebote und Einstellungen eingeloggt. Dialoge: Registrierung, Haushalt, Vorsorgefragen, Wasser, eigener Vorrat und Zeitmaschine. Zusätzlich reduzierter Bildschirm für erreichbare Abschlussaktionen und Handy-Querformat.

Ergebnis: keine Dokument-Überläufe, keine gemeldeten JavaScript-Fehler, keine zu kleinen geprüften Touch-Ziele oder Texteingaben. Packlisten-Auswahl bleibt nach Neuladen erhalten.

`scripts/qa-navigation.mjs`: 320, 360, 390, 768, 1024 und 1440 Pixel; keine Kollision zwischen Marke und Profilbereich, alle sieben Menüpunkte sichtbar, aktiver Menüpunkt und englische Beschriftung funktionieren.

136 automatisierte Tests bestanden. Die reale Supabase-Anmeldung und Synchronisierung sind wegen der pausierten Datenbank nicht Bestandteil dieses Nachweises. Kartendaten und Nachrichten wurden in der lokalen Layoutprüfung simuliert.

Tracking bleibt separat auf `codex/traffic-statistics` vorbereitet. Vor dessen späterer Zusammenführung CSS-Version 49 beibehalten und Service-Worker-Version erneut erhöhen.
