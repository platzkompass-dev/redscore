# RedScore Qualitätsprüfung

## Echter Ortsdienst-Ausfall und Rückfall — 26. Oktober 2026

- Produktiver Fehler für 21729 Freiburg (Elbe) reproduziert: HTTP 503 nach rund
  neun Sekunden. Geocoder erfolgreich, Overpass wegen Überlastung nicht verfügbar.
- Begrenzte Suchzeiten, Rückfall auf Photons Umgebungssuche, HTTP-/Warm-Instance-
  Cache und gemeinsame Anfragen ergänzt. Keine neuen Secrets oder kostenpflichtigen
  Dienste. Details und Nutzungsregeln: `safeplaces.md`.
- Die echte korrigierte API-Funktion liefert 40 echte Orte für Freiburg (Elbe).
  Unter anderem Polizei, Edeka, Adler Apotheke, Feuerwehr und Rettungswache.
- Ein einzelner isolierter Edge-Prozess zeigte diese echten Treffer bei 390 und
  1440 Pixeln. Danach wurden ein Listenausfall und ein Neuladen ohne lokale Liste
  simuliert: gespeicherte Treffer bleiben erhalten, andernfalls bleibt der
  Kartenmittelpunkt mit ehrlichem Listenausfall-Hinweis verfügbar.
- **124 Tests bestanden**, Ratgeber-Build erfolgreich. Tests prüfen zusätzlich
  Overpass-Timeout innerhalb HTTP 200, Photon-Filter, 20-km-Grenze, fehlende
  Koordinaten, Cache-Alter und einen vollständigen Provider-Ausfall.
- Die tatsächliche Kartenkachel-Verfügbarkeit wurde nicht erfolgreich bestätigt:
  ein separater OSM-Embed-Aufruf meldete HTTP 429. Der Ortsdaten-Test behauptet
  daher keine Verfügbarkeit der externen Basiskarte. Keine Umgehung dieser Grenze.
- Kein echtes Konto verändert. Screenshot-/API-Belege:
  `%TEMP%/redscore-places-recovery-qa`.

## Profilstandort und SafePlaces — 26. Oktober 2026

- Angebote zeigen eingeloggt ausschließlich den aktuellen Profilstandort als
  Standortkarte. Keine PLZ-/Ortseingabe; eine vorherige Gast-Suche wird ignoriert.
  Der Verwalten-Button führt zu den vorhandenen Einstellungen.
- SafePlaces erhält einen kompakten Kopfbereich, Standortkarte mit PLZ / Ort /
  Region, Datenstand und Aktionen, eine geordnete Filterleiste und Kartenwerkzeuge.
  Die Karte kennzeichnet Ortsmittelpunkt und Routenziel; keine GPS-Genauigkeit wird
  behauptet. „Standort zeigen“ setzt die Ansicht auf den gespeicherten Ort zurück.
- Fehlende Koordinaten erzeugen keine Markierung bei 0,0. Fehlender Standort,
  Ladezustand, Dienstfehler und gespeicherte Offline-Daten sind unterscheidbar.
- „WARUM VORSORGE?“ ist aus allen fünf Simulations-Popups entfernt. Erklärung,
  Beispiel-Score und Schließen bleiben erhalten.
- **116 Unit-/Regressionstests bestanden**, Ratgeber-Build erfolgreich.
- `qa-location-map.mjs`: Standortänderung über die Einstellungen → aktualisierte
  Angebote → Kartenabfrage mit neuer PLZ → Route innerhalb RedScore → zurück zum
  Ortsmittelpunkt → Offline-Liste erfolgreich geprüft. 360 / 390 / 768 / 1440 px
  ohne Dokumentüberbreite, DE/EN und keine neuen Tabs bei Routenwahl.
- `qa-offers.mjs` und `qa-password-reset.mjs` ebenfalls erfolgreich, einschließlich
  Offline-Neuladen und entfernter Popup-Beschriftung. Keine Browser-Scriptfehler.
- Karten-/Routenanbieter werden im Layout-/Vertragstest durch eindeutig benannte
  Development-Antworten ersetzt. Dies belegt keine aktuelle Provider-Verfügbarkeit.
  Keine echten Profile oder Passwörter wurden für diese Tests geändert.

Browserbilder: `%TEMP%/redscore-location-map-qa` (synthetische Testdaten).

