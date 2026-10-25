# RedScore-Bestätigungsmail

## Selbstbedienung seit 25. Oktober 2026

Im Einloggen-/Registrierungsdialog führt „Bestätigungsmail fehlt?“ zu einem eigenen
Formular. Die zuletzt eingegebene Adresse wird nur im Arbeitsspeicher übernommen;
ein Passwort ist nicht erforderlich. Nach einer Registrierung wird derselbe Hinweis
direkt geöffnet. Nutzer sehen, dass sie auf RedScore als Absender achten und auch
den Spamordner prüfen sollen. Nach dem Anfordern erscheint ein 60-Sekunden-Countdown.
Die Uhr aktualisiert nur die Schaltfläche und ersetzt das Formular nicht.

Der Browser sendet ausschließlich `resend_confirmation` und die Adresse an
`/api/account`; der Server verwendet den vorhandenen `/auth/v1/resend`-Endpunkt mit
festem `type: signup` und der konfigurierten RedScore-Rückleitung. Vom Client
vorgegebene URLs oder Mailtypen werden ignoriert. Es werden weder neue Konten
angelegt noch vorhandene Konten aktiviert. Keine zusätzlichen Secrets benötigt.

Die Rückmeldung ist bewusst bedingt: Nur wenn eine unbestätigte Registrierung
vorliegt, kann eine Bestätigung ankommen. Es wird kein Kontostatus offengelegt und
kein erfolgreicher Posteingang behauptet. Offline, Rate-Limits und Transportfehler
haben eigene Fehlermeldungen. Die Oberfläche ist Deutsch/Englisch verfügbar.
Der lokale Countdown ist eine Bedienhilfe, kein serverseitiger Spam-Schutz;
Supabases bestehende Rate-Limits bleiben maßgeblich und werden nicht abgeschaltet.
Ein zusätzlicher plattformweiter Abuse-Schutz bleibt ein Produktions-To-do.

