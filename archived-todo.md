# Koalitions-O-Mat – Archiv erledigter Aufgaben

Erledigte (abgehakte) Aufgaben aus todo.md, Stand 2026-08-08. Offene Punkte: siehe `todo.md`.

## Nachträge vom 2026-08-08 (Lauf B-Lauf: Review, Datenqualität & GitHub-Cleanup)

Per Node-Harness gegen alle `elections/*/werte.json`/`fragen.json` verifiziert: Sitzsummen (btw2029 630, Berlin 130, LSA 83, MV 79), Ranking-Normalisierung, i18n-Abdeckung, MV-Einfach-Sprache (7 Parteien). `node --check script.js` OK. Vollständiger Bericht: `reports/review-2026-08-08.md`. **Keine neuen P1-Bugs.**

- [x] **MV-2026: keine Einfache-Sprache-Parteibeschreibungen** – behoben: `einfache-sprache.json.parteien.mv-2026` deckt alle 7 MV-Parteien ab, `simplePartyText()` liefert Einfache Sprache.
- [x] **Ranking bei wenigen Antworten irreführend** – `normalisiereUebereinstimmung()` dämpft Werte unter `minAnswersForRanking` (5) zur 50-%-Baseline; `fewUserHint`/`fewUserCardHint` zeigen die dünne Nutzer-Basis. btw2029 (1×„j"): SPD/GRÜNE/LINKE/BSW 60 %, CDU/FDP/AfD 40 %.
- [x] **Sainte-Laguë erster Divisor 1 statt 1,4** – Standard-Verfahren (Divisorfolge 1, 3, 5, …) ist das deutsche gesetzliche Verfahren (Sainte-Laguë/Schepers, § 5 Abs. 3 BWahlG); Code-Kommentar ergänzt, btw2029-Seats 192/158/96/82/68/34 (Summe 630) korrekt.
- [x] **Kosmetik: `}function …` auf einer Zeile** – `grep -c '}function'` → 0 Treffer (PR #56 „Separated braces").
- [x] **Kategorie „Kultur" fehlt in `config.topics`** – `config.json` enthält `topics.Kultur`; keine „Sonstiges"-Frage mehr, `determineTopic()` liefert für alle Fragen das explizite `thema`.
- [x] **Issue #27 „More Mobile friendly"** – geschlossen (2026-08-08): Keyboard-Hint nur noch Desktop (`keyboard-hint`, styles.css:578), Touch-Ziele 44 px, `.party-detail-link`-Tap-Ziel korrekt.
- [x] **Issue #52 (MV GRÜNE 5 %-Grenzwert; hartkodierte `aria-label`s; leere `parteienFilter`)** – geschlossen: `aria-label`s via `data-i18n-aria` + `t()` (index.html:24-26, script.js:2107-2113); leere Ergebnisse erklärt via `noCoalitionsBelow`/`noCoalitionsFilter` (script.js:1105-1116); MV-GRÜNE-5-%-Entscheidung per `>=`-Check dokumentiert (script.js:974-975).
- [x] **Issue #53 (Teilen-Link-Unterschied Partei-Seite)** – nicht reproduzierbar; Ursache waren inzwischen behobene Daten-/Tap-Lücken (verlauf/rss ergänzt, Touch-Ziele). Geschlossen.
- [x] **Issue #55 (Zeilenreferenzen in Reports verschoben, kosmetisch)** – aktuelle Referenzen aktualisiert; historische Reports bleiben Momentaufnahmen. Geschlossen.

## Nachträge vom 2026-08-08 (Issue #54: Datenqualität „CDU/CSU" vs. „CDU"; „SSW" in Berlin)

Die Überprüfung per Node-Harness gegen alle `elections/*/werte.json`/`fragen.json` bestätigt: Die Akzeptanzkriterien sind vollständig erfüllt, keine Datenänderung nötig.

- [x] **Datenqualität: „CDU/CSU" vs. „CDU"** – alle 4 Wahlen nutzen einheitlich die Parteibezeichnung „CDU/CSU" (bewusste Design-Entscheidung, Union als eine Einheit; dokumentiert in `prompt-gemini-fragen.md:84`). Verifiziert: Parteimengen in `werte.json` ↔ `fragen.json` je Wahl identisch, kein Parteieintrag exakt „CDU".
- [x] **`partyColors` kennt alle Namen** – `config.json` enthält `CDU/CSU` (#000000) und alle in den Datendateien verwendeten Parteinamen (kein Fallback auf `default` nötig).
- [x] **„SSW" (0,5 %) aus der Berlin-Umfrage entfernt** – keine Datendatei enthält einen SSW-Wert in Berlin (SSW existiert nur für Schleswig-Holstein). Zusätzlich wurde `prompt-gemini-fragen.md:92` korrigiert („never in Berlin"), damit der Generator die unplausiblen Werte nicht wieder einspielt.

## Nachträge vom 2026-08-06 (Lauf B: PR #37/Issue #36-Status korrigiert)

PR #37 (RSS-Parteifilter) ist inzwischen gemergt (87366b5), Issue #36 geschlossen; PWA (PR #41) auf `origin/main` gemergt (107e7f9), Issue #40 geschlossen. Die im Lauf-A-Bericht als „nicht gemergt/offen" geführten Einträge waren veraltet und wurden hiermit abgehakt.

- [x] **PR #37 (`opencode/issue36-20260806075757`) widerspricht Issue #36** – obsolet: PR #37 ist gemergt (Merge 87366b5), der Eintrag behauptete „nicht gemergt". Der Code enthält den Parteifilter `newsItemMatchesParty()` (script.js:782-792). Einzig das False-Positive-Risiko der Wortsuche bleibt als P3 in `todo.md`.
- [x] **Issue #36 „[Bug]: RSS Feeds don’t load"** – obsolet: Issue #36 ist geschlossen (2026-08-06, zusammen mit PR #39 „Fixed RSS: bad URLs, flaky proxies, restyled."). Der todo-Eintrag behauptete „bleibt offen".
- [x] **Issue #40 „No PWA"** – geschlossen über PR #41 (manifest.webmanifest + sw.js + Registration) auf `origin/main`.

## Nachträge vom 2026-08-05 (News-Feed: neutrale Quellen, Timeout/Retry, Datenlücken)

Alle 4 Wahlen haben jetzt für alle 7 Parteien `rss` (neutral) und `verlauf`; `fetchNewsFeedProxy()` mit Timeout/Retry/Proxy-Fallbacks.

- [x] **News-Feed lädt Partei-eigene Feeds und widerspricht der Neutralitäts-Zusage** – Partei-Eigenkanäle (afd.de/feed etc., btw2029) durch neutrale, unabhängige Quellen ersetzt (Tagesschau-Landesfeeds, Deutschlandfunk, ZDF); README:10 dokumentiert die Quellen. Galt für alle 4 Wahlen.
- [x] **`verlauf` (Historie) fehlt in 3 von 4 Wahlen** – Datenlücke geschlossen: `ltw-sachsen-anhalt-2026`, `berlin-2026`, `mv-2026` haben für alle Parteien `verlauf`-Daten; `renderPartyTimeline()` rendert echte Diagramme.
- [x] **`rss` fehlt in 3 von 4 Wahlen** – Datenlücke geschlossen: alle 4 Wahlen, alle Parteien mit `rss` (LSA/Berlin/MV je 1 Feed, btw2029 je 2); kein `party.newsEmpty`-Fall mehr.
- [x] **News-Fetch ohne Timeout/Retry** – `fetchNewsFeedProxy()` (script.js) mit `AbortController`-Timeout (12 s), XML-Sniff (`<item`/`<entry`), Proxy-Fallback-Kette (`config.newsProxy` → allorigins → codetabs → corsproxy.io); `loadPartyNews()` zeigt bei Totalausfall Fehler + „Erneut versuchen"-Button (`party.newsRetry`, `.party-news-retry` mit 44 px) statt Dauerladen.
- [x] **Partei-eigene Feeds ungekennzeichnet** – obsolet: Nachrichten stammen jetzt aus neutralen Quellen (Tagesschau, Deutschlandfunk, ZDF).
- [x] **README:10 präzisieren** – Partei-Seiten-Beschreibung nennt die neutralen Feed-Quellen (Tagesschau, Deutschlandfunk, ZDF).


## Implementierung vom 2026-08-05 (P2 + P3 aus Review 2026-08-04 & Folgebefunde)

Verifiziert per `node --check`, JSON-Validierung und DOM-Harness gegen die echten Datendateien.



### Umgesetzt

- [x] **P2: Partei-Vergleich zeigt Quellen/Begründungen sichtbar** – `updatePartyComparison()` (script.js): neuer `title`-Tooltip, stattdessen sichtbare Spalte „Quelle / Begründung" (`cmp-srcs`); mobil erreichbar (README:13). `cmp-hint`-Hover entfernt.
- [x] **P2: `prompt-gemini-daten.md` angelegt** – generiert `beschreibung`/`website`/`kandidaten`/`spitzenkandidat`/`verlauf`/`rss` (neutrale Feeds); README „Daten generieren" verlinkt beide Prompts.
- [x] **P3: `thema` als Pflichtfeld im Fragen-Prompt** – `prompt-gemini-fragen.md` mit gültigen Topic-Keys (Wirtschaft, Soziales, Umwelt, Außenpolitik, Inneres, Digitales, Sonstiges) + Feld-Tabelle + Beispiel.
- [x] **P3: HTML-Escaping vereinheitlicht** – `p.beschreibung` (:455, :529), `p.website`-href (:461, :540, :544), Kandidaten-Namen, `s.zitat`/`s.begruendung`/`s.quelle` (Quellen-Panel) und Partei-Namen im Vergleich jetzt via `escapeHtml`/`escapeHtmlAttr`.
- [x] **P3: `renderPartyProgramm()` „… und {n} weitere Punkte"** – statt stillem `slice(0,3)`, neuer `programmMore`-Hinweis (i18n).
- [x] **P3: UI-Hinweis Tastatursteuerung** – `.keyboard-hint` im Test-Tab (1/2/3/Pfeile), i18n `keyboardHint`.
- [x] **P3: `party.notFound`-Key in `einfache-sprache.json`** ergänzt (war mehrfach offen).
- [x] **P3: `user-match-bar` rendert kein ungültiges CSS bei `null`** – Guard `width:0` statt `width:null%`.
- [x] **P3: Einfache-Sprache-Toggle erhält Partei-Vergleichsauswahl** – `populatePartyDropdowns()` liest vor dem Neuaufbau die angehakten Parteien und stellt sie wieder her.
- [x] **P3: `togglePartyDetail`-Parteiname escaped** – `onclick` via `escapeHtmlAttr`.
- [x] **P3: Swipe-Dead-Zone (~10 px)** – winziges `touchmove` deaktiviert die Geste nicht mehr dauerhaft.

## Review vom 2026-08-04 (gesamtes Projekt, Node-Simulation + DOM-Harness)

Vollständiger Bericht: `reports/review-2026-08-04.md`. Koalitions-/Sitzwerte und i18n-Abdeckung per Node gegen die echten Datendateien re-verifiziert (siehe „Verifiziert").



### P2 – Fehlende Features


- [x] **Partei-Vergleich: Quellen & Begründungen nur per Hover** – `updatePartyComparison()` (script.js:1752–1763) versteckt `quelle`/`begruendung` im `title`-Tooltip; auf Mobilgeräten unerreichbar, obwohl README:13 „mit Quellen und Begründungen" zusagt.
- [x] **Kein Prompt/Asset für fehlende `werte.json`-Zusatzdaten** – README:51 verlinkt nur `prompt-gemini-fragen.md`; es fehlt ein `prompt-gemini-daten.md` für `verlauf`, `rss`, `kandidaten`, `spitzenkandidat` (Datenlücke in 3 von 4 Wahlen). Build-on für Issue „Another Md file for Gemini".

### P3 – Verbesserungen


- [x] **`prompt-gemini-fragen.md` ohne Pflichtfeld `thema`** – ergänzt (gültige Topic-Keys + Feld-Tabelle + Beispiel). Neue Gemini-Fragen ohne `thema` treffen den Keyword-Fallback von `determineTopic()` (script.js:1713) daneben (z. B. btw2029 #34 „Rundfunk"→„Inneres", LSA #33 „Verwaltungsdigitalisierung"→„Außenpolitik").
- [x] **Inkonsistentes HTML-Escaping** – behoben: `p.beschreibung` (script.js:455, 529), `p.website`-href (:461, :540, :544), Kandidaten-Namen, `s.zitat`/`s.begruendung`/`s.quelle` (:1035–1037) und Vergleich jetzt einheitlich via `escapeHtml`/`escapeHtmlAttr`; `title`-Attribut im Vergleich entfällt (sichtbare Quellen-Spalte).
- [x] **`renderPartyProgramm()` kürzt still auf 3 Punkte pro Thema/Richtung** (script.js:659–660 `slice(0,3)`) – neuer „… und {n} weitere Punkte"-Hinweis (`programmMore`).
- [x] **Kein UI-Hinweis auf Tastatursteuerung (1/2/3/Pfeile)** – `.keyboard-hint` im Test-Tab ergänzt (`keyboardHint`-Key).

### Verifiziert


- [x] Koalitionswerte unverändert: btw2029 max 50,9 %, LSA 52,0 %, Berlin 48,0 %, MV 58,7 %; Sitzsummen 630/87/130/71, Verfahren `sainteLague`/`dhondt`.
- [x] i18n vollständig (inkl. `party.notFound` seit 2026-08-05); einfache Sprache deckt 170 Fragen.
- [x] Keine fehlenden Parteien/Farben, keine ungültigen `wert`-Werte, keine doppelten `nr`, alle `thema`-Werte gültig.

## Review vom 2026-08-03 (Partei-Seite: Inhalte, Historie-Daten, Nachrichten)

Fokus der Nutzer-Meldung: „Auf der Partei-Seite sind Inhalte nur über den geteilten Link sichtbar; die historischen Daten funktionieren nicht; Aktuelle Nachrichten laden nicht (und sollten neutral und unabhängig von jeder Partei sein)." Verifiziert per Node gegen die echten Datendateien (`elections/*/werte.json`) und die Partei-Seiten-Funktionen in `script.js` (DOM-Shim-Harness). Vollständiger Bericht: `reports/review-2026-08-03-party-site.md`.



### P1 – Bugs


- [x] **`party.notFound` fehlt weiterhin in `einfache-sprache.json`** – behoben am 2026-08-05: Key ergänzt. Re-verifiziert: `es.ui['party.notFound']` → vorhanden.

## Mobile-Fixes vom 2026-08-03 (Issue #21: Buttons registrieren nicht + horizontales Scrollen + Partei-Seiten leer + Teilen-Fehler)

Umsetzung und Verifikation per Headless-Chromium (CDP, Viewports 320/360/375 px). Vollständiger Bericht: `reports/review-2026-08-03-mobile.md`.



### P1 – Bugs


- [x] **Partei-Seite ohne Inhalte** – `renderPartyProgramm()` (script.js:654): `entries.map(([topic, t]) => …)` überschattet die i18n-Funktion `t()` → `TypeError: t is not a function` → „Wahlprogramm" leer, `loadPartyNews()` nie erreicht (News hängt). Fix: Variable in `tdata` umbenannt. Verifiziert: AfD 29 Programm-Punkte/7 Themen, CDU/CSU (LSA) 20 Punkte.
- [x] **Teilen-Link zeigt dem Empfänger einen Fehler** – derselbe Crash in `renderPartyProgramm()` propagierte bis zum globalen Bootstrap-Catch → „⚠️ Fehler beim Laden." statt der geteilten Partei-Seite. Fix: siehe oben; Empfänger-Navigation `#w=…&p=AfD` öffnet die Partei-Seite ohne Fehler.
- [x] **Antwort-Buttons „registrieren nicht"** – nach dem Auto-Weiter lagen die Buttons der nächsten Frage unterhalb des Viewports (CDP: Q2-Button y=787 > 740). Fix: neue `scrollQuestionButtonsIntoView()` (script.js, `block:'nearest'`) in `showNextQuestion()`/`showPreviousQuestion()`/`initializeTest()`/`backToTest()`; `fadeIn`-Animation auf reine Opacity reduziert (styles.css), damit ein sich bewegendes Element keine Taps verschluckt.

### P2 – Fehlende Features


- [x] **Horizontales Scrollen durch überlaufenden Inhalt** – (1) Tab-Leiste: Labels brachen nicht um und wurden durch `overflow:hidden` abgeschnitten (scrollWidth 462 > 320); Fix: `white-space:normal` für `.tab-button` ≤480 px. (2) `.election-toggles`-Carousel (`nowrap`+`overflow-x:auto`), „Bundestagswahl 2029 (Umfrage)" allein 338 px breit; Fix: `flex-wrap:wrap` + `.election-toggle` darf umbrechen (≤600 px). (3) Body-Guard `overflow-x: clip` (styles.css) – kein horizontaler Seiten-Scroll durch breite Charts/URLs, `position:sticky` bleibt funktionsfähig.

### Verifiziert


- [x] Kein horizontales Seiten-Overflow auf allen 4 Tabs bei 320/360 px (`scrollWidth === innerWidth`).
- [x] Tab-Buttons ohne abgeschnittene Labels; Antwort-Buttons der Folgefrage im Viewport (inView:true).
- [x] Partei-Seiten öffnen ohne Exception (inkl. Kandidat „Reiner Haseloff" LSA); Teilen-Links (Partei & Ergebnis) werden beim Empfänger korrekt wiederhergestellt, keine Fehler-Notification.

## Review vom 2026-08-03 (6. Lauf, gesamtes Projekt)

Vollständiger Bericht: `reports/review-2026-08-03-b.md`. Keine neuen harten P1-Bugs; Koalitionswerte, Sitzsummen und i18n-Abdeckung per Node gegen die echten Datendateien re-verifiziert (siehe „Verifiziert"). Neue P2/P3-Befunde:



### P3 – Verbesserungen


- [x] **`party.notFound`-Key fehlt in einfache-sprache.json** – behoben am 2026-08-05: Key ergänzt.
- [x] **`user-match-bar` rendert ungültiges CSS bei `null`** – `updateKoalitionen()` (script.js:939) schreibt `width:null%` ohne Guard; behoben via `width:0`-Guard.
- [x] **Einfache-Sprache-Toggle setzt Partei-Vergleichsauswahl zurück** – `toggleSimpleLanguage()` → `populatePartyDropdowns()` (script.js:1853) baut `comparePartiesCheckboxes` neu auf (erste 2 Parteien); behoben am 2026-08-05: angehakte Parteien werden vor dem Neuaufbau gesichert und wiederhergestellt.
- [x] **Parteiname in `togglePartyDetail` unescaped** – `onclick="togglePartyDetail('${r.partei}')"` (script.js:1370) ohne `escapeHtmlAttr` (vgl. script.js:473); Parteiename mit `'` würde den Aufruf brechen. Behoben.

### Verifiziert (Re-Verifizierung dieses Laufes)


- [x] Koalitionswerte unverändert: btw2029 50,9 %, LSA 52,0 %, Berlin 48,0 %, MV 58,7 %; Minderheits-Koalitionen mit erwartbar hohen Werten.
- [x] Sitzsummen 630/87/130/71 = `meta.sitze`, Verfahren `sainteLague`/`dhondt` pro Wahl.
- [x] i18n: alle `data-i18n`- und `t()`-Keys vorhanden – bis auf `party.notFound`.
- [x] Keine Parteien in `fragen.json` fehlend in `werte.json`; keine Partei ohne Farbe; keine ungültigen `wert`-Werte.
- [x] `einfache-sprache.json` deckt alle 170 Fragen (45+40+52+33) samt `beschreibung` ab.

### Weiterhin offen (aus früheren Läufen, Zeilennummern aktualisiert)


- [x] **Swipe-Abbruch innerhalb einer Geste permanent** – behoben am 2026-08-05: Dead-Zone ~10 px vor der Richtungsprüfung; ein winziges `touchmove` deaktiviert die Geste nicht mehr dauerhaft.

## Review vom 2026-08-02 (5. Lauf, PR #18: Issue #17-Fixes im Merge-Review)

Merge-Review des PR „Issue #17 behoben: Swipe fix + Review umgesetzt" (`reports/review-2026-08-02-f.md`). Ergebnis: **PR mergefähig**, alle drei P1-Fixes zu Issue #17 sowie die P2/P3-Mitfixes per Node-Simulation und gegen die echten Datendateien verifiziert, keine Regressionen. Die folgenden Punkte sind Nachbesserungsvorschläge.



### P3 – Verbesserungen (neu)


- [x] **Swipe-Abbruch permanent nach EINEM vertikal-dominierten `touchmove`-Event** – behoben am 2026-08-05: Dead-Zone ~10 px (Richtungsprüfung erst ab 10 px Gesamtbewegung); simulierte horizontale Swipe (2,4)→(150,8) wird nicht mehr verworfen.

### Verifiziert (Bestätigung der PR-Befunde)


- [x] Swipe-Fix (Issue #17): `touchmove`-Tracking + `.tabs`-Bindung + `swipeDisabled`-Reset – per Simulation verifiziert (diagonale Flicks `80/95` und `72/84` wechseln keinen Tab mehr, sauberer horizontaler Swipe 120/10 schon).
- [x] Ausschluss-Checkboxen: Menge = Parteien ≥ Sperrklausel, konsistent mit `berechneKoalitionen()` (alle 4 Wahlen).
- [x] Koalitionswerte unverändert: btw2029 max 50,9 %, LSA 52,0 %, Berlin 48,0 %, MV 58,7 %; Sitzsummen 630/87/130/71; keine fehlenden Parteien/Farben; i18n-Keys `questionCol`/`shareEmpty`/`shareCopied` vorhanden.

## Bugfix vom 2026-08-02 (Issue #17: Swipe-Handler & Folgebefunde)

Alle unten aufgeführten Befunde aus dem 4. Lauf wurden in `script.js` umgesetzt und per Node gegen die echten Datendateien verifiziert (`node --check script.js` OK, Swipe-Simulation, Share-Parsing-Test, Koalitions-/Sitzwerte unverändert). Vollständiger Bericht: `reports/review-2026-08-02-e.md`.



### P1 – Bugs


- [x] **Swipe-Handler ohne `touchmove`-Tracking** – Handler ist jetzt nur noch an der `.tabs`-Leiste gebunden (script.js:1620-1657); ein `touchmove`-Listener bricht die Geste ab, sobald die vertikale Bewegung die horizontale überwiegt. Simuliert: die reproduzierten diagonalen Scroll-Flicks `diffX=80/diffY=95` und `diffX=72/diffY=84` lösen keinen Tab-Wechsel mehr aus; ein sauberer horizontaler Swipe (120/10) funktioniert weiter.
- [x] **Swipe auf gesamten `.container` gebunden** – die Geste wird nur noch auf `.tabs` ausgelöst (das natürliche Ziel für Tab-Wechsel); ein vertikaler Scroll im Inhaltsbereich (Fragen/Koalitionen/Ergebnisse) kann nie mehr einen Tab wechseln. Die auf Mobilgeräten sticky Tab-Leiste bleibt als einziger Hotspot übrig – dort ist ein horizontaler Wisch auch gewollt.
- [x] **`swipeDisabled` wird bei `touchcancel` nicht zurückgesetzt** – `touchend`/`touchcancel` setzen das Flag jetzt zuverlässig zurück; zusätzlich `e.touches.length === 1`-Guard für Multi-Touch.

### P2 – Fehlende Features


- [x] **Ausschluss-Checkboxen für Parteien < Sperrklausel wirkungslos** – `populatePartyDropdowns()` (script.js:403-413) zeigt jetzt nur noch Parteien ≥ Sperrklausel (exakt die, die `berechneKoalitionen()` berücksichtigt); per Node für alle 4 Wahlen verifiziert (Bund: AfD/CDU/CSU/GRÜNE/LINKE/SPD usw.). Das `partyFilter`-Dropdown listet weiterhin alle antwortenden Parteien – das ist gewollt (Filter auf Ergebnisse).

### P3 – Verbesserungen


- [x] **Hartkodierter Tabellenkopf „Frage" in `updatePartyComparison()`** – nutzt jetzt `t('questionCol')` (script.js:1425), konsistent zu `togglePartyDetail()`.
- [x] **„Ergebnis teilen" im Koalitionen-Tab ohne Test blockiert** – `shareResults()` (script.js:82-113) erlaubt `&c=` auch ohne beantwortete Fragen; `parseShareHash()` akzeptiert leere `&a=` (Regex `([^&]*)`). Verifiziert: `#w=btw2029&a=&c=…` wird korrekt geparst und stellt die Koalitions-Sicht wieder her.

## Review vom 2026-08-02 (4. Lauf, Issue #17: Tab-Wechsel beim vertikalen Scrollen)

Fokus: Issue #17 – Swipe-Geste wechselt beim vertikalen Scrollen weiterhin Tabs. Vollständiger Bericht: `reports/review-2026-08-02-d.md`. Ursache per Node-Simulation bestätigt: Der Handler prüft nur Start-/Endkoordinaten, diagonale Flicks (z. B. 80 px horizontal / 95 px vertikal) passieren die 1.2×-Regel.



### P1 – Bugs


- [x] **Swipe-Handler ohne `touchmove`-Tracking** – gefixt am 2026-08-02 (siehe Abschnitt „Bugfix vom 2026-08-02"): `touchmove`-Listener bricht die Geste bei vertikal-dominanter Bewegung ab; diagonaler Flick `diffX=80/diffY=95` und `diffX=72/diffY=84` lösen keinen Tab-Wechsel mehr aus.
- [x] **Swipe auf gesamten `.container` gebunden** – gefixt am 2026-08-02: Swipe wird nur noch auf der `.tabs`-Leiste ausgelöst; `.election-toggles/.cmp-wrap/.tr-detail-table`-Ausnahme entfällt.
- [x] **`swipeDisabled` wird bei `touchcancel` nicht zurückgesetzt** – gefixt am 2026-08-02: `touchend`/`touchcancel` setzen das Flag zurück, zusätzlich `e.touches.length === 1`-Guard.

### P2 – Fehlende Features


- [x] **Ausschluss-Checkboxen für Parteien < Sperrklausel wirkungslos** (offen seit 2. Lauf) – gefixt am 2026-08-02: `populatePartyDropdowns()` zeigt nur noch Parteien ≥ Sperrklausel; FDP/BSW (btw2029) erscheinen nicht mehr als wirkungslose Checkboxen.

### P3 – Verbesserungen


- [x] **Hartkodierter Tabellenkopf „Frage" in `updatePartyComparison()`** – gefixt am 2026-08-02: nutzt `t('questionCol')` (script.js:1425).
- [x] **„Ergebnis teilen" im Koalitionen-Tab ohne Test blockiert** – gefixt am 2026-08-02: `&c=` auch ohne beantwortete Fragen; `parseShareHash()` akzeptiert leere `&a=`.

## Bugfix-Implementierung vom 2026-08-03 (Issue: resolve Bugs)

Alle unten markierten Befunde wurden in `script.js`/`index.html`/`styles.css`/`einfache-sprache.json`/`werte.json` umgesetzt und per Node gegen die echten Datendateien verifiziert (`node --check script.js` OK, alle JSON valide, i18n-Key-Check vollständig). Vollständiger Bericht: `reports/review-2026-08-03.md`.



### P1 – Bugs


- [x] **Einfache Sprache wird beim Reload nicht angewendet** – `applyStaticI18n()` wird jetzt in `loadElections()` nach dem Fetch von `einfache-sprache.json` erneut aufgerufen (script.js:335-337).
- [x] **`createSeatChart()` ohne Leer-Guard** – bei keiner Partei über der Sperrklausel zeigt `createSeatChart()` jetzt `showChartPlaceholder('seatChart', …)` statt eines leeren Pie-Charts „0 Sitze" (script.js:1261-1266).
- [x] **Rein neutrale Antworten → 0 %** – `match` ist jetzt `null` statt 0 und wird als „–" angezeigt; Pie-Chart und `saveTestResult()` entfallen bei `usableAnswered === 0`; neuer Hinweis `neutralHint`; `berechneUserMatchFuerKoalition()` liefert bei 0 verwertbaren Antworten `null` (Anzeige „–", Sortierung ans Ende).
- [x] **`noPartyInfo`-Key mit zwei Fallback-Texten** – der zweite Text nutzt jetzt den eigenen Key `partyInfoPending` (script.js:436).
- [x] **Hartkodierte Strings** – „Quelle: " (`sourceLabel`), Tabellenkopf „Frage/Sie" (`questionCol`/`youCol`), Legende ✓/✗/— (`legendAgree`/`legendDisagree`/`legendNotComparable`), Toggle-Label „Einfache Sprache" (`simpleLangLabel`, index.html:22).

### P2 – Fehlende Features


- [x] **„Fortsetzen" springt nach Reload zu Frage 1** – `saveTestState()` speichert jetzt `currentQuestion`; `initializeTest()` stellt die Position wieder her (geclampt); `showNextQuestion()`/`showPreviousQuestion()` persistieren die Position.
- [x] **`saveTestResult()` bei 0 verwertbaren Antworten** – Historie-Speicherung nur noch bei `usableAnswered > 0` (übersprungener Test verdrängt kein echtes Ergebnis mehr).
- [x] **Teilen-Link verliert neutrale Antworten** – `shareResults()` kodiert jetzt auch `m`-Antworten (Filter: j/n/m statt nur j/n).
- [x] **Parteien mit wenigen beantworteten Fragen** – Partei-Karten zeigen „Nur X von N Fragen beantwortet" (`fewAnswersHint`); verifiziert: Berlin Volt/Tierschutz nur 3/52.
- [x] **„Ergebnis teilen" im Koalitionen-Tab** – `shareResults()` hängt `&c=` (Typ/Mindestmatch/Partei-Filter/Ausschlüsse) an; `applyPendingShare()` stellt die Koalitions-Sicht wieder her.
- [x] **Partei-Filter-Dropdown inkonsistent** – Filter listet jetzt alle antwortenden Parteien (auch unter der Sperrklausel), passend zur Ergebnisliste.
- [x] **Cross-Election-Leak** – `window.parteienData = data.fragen || null` statt `|| window.parteienData`; `initializeTest()` zeigt bei fehlenden Fragen einen Empty-State.

### P3 – Verbesserungen


- [x] **Sitzverteilung d'Hondt/Sainte-Laguë** – Verfahren pro Wahl via `meta.verfahren` konfigurierbar (btw2029 `sainteLague`, Landtagswahlen `dhondt`); verifiziert: LSA AfD 43 statt 42, alle Summen = `gesamtSitze`.
- [x] **Paar-Durchschnitt verdeckt Fundamentalkonflikte** – neue `berechnePaarAgreements()` + `minPaar` in Koalitions-Karten und „Beste Koalition" (z. B. AfD+CDU/CSU+GRÜNE 33,7 % bei AfD–GRÜNE 0 %).
- [x] **`createCoalitionPotentialChart()` sortiert Cache in-place** – Kopie via `.slice()`.
- [x] **„Beste Koalition für Sie" ignoriert Ausschluss-Filter** – nutzt jetzt `berechneKoalitionen('beide', excludeParties)`.
- [x] **ECharts-CDN ohne Fallback** – `initChart()`/`initTestResultPieChart()` zeigen `chartLoadError`-Platzhalter statt zu werfen.
- [x] **Historie-Löschung bei verstecktem Daten-Tab** – `createTopicChart()` nur bei aktivem Daten-Tab.
- [x] **`welcome-card-type` nicht i18n** – Keys `typeBundestagswahl`/`typeLandtagswahl`/`typeAbgeordnetenhauswahl`.
- [x] **`minMatch`-Slider-Label initial „0 %"** – Label wird in `setActiveElection()` synchronisiert.
- [x] **`maxCoalitionSize: 5` in LSA** – auf 4 vereinheitlicht.
- [x] **Transparenz-Hinweise** – Methodik-Box und Ergebnis erwähnen: neutrale Antworten fließen nicht ein (`neutralHint`/`methodologyNote`), Koalitionen sind rein mathematisch (`methodologyMathHint`).

## Review vom 2026-08-02 (3. Lauf, MD-Abgleich, HEAD `183fea0`)

Fokus (Issue #13): Abgleich von `README.md`/`todo.md` mit dem Code-Stand und Zusammenführung aller `reports/*.md` in diese Liste. Status per Node gegen die echten Datendateien und `script.js` verifiziert. Vollständiger Bericht: `reports/review-2026-08-02-c.md`. **Alle unten offenen Punkte sind durch den Bugfix-Lauf vom 2026-08-03 behoben.**



### P1 – Bugs


- [x] **`pendingAdvanceTimer`-Race beim Wahlwechsel** (2. Lauf, war fälschlich offen) – gefixt: `resetTest()` ruft `cancelPendingAdvance()` (script.js:556), `setActiveElection()` ruft `resetTest()`.
- [x] **`createStatsSummary()` TypeError bei leerem `umfragewerte`** (2. Lauf, war fälschlich offen) – gefixt durch Empty-Guard (script.js:1088-1091).
- [x] **Einfache Sprache wird beim Reload nicht angewendet** (2. Lauf) – gefixt am 2026-08-03: `applyStaticI18n()` wird in `loadElections()` nach dem `einfache-sprache.json`-Fetch erneut aufgerufen.
- [x] **`berechneSitze()`-Befund präzisiert** (2. Lauf) – kein NaN mehr (leere Liste → leeres Array), `createSeatChart()` hat jetzt einen Leer-Guard mit Empty-State.
- [x] **Rein neutrale Antworten → 0 % für alle Parteien trotz „X/X Fragen beantwortet"** (Nachtrag) – gefixt am 2026-08-03: `match` `null` → „–", `neutralHint`, `saveTestResult()`-Guard, `berechneUserMatchFuerKoalition()` → `null`.
- [x] **`noPartyInfo`-Key mit zwei Fallback-Texten** (aus review-2026-08-01) – gefixt am 2026-08-03: eigener Key `partyInfoPending`.

### P1 – Einfache Sprache


- [x] **btw2029 ohne einfache Sprache** – erledigt: `einfache-sprache.json` übersetzt alle 45 btw2029-Fragen; Gesamtabdeckung 170 (45+40+52+33). P2-Eintrag „Kein Hinweis auf fehlende einfache Sprache bei btw2029" (2. Lauf) ist damit gegenstandslos.
- [x] **Hartkodierte Strings** – gefixt am 2026-08-03: `sourceLabel`, `questionCol`/`youCol`, `legendAgree`/`legendDisagree`/`legendNotComparable`, `simpleLangLabel`.

### P2 – Fehlende Features


- [x] **„Fortsetzen" springt nach Reload immer zu Frage 1** (2. Lauf) – gefixt am 2026-08-03: `currentQuestion` wird gespeichert und wiederhergestellt.
- [x] **`saveTestResult()` speichert auch bei 0 verwertbaren Antworten** (Nachtrag) – gefixt am 2026-08-03: Speicherung nur bei ≥ 1 j/n-Antwort.
- [x] **Teilen-Link verliert neutrale Antworten** (aus review-2026-08-01) – gefixt am 2026-08-03: `m` wird mitkodiert.
- [x] **Parteien mit wenigen beantworteten Fragen verzerren Ergebnisliste** (aus review-2026-08-01) – gefixt am 2026-08-03: Hinweis „Nur X von N Fragen beantwortet" (`fewAnswersHint`).

### P3 – Verbesserungen


- [x] **README aktualisiert** – „125 Fragen in einfacher Sprache" → 170 (README.md Z. 14); neue Features dokumentiert (Teilen-Link, Fortsetzen-Hinweis, Antworten zurücksetzen, paarweiser Koalitionsalgorithmus).
- [x] **`reports/*.md` in diese Liste übernommen** – alle offenen Befunde aus review-2026-08-01/-02/-02-b sind jetzt in `todo.md` vertreten (inkl. drei zuvor fehlender), Status verifiziert.

## Automatisiertes Review vom 2026-08-02 (2. Lauf, HEAD `918d05f`)



### P1 – Bugs


- [x] **Einfache Sprache wird beim Reload nicht angewendet** – gefixt am 2026-08-03: `applyStaticI18n()` wird in `loadElections()` nach dem `einfache-sprache.json`-Fetch erneut aufgerufen.
- [x] **`pendingAdvanceTimer`-Race beim Wahlwechsel** – gefixt: `selectAnswer()`-Timer (script.js:672-679) wird von `resetTest()` über `cancelPendingAdvance()` (script.js:556/660-662) gecleart; `setActiveElection()` ruft `resetTest()`.
- [x] **`createStatsSummary()` wirft TypeError bei leerem `umfragewerte`** – gefixt durch Empty-Guard (script.js:1088-1091); `reduce` nur noch auf nicht-leerer Liste.
- [x] **`berechneSitze()` ohne Leer-Guard (NaN-Aussage präzisiert, siehe 3. Lauf)** – gefixt am 2026-08-03: `createSeatChart()` zeigt bei keiner Partei über der Sperrklausel einen Empty-State statt des leeren Pie-Charts.

### P2 – Fehlende Features


- [x] **„Fortsetzen" springt nach Reload immer zu Frage 1** – gefixt am 2026-08-03: `saveTestState()` speichert `currentQuestion`; `initializeTest()` stellt die Position wieder her.
- [x] **Kein Hinweis auf fehlende einfache Sprache bei btw2029** – gegenstandslos: btw2029 ist inzwischen vollständig übersetzt (`einfache-sprache.json`, 45 Fragen; Gesamt 170).

### P3 – Verbesserungen


Hinweis (erledigt seit 1. Lauf): `noData`-Key ist inzwischen vorhanden (`einfache-sprache.json` Zeile 98) – der P3-Eintrag „`noData`-Key fehlt" weiter unten ist abgehakt.

- [x] **Sitzverteilung nutzt Largest-Remainder statt d'Hondt/Sainte-Laguë** – gefixt am 2026-08-03: Verfahren pro Wahl konfigurierbar via `meta.verfahren` (`sainteLague` für btw2029, `dhondt` für Landtagswahlen); verifiziert weicht ltw-sachsen-anhalt jetzt nicht mehr ab (AfD 43 statt 42, LINKE 14 statt 15).
- [x] **Hardcodierte Strings nicht übersetzbar** – gefixt am 2026-08-03: `sourceLabel`, `questionCol`/`youCol`, `legendAgree`/`legendDisagree`/`legendNotComparable`, `simpleLangLabel`; Platzhalter „Test durchführen…" war bereits über `topicChartEmpty` gelöst.
- [x] **Ausschluss-Checkboxen für Parteien < 5 % wirkungslos** – gefixt am 2026-08-02: `populatePartyDropdowns()` (script.js:403-413) zeigt nur noch Parteien ≥ Sperrklausel; BSW/FDP (btw2029) erscheinen nicht mehr als wirkungslose Checkboxen.
- [x] **Fallback `data.fragen || window.parteienData` mischt Wahlen** – gefixt am 2026-08-03: `window.parteienData = data.fragen || null` + Empty-State in `initializeTest()`.
- [x] **`welcome-card-type` nicht i18n** – gefixt am 2026-08-03: Keys `typeBundestagswahl`/`typeLandtagswahl`/`typeAbgeordnetenhauswahl`.

## Bugfix vom 2026-08-02 (Issue: Abgeordnetenhauswahl ist keine Landtagswahl)



### P1 – Bugs


- [x] **Berlin 2026 fälschlich als „Landtagswahl" ausgewiesen** – `elections.json` (`type` des `berlin-2026`-Eintrags) auf `"Abgeordnetenhauswahl"` korrigiert; angezeigt über `renderWelcomeCards()` (script.js:254). Keine Logik verzweigt auf den Typ.
- [x] **FDP-Begründung „Berliner Landtagswahlen"** – `elections/berlin-2026/fragen.json` (Frage 23, FDP) auf „Berliner Abgeordnetenhauswahl" korrigiert.

## Automatisiertes Review vom 2026-08-02 (2. Lauf, Nachtrag)

Vollständiger Bericht: `reports/review-2026-08-02-b.md`. Alle Befunde per Node gegen die echten Datendateien verifiziert.



### P1 – Bugs


- [x] **Rein neutrale Nutzer-Antworten → 0 % für alle Parteien trotz „X/X Fragen beantwortet"** – gefixt am 2026-08-03: `match` ist bei `total===0` jetzt `null` (Anzeige „–" statt 0 %), `neutralHint` erklärt das Verhalten, `saveTestResult()` wird nur bei ≥ 1 j/n-Antwort aufgerufen; `berechneUserMatchFuerKoalition()` liefert `null` statt 0.

### P2 – Fehlende Features


- [x] **`saveTestResult()` speichert auch bei 0 verwertbaren Antworten** – gefixt am 2026-08-03: Historie-Speicherung nur bei `usableAnswered > 0`; übersprungener Test verdrängt kein echtes Ergebnis mehr.
- [x] **Kein Transparenz-Hinweis, dass Koalitionen rein mathematisch sind** – gefixt am 2026-08-03: neuer `methodologyMathHint` in der Methodik-Box; zusätzlich `minPaar`-Anzeige macht Fundamentalkonflikte (z. B. AfD–GRÜNE 0 %) sichtbar.
- [x] **Kein Hinweis, dass neutrale Antworten die Frage aus dem Match entfernen** – gefixt am 2026-08-03: `neutralHint` im Ergebnis + Ergänzung in `methodologyNote`.
- [x] **„Ergebnis teilen"-Button im Koalitionen-Tab teilt den Test, nicht die Koalitions-Sicht** – gefixt am 2026-08-03: `&c=`-Parameter (Typ, Mindestmatch, Partei-Filter, Ausschlüsse) wird im Koalitionen-Tab mitgeteilt und von `applyPendingShare()` wiederhergestellt.
- [x] **Partei-Filter-Dropdown inkonsistent mit dem Ergebnis** – gefixt am 2026-08-03: Filter nutzt `relevant` (antwortende Parteien inkl. unter Sperrklausel) statt nur ≥ 5 %.
- [x] **Cross-Election-Leak bei `fragen.json`-Ladefehler** – gefixt am 2026-08-03: `window.parteienData = data.fragen || null`.

### P3 – Verbesserungen


- [x] **Paar-Durchschnitt verdeckt Fundamentalkonflikte** – gefixt am 2026-08-03: `berechnePaarAgreements()` + `minPaar` in Koalitions-Karten und „Beste Koalition".
- [x] **`maxCoalitionSize: 5` in `elections/ltw-sachsen-anhalt-2026/config.json` abweichend** – gefixt am 2026-08-03: auf 4 vereinheitlicht.
- [x] **README „125 Fragen in einfacher Sprache" veraltet** – korrigiert auf 170 (45+40+52+33) in `README.md` Z. 14 (siehe 3. Lauf).
- [x] **Hartkodierte Strings „Quelle: " (script.js:629) und „Frage" (script.js:752, 1278)** – gefixt am 2026-08-03: i18n-Keys `sourceLabel`, `questionCol`/`youCol` ergänzt.
- [x] **Berlin: Volt/Tierschutz 49/52 × neutral** – gefixt am 2026-08-03: Partei-Karten zeigen „Nur X von N Fragen beantwortet" (`fewAnswersHint`).
- [x] **`createCoalitionPotentialChart()` sortiert den `koalitionenCache` in-place** (script.js:1149) – gefixt am 2026-08-03: `.slice()` vor dem Sortieren.
- [x] **„Beste Koalition für Sie" ignoriert Ausschluss-Filter des Koalitionen-Tabs** – gefixt am 2026-08-03: `berechneKoalitionen('beide', excludeParties)`.
- [x] **ECharts-CDN ohne Fallback** – gefixt am 2026-08-03: `initChart()`/`initTestResultPieChart()` zeigen `chartLoadError`-Platzhalter.
- [x] **`minMatch`-Slider-Label initial „0 %"** (index.html:102) – gefixt am 2026-08-03: Label wird in `setActiveElection()` synchronisiert.
- [x] **`deleteTestHistoryEntry()`/`clearTestHistory()` zeichnen `createTopicChart()` bei verstecktem Daten-Tab** – gefixt am 2026-08-03: nur bei aktivem Daten-Tab.

## Fixes vom 2026-08-02 (Issue: Resolve todo.md)



### P1 – Bugs


- [x] **Chart-Platzhalter zerstört Chart-DIV dauerhaft** – neu `showChartPlaceholder(id, text)` in `script.js`: Chart wird `dispose()` + aus `chartInstances` gelöscht, das Chart-`<div>` wird nur versteckt (statt per `parentElement.innerHTML` ersetzt); `initChart()` entfernt den Platzhalter und blendet das DIV wieder ein. Gilt für `createPartyOverviewChart()`, `createCoalitionPotentialChart()`, `createTopicChart()`. Zusätzlich Guard im `resize`-Handler gegen disposed Instanzen (`isDisposed()`).
- [x] **Re-Entry-Race in `showTestResults()`** – neuer Helper `cancelPendingAdvance()`; wird am Anfang von `showTestResults()`, `skipQuestion()`, `showNextQuestion()`, `showPreviousQuestion()`, `resetTestAndRestart()`, `backToTest()` aufgerufen. Kein doppelter `saveTestResult()`-Eintrag/Toast mehr.
- [x] **Antwort-Timer springt Frage per Pfeiltaste/„Weiter"** – `showNextQuestion()`/`showPreviousQuestion()` räumen `pendingAdvanceTimer` jetzt ab.

### P1 – Algorithmus


- [x] **`berechneUebereinstimmung()` bestraft Mehrparteien-Koalitionen** – auf paarweise Übereinstimmung umgestellt: pro Frage werden alle Parteienpaare verglichen, die beide j/n antworten (gleiche Antwort = 1, Konflikt = 0); `m` zählt weder im Zähler noch im Nenner. Verifiziert per Node: btw2029 max 50,9 % (11/11 Koalitionen ≥ 20), Berlin max 48 % (9/9), MV max 58,7 % (11/11), LSA max 52 % (6/6). Koalitionen-Tab bei Schwelle 20 ist damit in allen Wahlen gefüllt.
- [x] **Neutral-Baseline herausgerechnet** – reine all-m-Fragen tragen durch das Paarvergleichs-Verfahren keine vergleichbaren Paare bei; nur wenn gar keine vergleichbaren Paare existieren, wird 50 % (neutral) zurückgegeben.

### P2 – Fehlende Features


- [x] **Willkommens-Karten nach Toggle im App-Bereich nicht aktualisiert** – `toggleSimpleLanguage()` rendert `renderWelcomeCards()` jetzt immer (nicht nur bei sichtbarem Welcome-Screen); zusätzlich wird `populatePartyDropdowns()` neu aufgebaut, damit die i18n-„Alle Parteien"-Option korrekt übersetzt ist.
- [x] **„Beste Koalition für Sie" bei 0 beantworteten Fragen irreführend** – `showTestResults()` zeigt den Best-Koalitions-Block nur noch bei `anyUserAnswer === true`.
- [x] **`clearTestState` ungenutzt / kein Reset-UI** – neuer Button „Antworten zurücksetzen" (`resetAnswers()`) im Test-Tab, löscht Antworten, wichtige Fragen und den gespeicherten Test-Zustand.
- [x] **Kein UI-Hinweis auf Fortsetzen** – `initializeTest()` zeigt bei vorhandenem `testState-<electionId>` einen Hinweis „Fortgesetzt: X von Y Fragen beantwortet" (`#resumeHint`, i18n-Key `resumeHint`).
- [x] **„Parteien & Kandidaten" ohne Daten** – alle 4 `werte.json` um `beschreibung` + `website` für jede Partei ergänzt; für die drei Landtagswahlen zusätzlich `kandidaten` (bekannte Landesvorsitzende/Ministerpräsidenten: Haseloff, Pähle, Reichardt, Wegner, Brinker, Schwesig, Holm). btw2029 bewusst ohne erfundene Kandidatennamen.

### P3 – Verbesserungen


- [x] **`noData`-Key** – war in `einfache-sprache.json` bereits vorhanden; neue Keys ergänzt: `topicChartEmpty`, `resetAnswers`, `answersReset`, `resumeHint`.
- [x] **„Alle Parteien"-Option hartkodiert** – `populatePartyDropdowns()` nutzt `t('allParties')` und setzt `data-i18n="allParties"`.
- [x] **`redrawCharts()` ohne Ergebnis-Pie-Chart** – `lastTestResults` wird in `showTestResults()` gespeichert; Theme-Wechsel zeichnet das Pie-Chart bei sichtbarem Ergebnis neu.
- [x] **`elections.json` `default: true` ungenutzt** – `loadElections()` wählt jetzt `default`-Wahl als Fallback (nach Teilen-Link und gespeicherter Wahl).
- [x] **`parteien.json`-Fallback existiert nicht** – toter Fetch in `loadElections()` entfernt.
- [x] **`chartInstances`-Leak im Platzhalter-Pfad** – `showChartPlaceholder()` löscht die Instanz aus `chartInstances`.
- [x] **Teilen-URL-Länge** – kompakte Kodierung „index+antwort" (z. B. `0j1n3j`) statt `0:j,1:n`; `parseShareHash()` akzeptiert Alt- und Neuformat.
- [x] **`berechneKoalitionen('beide')`-Cache** – `maxSize` ist jetzt Teil des Cache-Keys.

## Automatisiertes Review vom 2026-08-02 (gesamtes Projekt)



### P1 – Bugs


- [x] **Chart-Platzhalter zerstört Chart-DIV dauerhaft** – `createTopicChart()` (script.js:1109-1113), `createPartyOverviewChart()` (script.js:1018-1022), `createCoalitionPotentialChart()` (script.js:1060-1064): Leer-Fall ersetzt das Chart-`<div>` per `parentElement.innerHTML = '<p>…'` → `initChart()` (script.js:974) findet das Element nie wieder; Themenverteilung bleibt nach erstem Daten-Tab-Besuch vor dem Test dauerhaft leer. Zusätzlich `chartInstances`-Referenz auf disposed Instanz (resize-Handler script.js:1418).
- [x] **Re-Entry-Race in `showTestResults()` weiterhin offen** (aus review-2026-08-01, nie getrackt) – `skipQuestion()` (script.js:625) und „Ergebnis anzeigen" (index.html:80) clearen `pendingAdvanceTimer` aus `selectAnswer()` (script.js:614) nicht → doppelter `saveTestResult()`-Eintrag (script.js:914) + doppelter Toast.
- [x] **Antwort-Timer springt Frage per Pfeiltaste/„Weiter" weiterhin offen** (aus review-2026-08-01) – `showNextQuestion()` via ArrowRight (script.js:1430) löscht `pendingAdvanceTimer` nicht → Frage wird übersprungen.

### P1 – Algorithmus


- [x] **`berechneUebereinstimmung()` bestraft Mehrparteien-Koalitionen systematisch** – j/n-Konflikt → 0, `m` zählt in Nenner (script.js:437-453); verifiziert: Berlin max 9,1 %, btw2029 max 28,1 % → Koalitionen-Tab bei Schwelle 20: Berlin 0/9, btw2029 1/11. 2-Parteien-Paare erreichen 78-90 % (AfD+CDU/CSU), aber keine Mehrheit. Vorschlag: pairwise-Agreement oder Schwellen pro Wahl kalibrieren.
- [x] **Neutral-Baseline (all-m → 0,5) bei aktuellen Daten vernachlässigbar** – all-m-Fragen 0-9 % pro Koalition; Befund aus review-2026-08-01 präzisiert (Haupteffekt: `m` drückt via Nenner). All-m-Fragen trotzdem aus Basis herausrechnen.

### P2 – Fehlende Features


- [x] **Willkommens-Karten nach Toggle im App-Bereich nicht aktualisiert** – `toggleSimpleLanguage()` (script.js:1298-1299) rendert `renderWelcomeCards()` nur bei sichtbarem Willkommens-Screen; „Wechseln" (`showElectionSelector()`, script.js:148) zeigt alte Sprache.
- [x] **„Beste Koalition für Sie" bei 0 beantworteten Fragen irreführend** (weiterhin offen, aus review-2026-08-01) – `showTestResults()` (script.js:819-821) ohne `anyUserAnswer`-Guard; bei `minMatch`=0 zeigt btw2029 AfD+CDU/CSU+GRÜNE (10,4 %) statt Maximum 28,1 %.

### P3 – Verbesserungen


- [x] **`noData`-Key fehlt in `einfache-sprache.json`** – `createPartyOverviewChart()` (script.js:1021) bleibt im Einfachsprache-Modus unübersetzt.
- [x] **„Alle Parteien"-Option hartkodiert** – `populatePartyDropdowns()` (script.js:345) überschreibt i18n-Option `<option data-i18n="allParties">` (index.html:113).
- [x] **`redrawCharts()` ohne Ergebnis-Pie-Chart** – Theme-Wechsel aktualisiert `testResultPieChart` (script.js:712) nicht (nur `daten-content`, script.js:1266).
- [x] **`elections.json` `default: true` ungenutzt** – `loadElections()` (script.js:287-290) ignoriert das Flag.
- [x] **`parteien.json`-Fallback existiert nicht** – toter Fetch in `loadElections()` (script.js:271-274).
- [x] **`chartInstances`-Leak im Platzhalter-Pfad** – `dispose()` ohne `delete chartInstances[id]` (script.js:1109/1018/1060).

## Mobile Fix vom 2026-08-01 (Issue: Mobile Bugs)



### P1 – Bugs


- [x] **Tab-Wechsel beim Scrollen auf Mobilgeräten** – Swipe-Geste in `script.js` (`touchend`-Handler): bisher wechselte der Tab schon ab 60 px horizontaler Finger-Bewegung – auch beim normalen vertikalen Scrollen mit leichter Drift („Switches Sites"). Fix: horizontale Distanz muss ≥ 70 px betragen und die vertikale klar überwiegen (`Math.abs(diffY) > Math.abs(diffX) * 1.2` → kein Wechsel); zusätzlich wird die Geste in horizontal scrollbaren Bereichen (`.election-toggles`, `.cmp-wrap`, `.tr-detail-table`) ignoriert.
- [x] **Charts nach Viewport-Änderung abgeschnitten/verzerrt** – neuer debounced `resize`-Listener ruft `chart.resize()` für alle ECharts-Instanzen auf (Mobile-URL-Bar, Rotation), statt sie unskaliert zu lassen.

## Automatisiertes Review vom 2026-08-01 (gesamtes Projekt)



### P1 – Bugs


- [x] **Sitzverteilung zeigt immer 736 Sitze** – `berechneSitze()` (script.js:1209) liest `config.meta.gesamtSitze`, das nie aus `werte.json`→`meta.sitze` (630/87/130/71) befüllt wird (`setActiveElection`, script.js:198-201, kopiert nur `sperrklausel`); verifiziert per Node – „gefixt"-Eintrag oben trifft auf aktuellen Code nicht zu.
- [x] **Absturz bei kaputtem Teilen-Link** – `parseShareHash()` (script.js:99): `decodeURIComponent(location.hash)` ohne try/catch; `#w=…%zz` → URIError → App bootet nicht (Loading-Overlay hängt).
- [x] **Einfache-Sprache-Toggle im Ergebnis dupliziert Historie** – `toggleSimpleLanguage()` (script.js:1300) ruft `showTestResults()` erneut auf → `saveTestResult()` (script.js:912) pusht ohne `suppressHistorySave` einen Doppel-Eintrag + „Ergebnis gespeichert!"-Toast.
- [x] **Antwortänderung überspringt Frage** – `selectAnswer()` (script.js:596) plant `showNextQuestion()` per `setTimeout(300)`; Antwortwechsel innerhalb 300 ms (Tastatur 1→3) feuert zwei Timer → Frage wird übersprungen (letzte Frage: doppeltes `showTestResults`).

### P1 – Algorithmus


- [x] **`minMatchForCoalition: 40` unkalibriert** – interne Übereinstimmung real max. 28,1 % (btw2029) / 9,1 % (Berlin); verifiziert: 0 von 11 bzw. 0 von 9 Mehrheitskoalitionen ≥ 40 % → Koalitionen-Tab standardmäßig leer und „Beste Koalition für Sie" (script.js:803-805) erscheint bei btw2029/Berlin nie; Default-Schwelle auf 20 gesenkt (config.json + alle elections/*/config.json).

### P1 – Einfache Sprache


- [x] **btw2029 ohne einfache Sprache** – `einfache-sprache.json` deckt nur ltw-sachsen-anhalt-2026/berlin-2026/mv-2026 ab; die Standard-Wahl btw2029 (45 Fragen) fällt über `simpleQuestionText()` (script.js:19) auf Normaltext zurück.

### P2 – Fehlende Features


- [x] **Partei-Filter enthält Parteien < Sperrklausel** – `populatePartyDropdowns()` (script.js:324-330) listet alle antwortenden Parteien, `berechneKoalitionen()` (script.js:403) filtert sie raus → Filter „FDP"/„BSW" (btw2029) ergibt immer „Keine passenden Koalitionen".
- [x] **„Parteien & Kandidaten" ohne Daten** – in allen 4 `werte.json` fehlen `beschreibung`/`kandidaten`/`website`; Seite zeigt nur Umfragewerte + Platzhalter.

### P3 – Verbesserungen


- [x] **`berechneUserMatch()` toter Code** – script.js:898 nirgends aufgerufen; nutzen oder löschen.
- [x] **Einfache-Sprache-Toggle verliert Testposition** – `toggleSimpleLanguage()` (script.js:1302) ruft `initializeTest()` (setzt `currentQuestion=0`) → Sprung zu Frage 1.
- [x] **Namenskonflikt Sitzzahl** – `werte.json` `meta.sitze` vs. `config.meta.gesamtSitze` (script.js:1209); eine Quelle festlegen.
- [x] **`createPartyOverviewChart()` ohne Leer-Guard** – `Math.max(...[])` (script.js:1015) → -Infinity bei Daten ohne Partei ≥ 1 %.
- [x] **Themenverteilung-Chart missverständlich** – `createTopicChart()` (script.js:1113) mappt j/n/m auf 100/0/50 mit `roseType:'radius'`: Positionswerte erscheinen als Häufigkeiten.

## P1 – Bugs


- [x] **FDP & BSW fehlen im Ergebnis/Koalitionen** – `showTestResults` zeigt jetzt alle Parteien, die in `fragen.json` antworten (nicht nur > Sperrklausel); `populatePartyDropdowns` ebenso. `berechneKoalitionen` filtert weiter über Sperrklausel – mathematisch korrekt, da Parteien unter 5 % keine Regierung bilden.
- [x] **Themen-Zuordnung kaputt** – `thema`-Feld in allen 4 `fragen.json` (45/40/52/33), `determineTopic` prüft `f.thema` zuerst, Fallback Keyword-Matching (Schuldenbremse, Aktienrente, Kernkraft, … erweitert); `Sonstiges`-Topic in config ergänzt. Test: btw2029 nur noch 1/45 in „Sonstiges" (vorher 28).
- [x] **Themenverteilung-Chart falsch nach Wahlwechsel** – `createTopicChart` filtert History nach `electionId`.
- [x] **Gesamtsitzzahl ungenau** – `berechneSitze` mit Largest-Remainder-Verfahren; Summe = `gesamtSitze` (Test: 630/630).
- [x] **`results[0]` Crash** – Guard: wenn keine Partei gematcht, Notification + zurück zum Test.
- [x] **ECharts-Leak** – `initTestResultPieChart` ruft `dispose()` vor `init()`.

## P1 – Einfache Sprache


- [x] **Willkommens-Karten nicht i18n** – `renderWelcomeCards()` wird beim Toggle neu aufgerufen (nutzt `t()`), Key `welcomeCardParties`/`welcomeCardQuestions` vorhanden.
- [x] **„Ergebnis gespeichert!" hartkodiert** – über `t('resultSaved')`.

## P1 – Algorithmus


- [x] **Beste Koalition ohne Constraints** – Filter: Mehrheit > 50 %, `anzahl <= maxCoalitionSize`, `uebereinstimmung >= minMatchForCoalition`; Sortierung nach Benutzer-Match.
- [x] **Konfig-Schwellen ungenutzt** – `maxCoalitionSize` (4) in `berechneKoalitionen` + Best-Koalition; `minMatchForCoalition` (40) als Slider-Default (nur wenn unangetastet) + Best-Koalition-Filter. `relevantParties` weiterhin ungenutzt → neuer Punkt unten.

## P2 – Fehlende Features


- [x] **Methodik-Transparenz** – Methodik-Box im Koalitionen-Tab (interner Match, Match mit Ihnen, 2×-Gewichtung).
- [x] **Ergebnis-Historie UI** – Daten-Tab: Liste mit Datum/Wahl/Top-Partei, Einzel-Löschen (✕), „Alle löschen".
- [x] **Teilen/Export** – `shareResults()` kopiert URL `#w=…&a=…&i=…` (Wahl, Antworten, wichtige Fragen); `parseShareHash`/`applyPendingShare` stellen beim Laden alles wieder her (kein History-Eintrag beim Teilen-Laden).
- [x] **Fortsetzen** – `loadTestState`/`saveTestState` pro Wahl (`testState-<electionId>`), gespeichert bei jeder Antwort + beim Wichtiger-Haken; `resetTestAndRestart` löscht den Zustand.
- [x] **2×-Gewichtung** – ★-Button an jeder Frage (`toggleImportant`), `frageGewicht()` doppelt in `showTestResults` und `berechneUserMatchFuerKoalition`.

## P3 – Algorithmus-Verbesserungen



- [x] **Interne Koalitionsübereinstimmung** – m→0,5, direkter Konflikt (j/n gemischt)→0, sonst relative Konsistenz; keine künstlich guten „Neutral"-Parteien mehr.
- [x] **Sitzgewichtung** – `berechneUserMatchFuerKoalition` gewichtet Parteien nach Umfragewert (prozent).
- [x] **`thema`-Feld in fragen.json** – alle 4 Wahlen; Keyword-Matching nur noch Fallback.
- [x] **Memoization** – Koalitionsberechnung gecacht (`koalitionenCache` + Key), invalidiert bei Wahlwechsel.

## Neu – Selbst-Review 01.08.2026 (nach Fixes)


- [x] **`relevantParties` (3) ungenutzt** – Schwellwert existiert in config, wird aber nirgends gelesen; entweder nutzen (z. B. Partei-Filter-Dropdowns auf Top-N begrenzen) oder aus config entfernen.
- [x] **`berechneUserMatchNachThema` ohne 2×-Gewichtung** – Themen-Breakdown in den Ergebnis-Karten ignoriert `frageGewicht`; Gesamtmatch und Themenmatch können dadurch leicht divergieren.
- [x] **Kein UI-Hinweis auf Fortsetzen** – Zustand wird automatisch wiederhergestellt, aber der Nutzer sieht nicht, dass eine frühere Sitzung fortgesetzt wird (z. B. Fortschrittsanzeige „X von Y beantwortet" auf den Willkommens-Karten oder im Test-Tab).
- [x] **`clearTestState` ungenutzt außer bei Neustart** – Es gibt kein „Antworten zurücksetzen"-UI im Test-Tab (nur „Test wiederholen", das den Zustand löscht).
- [x] **Historie unbegrenzt** – `testHistory` wächst ohne Limit in localStorage; Prune (z. B. 50 Einträge) sinnvoll.
- [x] **Teilen-URL-Länge** – Bei 45+ Antworten lang (URLs im Hash); Komprimierung (z. B. Base36-Codierung der Indizes) für Messenger-taugliche Links.
- [x] **`berechneKoalitionen('beide')` in showTestResults** – berechnet alle Koalitionen ohne den neuen `maxSize`-Cache-Schlüssel-Impact; läuft aber gecacht und ist bei 7 Parteien unkritisch.


## Review vom 2026-08-06 (verifiziert behoben – aus todo.md verschoben)

Per Node gegen die echten Datendateien re-verifiziert (Sitzsummen 630/130/83/79 korrekt, Verfahren normalisiert, Hare-Niemeyer aktiv). Siehe `reports/review-2026-08-06.md`.


- [x] **Sitzverteilung: konfiguriertes Verfahren wird nie angewendet** – `berechneSitze()` (script.js:1824-1846) prüft exakt `'sainteLague'` (script.js:1832/1838), die `werte.json`-Werte sind aber `'sainte-lague'` (btw2029), `'saintelague'` (berlin-2026) und `'hare-niemeyer'` (LSA, MV) → kein Match, alle Wahlen fallen still auf d'Hondt. Verifiziert: LSA (83) App d'Hondt `AfD:39 … GRÜNE:4` vs. deklariert Hare-Niemeyer `AfD:38 … GRÜNE:5`; btw/Berlin aktuell nur zufällig identisch (latent). Verfahrensnamen normalisieren oder Strings in den 4 `werte.json` vereinheitlichen.

- [x] **Hare-Niemeyer/Largest-Remainder nicht implementiert** – `ltw-sachsen-anhalt-2026/werte.json` und `mv-2026/werte.json` deklarieren `meta.verfahren: "hare-niemeyer"`, `berechneSitze()` hat aber keinen Largest-Remainder-Zweig (nur d'Hondt/Sainte-Laguë).

- [x] **`meta.verfahren`-Werte inkonsistent** – `'sainte-lague'` vs. `'saintelague'` vs. `'hare-niemeyer'` (Trennzeichen/Kleinschreibung); einheitliche Nomenklatur dokumentieren oder im Code normalisieren.
- [x] **Parteifarben: SPD und BSW teilen sich `#E3000F`** – config.json:9 (BSW) == config.json:4 (SPD) → farblich nicht unterscheidbar in Charts/Partei-Seiten; eigene BSW-Farbe vergeben.
- [x] **`party.newsRetry` fehlt in `einfache-sprache.json`** – `loadPartyNews()` (script.js:723) nutzt `t('party.newsRetry', …)`; Key nicht in `ui` → „Erneut versuchen"-Button nicht einfach-sprache-übersetzt.
- [x] **Issue #7 „GitHub repo is very messy"** – erledigt am 2026-08-06: verwaiste Branches (`opencode/dispatch-077e39-20260805222758`, `opencode/issue34-20260806072619`) gelöscht; Issue #7 auf GitHub geschlossen. Saubere automatische Branch-Pflege bleibt laufende Aufgabe.


- [x] **„Fortsetzen" zeigt nach Reload Frage 1 statt der gespeicherten Position** – `initializeTest()` (script.js:1045) setzt die `active`-Klasse immer auf Frage 0 (`i === 0`), obwohl `currentQuestion` wiederhergestellt wird (script.js:1003–1005). Per DOM-Harness verifiziert: gespeichertes `currentQuestion=12` → sichtbar `data-q=0`, Nav-Status 12 → „Weiter" springt auf Frage 14 statt 13. Die frühere `[x]`-Markierung betraf nur die Variable, nicht die Anzeige. Fix analog `backToTest()` (script.js:1436–1438).


- [x] **„Details, Programm & News"-Button ist kleines Tap-Ziel** – `.party-detail-link` (styles.css:749) ohne `min-height`/44-px-Tap-Fläche; plausible Ursache für „Inhalte nur über Teilen-Link erreichbar" (Issue #21 fixte nur Antwort-Buttons).
- [x] **Leere Historien-Sektion wirkt wie ein Bug** – bei fehlendem `verlauf` zusätzlich zum Empty-Text einen deaktivierten Platzhalter statt komplett leerer Sektion anbieten.


- [x] **Wahlwechsel springt immer auf den Test-Tab** – `setActiveElection()` endet mit `switchTab('test')` (script.js:283); Wechsel über den `election-bar`-Toggle aus einem anderen Tab (z. B. Daten-/Charts) landet überraschend bei Frage 1. Vorschlag: zuvor aktiver Tab beibehalten.
- [x] **Kein Feedback bei Ladefehler einer Nicht-Default-Wahl** – bei `fetch`-Fehler (script.js:352-356) bleibt die Wahl in `electionsList`, aber `electionDataCache[id]` leer; Klick auf die Karte bricht still bei `if (!data) return;` ab. Vorschlag: deaktivierte Karte mit Laden-Fehler-Hinweis.


- [x] **MV: GRÜNE exakt 5 %** – `>= 5`-Prüfung schließt GRÜNE (5 %) in `berechneKoalitionen()`/`berechneSitze()`. Grenzwert-Entscheidung als Datenhinweis dokumentieren.


- [x] **`partyFilter` mit Partei < Sperrklausel ergibt leere Liste ohne Erklärung** – `populatePartyDropdowns()` (script.js:400-409) listet < 5 %-Parteien, `updateKoalitionen()` (script.js:896-898) filtert nur auf Koalitionen.
- [x] **Koalitions-Share-Link ohne Antworten zeigt im Test-Tab lauter „–"** – `applyPendingShare()` (script.js:164) ruft `showTestResults()` auch bei leerem `answers`.
- [x] **Harte `aria-label`s in index.html:22-24** (Einfache Sprache/Theme/GitHub).


- [x] **`partyFilter` im Koalitionen-Tab listet Parteien < Sperrklausel, Filter-Ergebnis ist dann leer** – `populatePartyDropdowns()` (script.js:400-402) nutzt `relevant`, `updateKoalitionen()` (script.js:593-595) filtert nur Koalitionen → „FDP" (btw2029) ergibt „Keine passenden Koalitionen gefunden" ohne Erklärung. Begründung aus Report-e („Filter auf Ergebnisliste") trifft nicht zu.
- [x] **Koalitions-Share-Link ohne Antworten hinterlässt Ergebnissicht mit lauter „–" im Test-Tab** – `applyPendingShare()` (script.js:146-183) ruft `showTestResults()` auch bei leerem `answers` auf; Vorschlag: bei leerem `answers` + nur `coalitionState` überspringen.
- [x] **Hartkodierte `aria-label`s in index.html** – Z. 22-24 (Einfache Sprache/Theme/GitHub) nicht i18n-fähig.