## Angebote, Navigation und Recovery — 26. Oktober 2026

- `node --test`: **113 Tests bestanden**. `npm run build:guides`: acht Ratgeber
  und Sitemap erfolgreich erzeugt; keine unerwarteten Änderungen an diesen Dateien.
- `scripts/qa-offers.mjs`: isolierter Headless-Edge-Test bei 360, 390, 768 und
  1440 Pixeln. Keine horizontale Dokument-Überbreite, alle sieben mobilen
  Navigationsziele erreichbar. Größenübergänge in der Kopfzeile korrigiert.
- Standort Stade zeigt die belegten Johanniter-/THW-Einträge; Berlin erhält keine
  vorgetäuschten lokalen Treffer. Kursfinder bleiben als Suchportale erkennbar.
  Online-Auswahl, DE/EN-Wechsel und Rückkehr zur Startseite geprüft.
- Echter Offline-Neuladevorgang mit aktivem Service Worker erfolgreich: Seite,
  sechs Kategorien und gespeicherter Katalog bleiben verfügbar. Zusätzlich
  Offline-Umschaltung im geöffneten Browser geprüft. Keine Drittanbieter-Anfragen
  allein durch Laden oder Filtern der Angebotsseite.
- `scripts/qa-password-reset.mjs`: erfolgreich bei 390, 768 und 1440 Pixeln;
  temporäres Recovery-Token getrennt von bestehendem Konto, Neuladen, falsche
  Passwortwiederholung, ungültiger Link und abschließender Login geprüft.
  Provider-Antworten und Konten synthetisch; **keine realen Passwörter geändert**.
- Alle fünf Simulations-Popups ohne den entfernten Zusatzkasten geprüft;
  gewünschte Navigation und Impressumsname ebenfalls bestätigt.
- Die Recovery-Mailvorlage liegt im Repository. Die Speicherung im gehosteten
  Supabase-Editor ist noch nicht bestätigt; echter Versand-/Linkklick-Test bleibt
  offen. Das ist kein Nachweis einer vollständig geprüften Produktionsplattform.

Browserbilder: `%TEMP%/redscore-offers-qa` und
`%TEMP%/redscore-password-reset-qa` (nur synthetische Testdaten).

## Bestätigungsmail-Selbstbedienung — 25. Oktober 2026

**Ablauf:** Einloggen / Registrierung → Bestätigung anfordern → bestehende Konto-API
→ Supabase-Resend-Endpunkt → bedingte Rückmeldung mit 60-Sekunden-Countdown.

| Grenze | Prüfung |
| --- | --- |
| Oberfläche | Lokaler Headless-Edge-Test mit 390, 768 und 1440 Pixeln; keine horizontale Überbreite; Screenshots visuell geprüft. |
| Client → API | Nur Aktion und E-Mail, kein Passwort oder frei vorgegebenes Rückleitungsziel; mehrfaches Absenden während Anfrage und Wartezeit blockiert. |
| API → Provider | Regressionstest prüft exakt `/auth/v1/resend`, `type: signup` und das serverseitige RedScore-Ziel mit simuliertem Provider. |
| Provider → Antwort | Unbekannter Kontostatus bleibt generisch; Rate-Limits bleiben 429 mit Retry-After; Versandstörung ist kein Erfolg. |
| Antwort → Oberfläche | Countdown entsperrt ohne Formular-Neuaufbau; Adresse bleibt beim Zurückwechseln erhalten; englische Texte und Offline-Fehler geprüft. |

97 Node-Tests bestanden. Ratgeber-Build erfolgreich. Der lokale Haushalts-Browsertest
wird zusätzlich als Regression ausgeführt. Keine neuen echten Konten angelegt,
keine realen E-Mails versendet und keine SMTP-, RLS- oder DNS-Einstellungen verändert.
Dies ersetzt keinen erneuten produktiven Zustell- und Linkklick-Test. Die vorhandene
RedScore-Mailvorlage und ihre bisher lokalen Tests werden im Repository gesichert.
Offene Folgeaufgaben stehen in `open-points.md`.

## Ausgangsprüfung — 9. Oktober 2026

## Geprüfter Ablauf

Vorrat oder Packliste bearbeiten → auf dem Gerät speichern → bestehende `/api/account`-API → authentifizierter Supabase-Kontodienst → sichtbarer Speicherstatus. Browserprüfungen fanden in einer separaten, ausschließlich lokalen Testumgebung statt. Es wurden keine echten Nutzerkonten angelegt oder verändert.

