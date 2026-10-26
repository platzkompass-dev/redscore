# RedScore – offene Punkte

Stand: 26. Oktober 2026. Diese Liste unterscheidet erledigte Implementierung von
externen Freigaben und noch nicht belegten Tests. Sie behauptet keine vollständige
Prüfung der gesamten Plattform.

## In diesem Durchlauf erledigt

- Bestätigungsmails können im Login selbst erneut angefordert werden, ohne Passwort,
  mit bedingter Rückmeldung, festem Rückleitungsziel und 60-Sekunden-Bedienpause.
- Registrierung führt direkt zum verständlichen Bestätigungshinweis. Deutsch und
  Englisch, Offline-Hinweis und sichtbare Fehler sind berücksichtigt.
- Die bereits gehostete RedScore-Mailvorlage samt sicherer lokaler Vorschau und Tests
  ist im Repository gesichert. Kein erneuter Versand an bestehende Nutzer.
- README zu Kinderangaben und vorhandenen Quellenadaptern aktualisiert.
- Angebote-Seite mit DE-/EN-Katalog, überprüften offiziellen Quellen, regionalem
  Ortsabgleich und ortsunabhängigen Online-Angeboten. Abdeckung und Pflege: `offers.md`.
- Navigation: „Informationen“ und „Angebote“, kein „Über RedScore“ in der Navbar.
  Impressumsname nach Auftrag geändert; zusätzlicher Score-Simulationskasten entfernt.
- Passwort-Reset als eigener Ablauf mit isoliertem temporärem Token, Validierung,
  Wiederholung bei Dienstfehlern und DE-/EN-Formularen implementiert und lokal getestet.

## Nächste technische Prioritäten

1. RedScore-Recovery-Mailvorlage in Supabase aktivieren und anschließend mit einem
   kontrollierten eigenen Testkonto den echten Versand → Link → Passwort → Login
   prüfen. Die Vorlage ist im Repo vorbereitet, ihre gehostete Speicherung ist
   nicht bestätigt. Keine echten Nutzerpasswörter wurden automatisiert geändert.
2. Vollständiger Zustell-, Linkklick- und Login-Test mit einem kontrollierten eigenen
   Testkonto sowie Prüfung von SPF/DKIM/DMARC im tatsächlich empfangenen Header.
   Der bisherige Zustelltest allein belegt diesen Gesamtweg nicht.
3. Ergänzender zentraler Schutz gegen automatisierten Missbrauch öffentlicher
   Auth-/API-Endpunkte. Bestehende Provider-Limits erhalten; ein Browser-Countdown
   ersetzt keine verteilte Rate-Limit-Lösung.
4. Live-Lage-Betrieb: messbare Quellenausfälle, Alarmierung, redaktionelle Korrekturen,
   weitere rechtlich nutzbare Quellen und internationale Abdeckung. Details in
   `live-lage.md`; keine Vollständigkeitsgarantie für Ereignisse.
5. Bildportfolio für bisher nicht exakt abgedeckte Haushalte ergänzen. Bis dahin
   bewusst eine Landschaft statt einer falschen Familienzusammensetzung anzeigen.

## Externe bzw. von der Betreiberin zu klärende Punkte

- IONOS-/Supabase-Rechnungshinweise aus dem Test vom 24. Oktober prüfen; kein
  automatischer Tarifwechsel und keine Zahlung durch den Agenten.
- Impressums- und Datenschutzhinweise für den tatsächlichen Betrieb prüfen lassen.
  Keine Betreiberangaben ungefragt erfinden oder wieder einsetzen.
- Scharfes Facebook-Profil-/Titelbild hochladen; vorhandene lokale Datei erhalten.
  Weitere Beiträge nur nach konkreter Freigabe veröffentlichen. Kein ungefragtes
  Anschreiben unbestätigter Nutzer und keine Massenwerbung.
- Bing-Einreichung und erneute Messung der Such-/Social-Reichweite. Keine Rankings
  oder Nutzerzahlen ohne tatsächliche Messdaten behaupten. `marketing.md` enthält
  zeitlich getrennte historische Zustände, nicht durchgehend den aktuellen Status.
