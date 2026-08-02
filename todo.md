# Koalitions-O-Mat – TODO / Review-Ergebnisse

Code-Review vom 01.08.2026. Prioritäten: P1 = Bug / P2 = Feature / P3 = Verbesserung.

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