## Änderungen

- Ausstehende lokale Änderungen bleiben beim Neuladen und beim Laden desselben Kontos erhalten. Andere Konten übernehmen diese Daten nicht.
- Kontospeicherung läuft seriell. Änderungen während einer laufenden Speicherung bleiben ausstehend und werden anschließend übertragen.
- Fehler und abgelaufene Sitzungen erscheinen sichtbar. Netzwerkfehler löschen nicht automatisch die Sitzung. Wiederholung bei Serverfehlern nach 30 Sekunden; kein unkontrolliertes Polling.
- Offline-Neustart funktioniert für den zuvor angemeldeten und vollständig eingerichteten Haushalt. Abmeldung mit ausstehenden Änderungen verlangt eine Warnbestätigung.
- Wasser kann in Gebinden oder direkt in Litern erfasst werden; Dezimalwerte werden unverändert gespeichert. Mengenanzeigen zeigen bis zu drei Nachkommastellen. Eigene Vorräte akzeptieren freie Dezimalmengen.
- Regionale Wetterhinweise werden unabhängig vom gewählten Nachrichtenfilter abgefragt. Die Aktualität basiert auf dem letzten erfolgreichen DWD-Import, nicht auf einem beliebigen anderen Feed. Fehlende Ergebnisse sind ausdrücklich kein Entwarnungssignal.
- Veraltete Antworten dürfen einen gewechselten Feedfilter nicht überschreiben. Offline-Filterwechsel behalten die zuletzt geladenen Meldungen und erklären die Einschränkung.
- Leere SafePlaces-Antworten und fehlgeschlagene Feedabrufe erzeugen keine Render-/Abrufschleifen.
- Offene Dialoge behalten Eingaben bei Hintergrundaktualisierungen. Tastaturfokus, Escape, Fokusbegrenzung, Dialogbeschriftung und inaktiver Hintergrund sind berücksichtigt.
- Familienmotive sind auf Mobilgeräten und kleineren Tablets vollständig oberhalb des Textbereichs sichtbar. Tablet-Statuskarten überlaufen nicht mehr. Footer, Safe-Area-Abstände und Bewegungsreduktion sind angepasst.
- Englische Packlisten- und Wissensinhalte einschließlich Suchtexten, Mengen, Fortschritt und Bedienbeschriftungen sind ergänzt.

## Nachweise

- `npm test`: 48 Tests bestanden; Auth-Proxy, Konto-/Offline-Zustand, Feed-Rennen, Warnaktualität, SafePlaces, Routing, Übersetzungen und SEO. Gebündelte Warnungen zeigen die passende regionale Teilmeldung und nicht den Ort einer fremden Hauptmeldung.
- `npm run build:guides`: acht öffentliche Ratgeberseiten plus Sitemap generiert.
- `node --check dist/app.js` und `git diff --check`: ohne Fehler.
- Edge, 390 Pixel: vollständiges Familienmotiv; Eingabe 12,25 Liter; simulierter HTTP-503-Speicherfehler mit sichtbarer Wiederholung; Menge nach Neuladen erhalten.
- Edge, echte Offline-Netzwerksimulation: Änderung auf 15,75 Liter; Neuladen; Startseite und gespeicherte Meldungen bleiben erreichbar, Live-Anzeige ist OFFLINE. Nach Wiederverbindung wurde automatisch synchronisiert.
- Edge, 320 Pixel: keine horizontale Seitenüberbreite in den geprüften Ansichten; eigener Vorrat mit 0,125 kg gespeichert; englische Suche nach „power bank“ findet den bereits abgehakten Eintrag.
- Edge, 768 Pixel: korrigierte Statuskarten liegen innerhalb der Seitenbreite (753 Pixel bei 768-Pixel-Viewport); Navigation hat zugängliche Namen, auch wenn visuell nur Symbole erscheinen.
- Edge, 1440 Pixel: Seitenbreite 1425 Pixel, rechte Live-Lage 390 Pixel.
- Produktion vor Veröffentlichung: `/api/health` meldet `accountConfigured` und `liveLageConfigured`; Wetter-API liefert echte Ereignisse und DWD-Importzeit ohne Quellenfehler. Das separate Vercel-Projekt heißt `redscore`, Projekt-ID `prj_mg6aEswg6jfTXbNG5DELbcomKjqC`; zugeordnete Domains sind `www.redscore.de` und `redscore.de`.

