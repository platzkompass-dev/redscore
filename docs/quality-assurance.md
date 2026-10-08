# RedScore Qualitätsprüfung — 8. Oktober 2026

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

- `npm test`: 47 Tests bestanden; Auth-Proxy, Konto-/Offline-Zustand, Feed-Rennen, Warnaktualität, SafePlaces, Routing, Übersetzungen und SEO.
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
- Die Koordinatenparameter des Supabase-Lage-Endpunkts benötigen noch strengere Validierung: fehlende Werte dürfen dort nicht über `Number(null)` zu 0 werden. In diesem Durchgang wurde keine Supabase-Funktion neu bereitgestellt.
- Die regionale Wetterübersicht ist keine vollständige amtliche Warn-App. Datenabdeckung, Importverzögerungen und die begrenzte Ergebnismenge können Meldungen auslassen; deshalb gibt es keine automatische Entwarnung.

Die Prüfung folgt den Skills `vercel:verification` (gesamter Datenfluss und Fehlerfälle) und `vercel:deployments-cicd` (getrenntes Projekt, Commit-/Produktionsnachweis). Die Plattform ist damit verbessert, nicht pauschal als fehlerfrei zertifiziert.
