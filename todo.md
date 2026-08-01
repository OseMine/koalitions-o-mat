# Koalitions-O-Mat – TODO / Review-Ergebnisse

Code-Review vom 01.08.2026. Prioritäten: P1 = Bug / P2 = Feature / P3 = Verbesserung.

---

## Automatisiertes Review vom 2026-08-01 (2. Durchlauf, gesamtes Projekt)

### P1 – Bugs

- [ ] **Doppelte Historie durch Re-Entry in `showTestResults`** – `selectAnswer()` (script.js:614-622) plant auf der letzten Frage `showTestResults()` per `setTimeout(400)`; Klick auf „Ergebnis anzeigen" (index.html:80) oder „Überspringen" (`skipQuestion()`, script.js:625-631) in diesem Fenster führt zu doppeltem `saveTestResult()` + doppeltem Toast. Timer wird nur im `selectAnswer`-Pfad gelöscht; Re-Entry-Guard fehlt.
- [ ] **„Beste Koalition für Sie" falsch bei 0 beantworteten Fragen** – `showTestResults()` (script.js:815-821) sortiert nur nach `benutzerMatch` ohne `anyUserAnswer`-Guard (vgl. `updateKoalitionen`, script.js:495-497); bei 0 Antworten gewinnt die erste Mehrheitskoalition in Bitmasken-Reihenfolge (btw2029: AfD+CDU/CSU+GRÜNE 10,4 % statt AfD+CDU/CSU+SPD 28,1 %).
- [ ] **Antwort-Timer springt Frage per Pfeiltaste** – `pendingAdvanceTimer` wird nur bei erneuter Antwort gelöscht (script.js:614), nicht bei `showNextQuestion()` per ArrowRight (script.js:1409); Frage wird ohne Anzeige übersprungen.

### P1 – Algorithmus

- [ ] **`minMatchForCoalition: 20` lässt Berliner Koalitionen-Tab weiterhin leer** – verifiziert: 0 von 9 Berliner Mehrheitskoalitionen ≥ 20 % (max 9,1 %); Senkung 40→20 aus Vorbefund reicht für Berlin nicht. Schwelle pro Wahl kalibrieren oder Hinweis „Mindestübereinstimmung senken".
- [ ] **`berechneUebereinstimmung` zählt fehlende Positionen als 0,5-Konsistenz** – script.js:437-453; `getAnswerValue`-Default `'m'` (script.js:29-32) wertet Fragen ohne Parteiposition als 0,5 → Neutralitäts-Inflation (btw2029 SPD 40 % m, ltw BSW 50 %, FREIE WÄHLER 48 %). Fragen ohne Positionen aus der Basis herausrechnen.

### P1 – Einfache Sprache / i18n

- [ ] **Hartkodierte deutsche Strings ohne `t()`** – script.js:1112 (Themenverteilung-Leertext), script.js:576 (Präfix „Quelle: "), script.js:707 (Detail-Legende „✓ Zustimmung …"); Keys fehlen in `einfache-sprache.json`.
- [ ] **Key `noPartyInfo` mit zwei unterschiedlichen Fallbacks** – script.js:378 vs. 385; unterschiedlicher Text im Normalmodus.

### P2 – Fehlende Features / Usability

- [ ] **Parteien mit wenigen beantworteten Fragen verzerren Ergebnisliste** – Berlin: Volt/Tierschutz 3/52, MV: FREIE WÄHLER 16/33; `showTestResults()` (script.js:747-776) berechnet Match nur über beantwortete Fragen → 2 von 3 = 66,7 % möglich. Mindest-Abdeckung (≥ 50 %) oder Hinweis „nur X von N Fragen beantwortet".
- [ ] **„Parteien ausschließen"-Checkboxen teils wirkungslos** – `populatePartyDropdowns()` (script.js:333-341) listet Parteien unter der Sperrklausel, die `berechneKoalitionen()` (script.js:414-416) ohnehin ausschließt; Partei-Filter-Dropdown listet nur ≥ Sperrklausel (script.js:344-347) → inkonsistente Listen.
- [ ] **Teilen-Link verliert neutrale Antworten** – `shareResults()` (script.js:81-82) filtert `'m'` heraus; nach `applyPendingShare()` weichen Zähler und Ergebnis ab.

### P3 – Verbesserungen

- [ ] **`createStatsSummary` crasht bei leerer `umfragewerte`** – `reduce` ohne Initialwert (script.js:998); Leer-Guard fehlt.
- [ ] **`maxCoalitionSize: 5` in ltw-sachsen-anhalt-2026/config.json wirkungslos** – nur 4 Parteien über der Sperrklausel; auf 4 setzen oder kommentieren.
- [ ] **`simpleLangToggle`-Button-Label hartkodiert** – index.html:22 „Einfache Sprache" nicht über `data-i18n`.
- [ ] **Neutral-Inflation wirkt auch auf die „Beste Koalition"-Auswahl** – Folge aus `berechneUebereinstimmung`; neutrale Koalitionen (50 %) können echte inhaltliche Übereinstimmungen schlagen.

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

- [ ] **btw2029 ohne einfache Sprache** – `einfache-sprache.json` deckt nur ltw-sachsen-anhalt-2026/berlin-2026/mv-2026 ab; die Standard-Wahl btw2029 (45 Fragen) fällt über `simpleQuestionText()` (script.js:19) auf Normaltext zurück.

### P2 – Fehlende Features

- [x] **Partei-Filter enthält Parteien < Sperrklausel** – `populatePartyDropdowns()` (script.js:324-330) listet alle antwortenden Parteien, `berechneKoalitionen()` (script.js:403) filtert sie raus → Filter „FDP"/„BSW" (btw2029) ergibt immer „Keine passenden Koalitionen".
- [ ] **„Parteien & Kandidaten" ohne Daten** – in allen 4 `werte.json` fehlen `beschreibung`/`kandidaten`/`website`; Seite zeigt nur Umfragewerte + Platzhalter.

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
- [ ] **Kein UI-Hinweis auf Fortsetzen** – Zustand wird automatisch wiederhergestellt, aber der Nutzer sieht nicht, dass eine frühere Sitzung fortgesetzt wird (z. B. Fortschrittsanzeige „X von Y beantwortet" auf den Willkommens-Karten oder im Test-Tab).
- [ ] **`clearTestState` ungenutzt außer bei Neustart** – Es gibt kein „Antworten zurücksetzen"-UI im Test-Tab (nur „Test wiederholen", das den Zustand löscht).
- [x] **Historie unbegrenzt** – `testHistory` wächst ohne Limit in localStorage; Prune (z. B. 50 Einträge) sinnvoll.
- [ ] **Teilen-URL-Länge** – Bei 45+ Antworten lang (URLs im Hash); Komprimierung (z. B. Base36-Codierung der Indizes) für Messenger-taugliche Links.
- [ ] **`berechneKoalitionen('beide')` in showTestResults** – berechnet alle Koalitionen ohne den neuen `maxSize`-Cache-Schlüssel-Impact; läuft aber gecacht und ist bei 7 Parteien unkritisch.