## Reproduzierbarer Browsertest

1. `node scripts/qa-server.mjs` starten.
2. `http://127.0.0.1:4181/` öffnen.
3. Mit `qa@example.test` und einem beliebigen **nur für diesen Test verwendeten** Passwort ab acht Zeichen anmelden. Keine echten Zugangsdaten verwenden.
4. HTTP-503-Speicherfehler über `http://127.0.0.1:4181/__qa/save-failure?enabled=1` aktivieren; mit `enabled=0` zurücknehmen.
5. Browser-Netzwerk offline schalten, Bestände bearbeiten, neu laden und anschließend wieder online schalten.

Der Testserver bindet ausschließlich an die Loopback-Adresse. Kontodaten liegen nur im Arbeitsspeicher. Die Testwarnung ist als DEVELOPMENT gekennzeichnet. Dieser Server wird nicht von Vercel ausgeliefert.

## Grenzen und nächste Prüfungen

- Reale Registrierung mit Zustellung und Klick auf eine Bestätigungsmail wurde in diesem Durchgang nicht erneut durchgeführt; dafür ist ein kontrolliertes echtes Testkonto erforderlich.
- SafePlaces-Routen und Warnimporte haben eigene automatisierte Tests; die lokale Browserumgebung prüft hier bewusst einen leeren Ortsdatensatz, keine reale Navigationsstrecke.
- Konflikte bei gleichzeitigen Änderungen auf mehreren Geräten benötigen langfristig serverseitige Versionsprüfung. Aktuell hat eine zuletzt erfolgreiche vollständige Speicherung Vorrang.
- Die Koordinatenparameter wurden beim nachfolgenden Live-Lage-Fix als vollständiges Paar mit Wertebereich validiert; fehlende Werte werden nicht mehr zu 0. Beide Lage-Funktionen wurden mit unverändert aktivierter JWT-Prüfung neu bereitgestellt.
- Die regionale Wetterübersicht ist keine vollständige amtliche Warn-App. Datenabdeckung, Importverzögerungen und die begrenzte Ergebnismenge können Meldungen auslassen; deshalb gibt es keine automatische Entwarnung.

Die Prüfung folgt den Skills `vercel:verification` (gesamter Datenfluss und Fehlerfälle) und `vercel:deployments-cicd` (getrenntes Projekt, Commit-/Produktionsnachweis). Die Plattform ist damit verbessert, nicht pauschal als fehlerfrei zertifiziert.

## Nachprüfung Kriegsnachrichten — 8. Oktober 2026

- Ursache nachgewiesen: Die bisherige gemischte Datenbankabfrage enthielt **0**
  Konfliktmeldungen unter den letzten 200 Meldungen, die neue kategorienbalancierte
  Abfrage enthielt bereits vor dem nächsten Import **3**. Ein expliziter Konfliktfilter
  liefert auch mit `limit=1` eine Konfliktmeldung statt einer Wetterwarnung.
- Der allgemeine UN-Feed wurde durch den thematischen „Peace and Security“-Feed
  ersetzt. Der echte Quellenabruf enthält Meldungen zur Ukraine vom 7. Oktober und
  zum USA-Iran-Konflikt vom 6. Oktober. Keine erfundenen Produktivmeldungen.
- Die produktive API liefert diese Meldungen sowohl für `scope=world` als auch
  `scope=for_you`, mit Quellenstatus `verified` und unveränderten Publikationszeiten.
- `npm test`: **57 Tests bestanden**, darunter neue Fälle für Konflikterkennung,
  politische Nicht-Ereignisse, fehlende Zeitangaben, Quellensprachen, deutsche/englische
  Konfliktthemen, Kategorienauswahl und Erhalt naher kritischer Warnungen.
- Die Supabase-Sicherheitsprüfung wurde ausgeführt. Die Nachrichten-Tabellen bleiben
  ohne direkten öffentlichen Tabellenzugriff; das absichtlich öffentliche,
  begrenzte Security-Definer-Lesemodell hat einen leeren `search_path` und explizite
  Execute-Grants. Die entsprechenden Advisor-Warnungen wurden daher nicht durch
  Öffnung der Tabellen „behoben“. Bereits vorhandene Hinweise zu `pg_net` im öffentlichen
  Schema und deaktiviertem Passwort-Leak-Schutz bleiben separate Härtungspunkte.
