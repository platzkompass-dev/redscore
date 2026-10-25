# RedScore – offene Punkte

Stand: 25. Oktober 2026. Diese Liste unterscheidet erledigte Implementierung von
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

## Nächste technische Prioritäten

1. Passwort vergessen / sichere Passwortwiederherstellung: noch kein vollständiger
   öffentlicher RedScore-Ablauf. Recovery-Link und Formular müssen als eigener
   Auth-Flow behandelt werden, nicht als normale Registrierungsbestätigung.
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
