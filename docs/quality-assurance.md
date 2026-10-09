# RedScore Qualitätsprüfung — 9. Oktober 2026

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
- `npm test`: **70 Tests bestanden**, einschließlich Start-/Endwert, Scoregewichtung,
  Isolation vom persönlichen Zustand und UI-Aktualisierung.