- Edge-Browser, Produktionsdashboard: „Weltlage“ → „Kriege“ zeigt die echten
  Meldungen für Russland/Ukraine und USA/Iran mit Quellenbezeichnung und Alter.
  Die öffentliche gemischte API-Antwort enthält beide Konfliktthemen bei zwölf
  angeforderten Meldungen; der reine Wetterfilter enthält keine Kriegsbeimischung.

## Zuverlässigkeit und mobile Bedienung — 9. Oktober 2026

- Lageanzeige unterscheidet echten Offline-Modus, laufenden Abgleich, nicht erreichbaren
  Lage-Dienst und veraltete Daten. Der Sekundentimer aktualisiert auch Überschrift,
  Farbe und Pulsieren: abgelaufene Aktualität bleibt nicht irrtümlich LIVE.
- Der Aktualitätsnachweis benötigt eine gültige Importzeit und eine kürzlich erhaltene
  API-Antwort. Fehlende, ungültige oder weit in der Zukunft liegende Zeiten gelten
  nicht als live. Die Zeitangabe zeigt das Alter des Quellenabgleichs, nicht nur das
  Alter des letzten API-Aufrufs. Vorhandene Meldungen bleiben bei Abruffehlern sichtbar.
- Fehler bei lokaler Kontospeicherung sind dauerhaft sichtbar, statt im Anschluss
  „lokal gespeichert“ zu behaupten. Cloud-Speicherung wird trotzdem versucht; ein
  erfolgreicher Cloud-Speicherstand ohne Offline-Kopie wird ausdrücklich unterschieden.
  Wiederholung stellt den lokalen Speicher wieder her, sobald er verfügbar ist.
  Änderungen ausschließlich im Arbeitsspeicher aktivieren die Browser-Schließwarnung.
- Installationshinweise lassen sich auch bei gesperrtem Browserspeicher schließen;
  eine fehlgeschlagene lokale Löschung verhindert nicht mehr die Abmeldung.
- Der Login-Button bleibt auf der mobilen öffentlichen Startseite sichtbar.
  Die eingeloggte Navbar passt auch bei 320 Pixeln einschließlich Profil-Schaltfläche;
  Lagekarten haben größere Texte und eine größere Details-Schaltfläche. Ausgewählte
  Lagefilter sind zusätzlich über `aria-pressed` erkennbar.
- Neue Statusmeldungen sowie dynamische Bewertungs- und Prioritätstexte sind auf
  Englisch ergänzt. App-Shell-Version 47 aktualisiert JS, CSS und Übersetzungen zusammen.
- `npm test`: **68 Tests bestanden**, darunter Speicher-Quota/gesperrter Speicher,
  Cloud-Erfolg ohne Offline-Kopie, Wiederholung, Schließwarnung, Zeitablauf ohne Render,
  fehlende/falsche Zeitangaben sowie englische Statusmeldungen.
- Edge, isolierter Testserver: Login bei 390 Pixeln; langsamer Filterwechsel zeigt
  LAGEABGLEICH; 20 Minuten alte Quelldaten zeigen NICHT AKTUELL mit grauem Punkt;
  HTTP-503 meldet LAGE UNVERFÜGBAR und nicht einen Internetausfall.
- Edge, 320 Pixel: nach Navbar-Korrektur Seitenbreite und verfügbare Breite jeweils
  305 Pixel (Scrollbar berücksichtigt), Profil vollständig innerhalb der Navbar.
  Englische Status- und Bewertungstexte geprüft. Echte Netzwerksimulation zeigt
  OFFLINE und behält die zuletzt geladenen Testmeldungen. Simulation wird zurückgesetzt.

Zusätzliche lokale Feed-Simulation: `/__qa/feed?mode=slow|stale|error|normal`.
Diese ausdrücklich als DEVELOPMENT markierten Daten existieren nur im Loopback-
Testserver; keine Produktionsdaten oder echten Benutzerkonten wurden verändert.
Die erneute Prüfung folgt `vercel:verification`, die Veröffentlichung
`vercel:deployments-cicd`. Reale Mailzustellung, zusätzliche internationale
Quellenabdeckung und geräteübergreifende Konfliktauflösung sind damit nicht erneut
als vollständig geprüft ausgewiesen.

