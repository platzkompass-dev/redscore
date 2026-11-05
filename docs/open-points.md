# RedScore – offene Punkte

Stand: 5. November 2026. Diese Liste unterscheidet erledigte Implementierung von
externen Freigaben und noch nicht belegten Tests. Sie behauptet keine vollständige
Prüfung der gesamten Plattform.

## In diesem Durchlauf erledigt

- Supabase nach Zahlung reaktiviert. Eigene Besucherstatistik seit 4. November live, mit Zustimmung und nachgewiesener Speicherung; Testaufrufe entfernt.
- Handy-/Tabletprüfung mit größeren Touch-Flächen und lesbaren Eingaben abgeschlossen.
- RedScore-Passwortmail in Supabase gespeichert; Empfang unter administration@redscore.de und Rückleitung bis zum echten Passwortformular geprüft.
- Zentrales Vercel-WAF-Limit für die Konto-API veröffentlicht und mit HTTP 429 bei Anfrage 31 nachgewiesen. Verständliche Rückmeldung auf Deutsch und Englisch ergänzt.
- Tatsächlichen Datenbank-/Quellenstatus für `/api/health` sowie privaten fünfminütigen Störungscheck eingerichtet. Ausfall und Erholung ohne bleibende Teständerungen geprüft.
- Bildportfolio um zwei Töchter und zwei Söhne bei einem Frau/Mann-Haushalt erweitert; Auswahl, Speicherung und mobile Darstellung geprüft.

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

1. Rückmeldung der Betreiberin zum selbst eingegebenen neuen RedScore-Passwort und anschließenden Login. Der echte Mail-/Linkweg bis zum Formular ist geprüft; ein abgeschlossener Passwortwechsel wird noch nicht behauptet.
2. SPF/DKIM/DMARC anhand des tatsächlich empfangenen Headers und Darstellung in weiteren Mail-Clients prüfen.
3. Externe Störungsbenachrichtigung mit einem festgelegten Empfänger ergänzen. Interne Störungserfassung und öffentlicher Status sind vorhanden. Weitere API-Pfade bei wachsender Nutzung gezielt absichern; das neue WAF-Limit betrifft `/api/account`.
4. Weitere Haushaltsbilder, zusätzliche rechtlich nutzbare Nachrichtenquellen und redaktionelle Korrekturprozesse ergänzen. Nicht abgedeckte Haushalte erhalten weiterhin die Landschaft statt einer falsch zusammengesetzten Familie.

## Externe bzw. von der Betreiberin zu klärende Punkte

- Supabase-Rechnung durch die Betreiberin bezahlt; Projekt am 4. November erfolgreich reaktiviert. Keine Tarife geändert.
- Impressums- und Datenschutzhinweise für den tatsächlichen Betrieb prüfen lassen.
  Keine Betreiberangaben ungefragt erfinden oder wieder einsetzen.
- Scharfes Facebook-Profil-/Titelbild hochladen; vorhandene lokale Datei erhalten.
  Weitere Beiträge nur nach konkreter Freigabe veröffentlichen. Kein ungefragtes
  Anschreiben unbestätigter Nutzer und keine Massenwerbung.
- IndexNow hat am 5. November neun öffentliche URLs mit HTTP 202 angenommen; Schlüsselprüfung und tatsächliche Indexierung bleiben zu prüfen. Such-/Social-Reichweite erneut messen. Keine Rankings
  oder Nutzerzahlen ohne tatsächliche Messdaten behaupten. `marketing.md` enthält
  zeitlich getrennte historische Zustände, nicht durchgehend den aktuellen Status.