Der Ablauf wird mit simulierten Antworten geprüft. Für diese Erweiterung wurden
keine echten Bestätigungsmails versendet und keine realen Nutzerprofile verändert.
Die bereits gehostete deutsche Mailvorlage bleibt unverändert; ihre lokale
Vorlage, Vorschau und Regressionstests werden jetzt ebenfalls im Repository gesichert.
Grundlage: [Supabase resend](https://supabase.com/docs/reference/javascript/auth-resend)
und [Auth-Rate-Limits](https://supabase.com/docs/guides/auth/rate-limits).

## Stand 24. Oktober 2026

Neue deutsche Registrierungs-Mail als Vorlage erstellt, lokal getestet und im
gehosteten Projekt gespeichert. Betreff und RedScore-Inhalt nach Neuladen im
Supabase-Vorlageneditor erneut geprüft. Keine anderen Mailvorlagen verändert.
**SMTP ist aktiviert; die Testmail wurde zugestellt.** Im wieder verbundenen
Edge wurde ein bestehendes IONOS-Mail-Basic-Postfach `administration@redscore.de`
mit 2 GB Speicher gefunden, keine Weiterleitung. Es wurde kein zweites Postfach
angelegt und kein Zusatzprodukt bestellt. Die Betreiberin hat das vorhandene
Postfachpasswort selbst im Supabase-Formular eingegeben und gespeichert.
Nach Neuladen wurden der eingeschaltete Custom-SMTP-Schalter, der Absendername
RedScore, `smtp.ionos.de`, Port 465 und der Hinweis auf das gespeicherte, verborgene
Passwort bestätigt. Die Absenderadresse `administration@redscore.de` ist in der
gespeicherten Oberfläche sichtbar. Das Passwort wurde nicht ausgelesen.
Die Betreiberin hat die Testregistrierung unter `administration@redscore.de`
selbst abgeschlossen und den Empfang bestätigt. Die passende Nachricht wurde
am 24. Oktober um 10:43 Uhr im IONOS-Posteingang geprüft: Absender RedScore,
Adresse `administration@redscore.de`, deutscher Betreff und neuer RedScore-Inhalt.
Der Bestätigungslink wurde durch den Agenten weder geöffnet noch weitergegeben;
ein vollständiger Linkklick-/Login-Test ist dadurch noch nicht belegt. Die
vorhandene Nicole-Sitzung in Edge wurde weder abgemeldet noch verändert.

Das fehlende Radarlogo ist in dieser Testmail auf die explizite IONOS-Sperre
„Externe Bilder werden nicht angezeigt, um eine mögliche Nachverfolgung zu
verhindern“ zurückzuführen. Der RedScore-Schriftzug ist HTML-Text und bleibt
sichtbar. Die Logo-URL antwortete separat mit HTTP 200 und `image/png`.
Es wurden weder „Bilder immer anzeigen“ noch globale Datenschutz-/Sicherheits-
Einstellungen geändert. Die Betreiberin kann „Bilder anzeigen“ für diese Nachricht
selbst wählen. Die Anzeige in anderen E-Mail-Clients ist noch nicht getestet.
Auf ausdrücklichen Auftrag der Betreiberin wurde am 24. Oktober um 10:49 Uhr
(Europe/Berlin) genau eine neue Registrierungsbestätigung an das eindeutig
zugeordnete, bereits unbestätigte Nutzerkonto angefordert. Der Auth-Resend-Endpunkt
antwortete mit HTTP 200; `confirmation_sent_at` wurde auf den neuen Zeitpunkt
aktualisiert. Verwendet werden die gespeicherte RedScore-Vorlage, der eigene
SMTP-Absender und die Rückleitung `https://www.redscore.de/?auth=confirmed`.
Der Eingang im fremden Postfach ist damit nicht überprüft; das Konto war bei
der anschließenden Prüfung weiterhin unbestätigt. Es wurden keine zweite Mail,
keine weiteren Erinnerungen und keine manuelle Kontoaktivierung ausgelöst.
Empfängeradresse und Bestätigungstoken werden nicht im Repository protokolliert.

IONOS zeigt „Zahlung nicht erfolgreich“, Supabase „Outstanding invoices“.
Diese Hinweise sind getrennt von der SMTP-Einrichtung durch die Betreiberin zu
prüfen. Es wurden keine Zahlungen oder Rechnungsänderungen vorgenommen.

Prüfung: 83 Tests bestanden (`npm test`), darunter vier neue Tests für Branding,
unveränderte Bestätigungslinks, fehlendes Tracking und eine isolierte Vorschau.
Die schmale Browseransicht wurde visuell kontrolliert. Dies ersetzt keinen
Zustelltest oder eine Kontrolle im tatsächlichen E-Mail-Client.

- HTML: `supabase/templates/confirmation.html`
- Betreff: `supabase/templates/confirmation-subject.txt`
- Konfigurierter Absender: `RedScore <administration@redscore.de>`
- Lokale Vorschau: `node scripts/preview-auth-email.mjs`, dann
  `http://127.0.0.1:4182/`. Diese Vorschau versendet nichts, liest keine Secrets
  und enthält ausdrücklich keinen gültigen Bestätigungslink.

Die Wortmarke bleibt ohne geladene Bilder sichtbar. Tabellenlayout, Inline-CSS,
großer kontrastreicher Button, Fallback-Link und Kontakthinweis sind für
E-Mail-Clients ausgelegt. Keine Werbung, Öffnungs-/Trackingpixel, Fremdschriften,
Scripts, Anhänge oder vom Nutzer eingegebene Namen in der Vorlage.

## Technischer Ablauf

Registrierung → `/api/account` → Supabase Auth → RedScore-Vorlage → eigener SMTP.
Supabase erstellt und validiert den zeitlich begrenzten Bestätigungslink. Es gibt
keinen zweiten parallelen Mailversand durch Vercel und keine selbst erfundenen
Tokens. Die Vorlage nutzt unverändert `{{ .ConfirmationURL }}`. Sie ändert weder
Authentifizierung noch RLS und aktiviert kein Konto ohne Linkbestätigung.
`api/account.js` setzt die Rückleitung bereits serverseitig auf
`https://www.redscore.de/?auth=confirmed`.

Ein RedScore-Absender erfordert einen authentifizierten SMTP-Zugang bzw. eine
verifizierte Absenderdomain. Nur das sichtbare Wort „RedScore“ zu ändern reicht
nicht. Ein eigener Supabase-Auth-Domainname ist für den Versand nicht erforderlich:
der Verifizierungslink darf weiterhin zur konfigurierten Supabase-Instanz führen.

## Live-Einrichtung im bestehenden Projekt

Projekt ausschließlich `kqggxhwouxbuijukcbaz` (ursprünglicher Name „PlanS“),
nicht PlatzKompass.

1. Auth → Emails → SMTP: bestehenden Versand prüfen. Falls bereits eigener SMTP
   aktiv ist, funktionierende Zugangsdaten erhalten. Andernfalls den vorhandenen
   IONOS-SMTP-Zugang für das tatsächliche Postfach eintragen. Keine kostenpflichtige
   Zusatzleistung bestellen oder einen Zugang/ein Passwort ungefragt neu anlegen.
2. Sender name `RedScore`, Sender email `administration@redscore.de`, sofern dieser
   Absender für den verwendeten SMTP-Zugang autorisiert ist. SMTP-Zugangsdaten nur
   in Supabase speichern, nicht in Repository, Frontend, Screenshots oder Chat.
3. Bei IONOS Mail Basic/Business nennt die offizielle Dokumentation
   `smtp.ionos.de`, Port `465` mit SSL/TLS bzw. `587` mit STARTTLS. Für den konkreten
   Vertrag und die TLS-Unterstützung im Supabase-Formular abgleichen; Benutzername
   ist die vollständige Postfachadresse. Eine reine Weiterleitung liefert keinen
   SMTP-Zugang. Nicht mit dem IONOS-Kundenkonto-Passwort verwechseln.
4. Auth → Email Templates → Confirm sign up: Betreff und HTML aus den Vorlagen
   übernehmen, speichern und anschließend auslesen/erneut öffnen. Nur diese
   Vorlage ändern. E-Mail-Bestätigung eingeschaltet lassen.
5. URL-Konfiguration prüfen: Site URL `https://www.redscore.de`, Rückleitung
   `https://www.redscore.de/?auth=confirmed` erlaubt. Keine breite Wildcard ergänzen.
6. Einen kontrollierten Test an ein eigenes Testpostfach durchführen. From und
   Reply-Verhalten sowie `Authentication-Results` mit SPF/DKIM/DMARC prüfen.
   Desktop-/Mobilansicht im tatsächlichen E-Mail-Client kontrollieren.
7. Mit einem echten Testkonto vollständige Registrierung → Zustellung → Klick →
   Login verifizieren. Den Link nicht in Logs/Screenshots speichern. Einen alten,
   unbestätigten Nutzer nur nach ausdrücklichem Auftrag erneut anschreiben.

Öffentliche DNS-Prüfung am 24. Oktober: IONOS-MX, SPF mit
`include:_spf-eu.ionos.com` und DMARC-CNAME zu `dmarc.ionos.de` (`p=none`). Das ist
kein Nachweis für ein existierendes Postfach, dessen SMTP-Zugang oder erfolgreiches
DKIM einer versendeten Mail. Keine produktiven DNS-Einträge wurden geändert.

## Wichtige Grenzen

- Neue Free-Projekte können seit 3. Juni 2026 Vorlagen nur mit eigenem SMTP ändern.
  RedScore wurde im September 2026 angelegt. Den aktuellen Tarif und SMTP-Status
  vor Aktivierung prüfen. Kein Tarifwechsel ist dafür automatisch autorisiert.
- Supabases Standard-Maildienst ist nicht für produktiven Versand an beliebige
  Registrierungen vorgesehen. Nicht nur das Template, sondern den Transport prüfen.
- Link-/Klicktracking beim SMTP-Dienst abschalten; Link-Umschreibungen können die
  Bestätigung stören. Keine Linkkürzer verwenden.
- SMTP-/Auth-Rate-Limits beibehalten. Bestätigungen nicht abschalten, um einen
  Zustellfehler zu umgehen. Keine massenhaften Neuversendungen.
- SPF, DKIM und DMARC mit dem tatsächlichen Versanddienst prüfen. Ein bloßes
  RedScore-Design oder ein vorhandener MX-Eintrag garantiert keine Zustellbarkeit.

## Offizielle Grundlagen

- [Supabase: eigener SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [Supabase: E-Mail-Vorlagen](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Änderung der Free-Template-Regeln](https://supabase.com/changelog/46599-changes-to-email-template-customisation-on-free-tier)
- [IONOS: Serverdaten für die eigene Domain](https://www.ionos.de/digitalguide/domains/domaintipps/outlook-mit-eigener-domain/)