## Score-Lab auf der öffentlichen Startseite — 9. Oktober 2026

- Die Startseite enthält ein anonymes, nicht persistiertes 72-Stunden-Stromausfall-
  Szenario. Fünf konkrete Vorsorgeschritte lassen sich einzeln auswählen und wieder
  abwählen; Radar, Score, Fortschritt, Wirkungstext und `aria-pressed` aktualisieren
  sich unmittelbar.
- Die Vorschau nutzt dieselbe nachvollziehbare RedScore-Gewichtung wie das Konto:
  70 % Vorsorge-Check und 30 % Vorratsfortschritt. Sie startet bei 0, berücksichtigt
  drei von zehn Vorratstagen bei Wasser, Lebensmitteln und Medikamenten und behandelt
  Licht/Energie als einsatzbereit. Hygiene bleibt bewusst offen.
- Die UI kennzeichnet den Wert ausdrücklich als Beispiel-Simulation und nennt die
  Annahmen sowie die Grenzen (keine Gefahrenprognose, keine Sicherheitsgarantie).
  Der persönliche Score wird nicht verändert; der CTA führt erst nach Wunsch zur
  kostenlosen Registrierung.
- Die mobile Vorschau ist bei 390 Pixeln 347 Pixel breit, die Dokumentbreite bleibt
  bei 375 Pixeln. Die englische Variante übersetzt Szenario, Schritte, Erläuterung
  und Wirkungstexte.
- `npm test`: **71 Tests bestanden**, einschließlich Start-/Endwert, Scoregewichtung,
  Isolation vom persönlichen Zustand und UI-Aktualisierung.
- Die Interaktion erfolgt wieder direkt per Klick bzw. Tastatur. Jeder ausgewählte
  Schritt öffnet zusätzlich ein kontextbezogenes Erklärungsfenster, das den
  Vorsorgegrund erläutert (z. B. Wasser, Lebensmittel oder Energie). Der Beispielwert
  und `aria-pressed` aktualisieren sich unmittelbar; der persönliche Score bleibt
  unverändert.

## Bedienungs-Politur — 11. Oktober 2026

- Score-Lab: Der Wirkungstext bleibt beim Öffnen/Schließen der Erklärung erhalten.
  Das Popup zeigt den aktuellen Beispielwert und unterscheidet hinzugefügte von
  entfernten Schritten. Die Berechnung öffnet per Button das zugehörige Details-
  Element, ohne den Hash-Router auszulösen oder die Auswahl zurückzusetzen.
- Vorräte: Anzahl erfasster Bereiche, Erklärung offener Bereiche und ein Button
  zum nächsten nicht erfassten Bereich. Die bereits korrekte Gewichtung der
  Vorratsberechnung wurde nicht geändert; ein vollständig erfasster Wasserbereich
  allein ergibt bei fünf relevanten Bereichen weiterhin 20 %.
- Packliste: Eine erfolglose Suche lässt sich mit einem Button zurücksetzen,
  ohne abgehakte Gegenstände zu verlieren.
- Score-Lab-Layout: eigener Tablet-Breakpoint von 761 bis 1040 Pixeln, größere
  Schließen-Schaltfläche und umbrechende Dialogüberschriften. Neue Texte sind
  auch auf Englisch vorhanden. App-Shell-Version 52 aktualisiert die Assets.
- `npm test`: **75 Tests bestanden**, inklusive tatsächlicher Click-Handler,
  Wirkungstext nach erneutem Render, Modell-Disclosure ohne Routerwechsel,
  Vorratsabdeckung/nächstem Bereich sowie Packlisten-Reset mit Zustandserhalt.
- In Edge wurden vor der Korrektur die zwei Score-Lab-Fehler reproduziert.
  Die abschließende Browserprüfung der neuen Version konnte wegen wiederholter
  Zeitüberschreitungen der Edge-Steuerung nicht abgeschlossen werden. Insbesondere
  die neue mobile/Tablet-Darstellung ist damit noch nicht visuell bestätigt.
  Reale Kontodaten wurden für diese Prüfung nicht verändert.
- Prüfung nach `vercel:verification`, Veröffentlichung nach
  `vercel:deployments-cicd`; keine erneute Vollprüfung aller Plattform-Funktionen.
