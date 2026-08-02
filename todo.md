# Koalitions-O-Mat – TODO / Review-Ergebnisse

Code-Review vom 01.08.2026. Prioritäten: P1 = Bug / P2 = Feature / P3 = Verbesserung.

---

## Review vom 2026-08-02 (5. Lauf, PR #18: Issue #17-Fixes im Merge-Review)

Merge-Review des PR „Issue #17 behoben: Swipe fix + Review umgesetzt" (`reports/review-2026-08-02-f.md`). Ergebnis: **PR mergefähig**, alle drei P1-Fixes zu Issue #17 sowie die P2/P3-Mitfixes per Node-Simulation und gegen die echten Datendateien verifiziert, keine Regressionen. Die folgenden Punkte sind Nachbesserungsvorschläge.

### P3 – Verbesserungen (neu)

- [ ] **Swipe-Abbruch permanent nach EINEM vertikal-dominierten `touchmove`-Event** – script.js:1641-1644: das erste Touchmove mit nur 2 px Y / 1 px X deaktiviert die Geste dauerhaft; simulierte horizontale Swipe (2,4)→(150,8) wird verworfen. Vorschlag: Richtungsprüfung erst ab ~10 px Dead-Zone oder Flag bei später horizontal-dominanter Bewegung wieder aufheben.
- [ ] **`partyFilter` im Koalitionen-Tab listet Parteien < Sperrklausel, Filter-Ergebnis ist dann leer** – `populatePartyDropdowns()` (script.js:400-402) nutzt `relevant`, `updateKoalitionen()` (script.js:593-595) filtert nur Koalitionen → „FDP" (btw2029) ergibt „Keine passenden Koalitionen gefunden" ohne Erklärung. Begründung aus Report-e („Filter auf Ergebnisliste") trifft nicht zu.
- [ ] **Koalitions-Share-Link ohne Antworten hinterlässt Ergebnissicht mit lauter „–" im Test-Tab** – `applyPendingShare()` (script.js:146-183) ruft `showTestResults()` auch bei leerem `answers` auf; Vorschlag: bei leerem `answers` + nur `coalitionState` überspringen.
- [ ] **Zeilenreferenzen in todo.md/Report-e verschoben** – `script.js:1620-1657` vs. tatsächlich 1628-1664, `403-413` vs. 405-419, `1425` vs. 1424, `82-113` vs. 82-116 (kosmetisch).

### Verifiziert (Bestätigung der PR-Befunde)

- [x] Swipe-Fix (Issue #17): `touchmove`-Tracking + `.tabs`-Bindung + `swipeDisabled`-Reset – per Simulation verifiziert (diagonale Flicks `80/95` und `72/84` wechseln keinen Tab mehr, sauberer horizontaler Swipe 120/10 schon).
- [x] Ausschluss-Checkboxen: Menge = Parteien ≥ Sperrklausel, konsistent mit `berechneKoalitionen()` (alle 4 Wahlen).
- [x] Koalitionswerte unverändert: btw2029 max 50,9 %, LSA 52,0 %, Berlin 48,0 %, MV 58,7 %; Sitzsummen 630/87/130/71; keine fehlenden Parteien/Farben; i18n-Keys `questionCol`/`shareEmpty`/`shareCopied` vorhanden.

---

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

---

## Review vom 2026-08-02 (4. Lauf, Issue #17: Tab-Wechsel beim vertikalen Scrollen)

Fokus: Issue #17 – Swipe-Geste wechselt beim vertikalen Scrollen weiterhin Tabs. Vollständiger Bericht: `reports/review-2026-08-02-d.md`. Ursache per Node-Simulation bestätigt: Der Handler prüft nur Start-/Endkoordinaten, diagonale Flicks (z. B. 80 px horizontal / 95 px vertikal) passieren die 1.2×-Regel.

### P1 – Bugs

- [x] **Swipe-Handler ohne `touchmove`-Tracking** – gefixt am 2026-08-02 (siehe Abschnitt „Bugfix vom 2026-08-02"): `touchmove`-Listener bricht die Geste bei vertikal-dominanter Bewegung ab; diagonaler Flick `diffX=80/diffY=95` und `diffX=72/diffY=84` lösen keinen Tab-Wechsel mehr aus.
- [x] **Swipe auf gesamten `.container` gebunden** – gefixt am 2026-08-02: Swipe wird nur noch auf der `.tabs`-Leiste ausgelöst; `.election-toggles/.cmp-wrap/.tr-detail-table`-Ausnahme entfällt.
- [x] **`swipeDisabled` wird bei `touchcancel` nicht zurückgesetzt** – gefixt am 2026-08-02: `touchend`/`touchcancel` setzen das Flag zurück, zusätzlich `e.touches.length === 1`-Guard.

### P2 – Fehlende Features

- [x] **Ausschluss-Checkboxen für Parteien < Sperrklausel wirkungslos** (offen seit 2. Lauf) – gefixt am 2026-08-02: `populatePartyDropdowns()` zeigt nur noch Parteien ≥ Sperrklausel; FDP/BSW (btw2029) erscheinen nicht mehr als wirkungslose Checkboxen.

### P3 – Verbesserungen

- [ ] **Ranking bei wenigen beantworteten Fragen irreführend** – Berlin: Volt/Tierschutz (3/52, alle „j") erreichen 100 % und verdrängen große Parteien (script.js:918-942); `fewAnswersHint` normalisiert nicht. Mindestzahl vergleichbarer Fragen für die Sortierung.
- [x] **Hartkodierter Tabellenkopf „Frage" in `updatePartyComparison()`** – gefixt am 2026-08-02: nutzt `t('questionCol')` (script.js:1425).
- [ ] **Hartkodierte `aria-label`s in index.html** – Z. 22-24 (Einfache Sprache/Theme/GitHub) nicht i18n-fähig.
- [x] **„Ergebnis teilen" im Koalitionen-Tab ohne Test blockiert** – gefixt am 2026-08-02: `&c=` auch ohne beantwortete Fragen; `parseShareHash()` akzeptiert leere `&a=`.

### Verifiziert weiter offen (aus früheren Läufen)

- [ ] `berechneUebereinstimmung()` ohne Umfragewert-Gewichtung (script.js:501-524)
- [ ] 10 „Sonstiges"-Fragen (btw2029 1, LSA 6, Berlin 3) – Kategorie „Kultur" fehlt
- [ ] Datenqualität „CDU/CSU" vs. „CDU"; „SSW" (0,5 %) in Berlin-Umfrage unplausibel

---

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

---

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

---

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

- [x] **Sitzverteilung nutzt Largest-Remainder statt d'Hondt/Sainte-Laguë** – gefixt am 2026-08-03: Verfahren pro Wahl konfigurierbar via `meta.verfahren` (`sainteLague` für btw2029, `dhondt` für Landtagswahlen); verifiziert weicht ltw-sachsen-anhalt jetzt nicht mehr ab (AfD 43 statt 42, LINKE 14 statt 15).
- [x] **Hardcodierte Strings nicht übersetzbar** – gefixt am 2026-08-03: `sourceLabel`, `questionCol`/`youCol`, `legendAgree`/`legendDisagree`/`legendNotComparable`, `simpleLangLabel`; Platzhalter „Test durchführen…" war bereits über `topicChartEmpty` gelöst.
- [ ] **Datenqualität: „CDU/CSU" statt „CDU" in Berlin/MV/LSA** – `werte.json`/`fragen.json`; `partyColors` (config.json:3) kennt kein „CDU"; „SSW" (0,5 %) in der Berlin-Umfrage unplausibel (nur Schleswig-Holstein).
- [x] **Ausschluss-Checkboxen für Parteien < 5 % wirkungslos** – gefixt am 2026-08-02: `populatePartyDropdowns()` (script.js:403-413) zeigt nur noch Parteien ≥ Sperrklausel; BSW/FDP (btw2029) erscheinen nicht mehr als wirkungslose Checkboxen.
- [x] **Fallback `data.fragen || window.parteienData` mischt Wahlen** – gefixt am 2026-08-03: `window.parteienData = data.fragen || null` + Empty-State in `initializeTest()`.
- [x] **`welcome-card-type` nicht i18n** – gefixt am 2026-08-03: Keys `typeBundestagswahl`/`typeLandtagswahl`/`typeAbgeordnetenhauswahl`.

Hinweis (erledigt seit 1. Lauf): `noData`-Key ist inzwischen vorhanden (`einfache-sprache.json` Zeile 98) – der P3-Eintrag „`noData`-Key fehlt" weiter unten ist abgehakt.

---

## Bugfix vom 2026-08-02 (Issue: Abgeordnetenhauswahl ist keine Landtagswahl)

### P1 – Bugs

- [x] **Berlin 2026 fälschlich als „Landtagswahl" ausgewiesen** – `elections.json` (`type` des `berlin-2026`-Eintrags) auf `"Abgeordnetenhauswahl"` korrigiert; angezeigt über `renderWelcomeCards()` (script.js:254). Keine Logik verzweigt auf den Typ.
- [x] **FDP-Begründung „Berliner Landtagswahlen"** – `elections/berlin-2026/fragen.json` (Frage 23, FDP) auf „Berliner Abgeordnetenhauswahl" korrigiert.

---

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
- [ ] **`berechneUebereinstimmung()` ohne Umfragewert-Gewichtung** – kleine Parteien zählen wie große; Gewichtung nur in `berechneUserMatchFuerKoalition()` (script.js:482).
- [ ] **10 Fragen in „Sonstiges" (Kultur/Ehrenamt/Kirchen/Rundfunk/Schwimmbäder/Gartenschau/Tanzverbot)** – ltw 6, Berlin 3, btw2029 1; Kategorie „Kultur" oder Zuordnung „Soziales".
- [x] **`maxCoalitionSize: 5` in `elections/ltw-sachsen-anhalt-2026/config.json` abweichend** – gefixt am 2026-08-03: auf 4 vereinheitlicht.
- [x] **README „125 Fragen in einfacher Sprache" veraltet** – korrigiert auf 170 (45+40+52+33) in `README.md` Z. 14 (siehe 3. Lauf).
- [x] **Hartkodierte Strings „Quelle: " (script.js:629) und „Frage" (script.js:752, 1278)** – gefixt am 2026-08-03: i18n-Keys `sourceLabel`, `questionCol`/`youCol` ergänzt.
- [x] **Berlin: Volt/Tierschutz 49/52 × neutral** – gefixt am 2026-08-03: Partei-Karten zeigen „Nur X von N Fragen beantwortet" (`fewAnswersHint`).
- [x] **`createCoalitionPotentialChart()` sortiert den `koalitionenCache` in-place** (script.js:1149) – gefixt am 2026-08-03: `.slice()` vor dem Sortieren.
- [x] **„Beste Koalition für Sie" ignoriert Ausschluss-Filter des Koalitionen-Tabs** – gefixt am 2026-08-03: `berechneKoalitionen('beide', excludeParties)`.
- [x] **ECharts-CDN ohne Fallback** – gefixt am 2026-08-03: `initChart()`/`initTestResultPieChart()` zeigen `chartLoadError`-Platzhalter.
- [x] **`minMatch`-Slider-Label initial „0 %"** (index.html:102) – gefixt am 2026-08-03: Label wird in `setActiveElection()` synchronisiert.
- [x] **`deleteTestHistoryEntry()`/`clearTestHistory()` zeichnen `createTopicChart()` bei verstecktem Daten-Tab** – gefixt am 2026-08-03: nur bei aktivem Daten-Tab.

---

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

---

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

---

## Mobile Fix vom 2026-08-01 (Issue: Mobile Bugs)

### P1 – Bugs

- [x] **Tab-Wechsel beim Scrollen auf Mobilgeräten** – Swipe-Geste in `script.js` (`touchend`-Handler): bisher wechselte der Tab schon ab 60 px horizontaler Finger-Bewegung – auch beim normalen vertikalen Scrollen mit leichter Drift („Switches Sites"). Fix: horizontale Distanz muss ≥ 70 px betragen und die vertikale klar überwiegen (`Math.abs(diffY) > Math.abs(diffX) * 1.2` → kein Wechsel); zusätzlich wird die Geste in horizontal scrollbaren Bereichen (`.election-toggles`, `.cmp-wrap`, `.tr-detail-table`) ignoriert.
- [x] **Charts nach Viewport-Änderung abgeschnitten/verzerrt** – neuer debounced `resize`-Listener ruft `chart.resize()` für alle ECharts-Instanzen auf (Mobile-URL-Bar, Rotation), statt sie unskaliert zu lassen.

---

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

---

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

---

## Neu – Selbst-Review 01.08.2026 (nach Fixes)

- [x] **`relevantParties` (3) ungenutzt** – Schwellwert existiert in config, wird aber nirgends gelesen; entweder nutzen (z. B. Partei-Filter-Dropdowns auf Top-N begrenzen) oder aus config entfernen.
- [x] **`berechneUserMatchNachThema` ohne 2×-Gewichtung** – Themen-Breakdown in den Ergebnis-Karten ignoriert `frageGewicht`; Gesamtmatch und Themenmatch können dadurch leicht divergieren.
- [x] **Kein UI-Hinweis auf Fortsetzen** – Zustand wird automatisch wiederhergestellt, aber der Nutzer sieht nicht, dass eine frühere Sitzung fortgesetzt wird (z. B. Fortschrittsanzeige „X von Y beantwortet" auf den Willkommens-Karten oder im Test-Tab).
- [x] **`clearTestState` ungenutzt außer bei Neustart** – Es gibt kein „Antworten zurücksetzen"-UI im Test-Tab (nur „Test wiederholen", das den Zustand löscht).
- [x] **Historie unbegrenzt** – `testHistory` wächst ohne Limit in localStorage; Prune (z. B. 50 Einträge) sinnvoll.
- [x] **Teilen-URL-Länge** – Bei 45+ Antworten lang (URLs im Hash); Komprimierung (z. B. Base36-Codierung der Indizes) für Messenger-taugliche Links.
- [x] **`berechneKoalitionen('beide')` in showTestResults** – berechnet alle Koalitionen ohne den neuen `maxSize`-Cache-Schlüssel-Impact; läuft aber gecacht und ist bei 7 Parteien unkritisch.
