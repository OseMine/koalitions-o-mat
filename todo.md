# Koalitions-O-Mat – TODO / Review-Ergebnisse

Code-Review vom 01.08.2026. Prioritäten: P1 = Bug / P2 = Feature / P3 = Verbesserung.

---

## Automatisiertes Review vom 2026-08-02 (2. Lauf, HEAD `918d05f`)

### P1 – Bugs

- [ ] **Einfache Sprache wird beim Reload nicht angewendet** – `applySavedSimpleLang()` (script.js:1328-1332) läuft im `DOMContentLoaded`-Handler vor dem asynchronen Fetch von `einfache-sprache.json` (`loadElections()`, script.js:282-285); `t()` (script.js:16-19) liefert mit `simpleLangData=null` nur Fallbacks → alle statischen `[data-i18n]`-Texte (Tabs, Buttons, Hero, Footer) bleiben bei `simpleLang=1` normaldeutsch, bis der Toggle manuell geklickt wird. Fix: `applyStaticI18n()` nach `loadElections()` erneut aufrufen.
- [ ] **`pendingAdvanceTimer`-Race beim Wahlwechsel** – `selectAnswer()`-Timer (script.js:614-622) wird von `setActiveElection()`/`resetTest()` (script.js:540-548) nicht gecleart → Wahlwechsel innerhalb 300 ms lässt den Timer in die neue Wahl feuern (Test springt auf Frage 2 / doppeltes `showTestResults`).
- [ ] **`createStatsSummary()` wirft TypeError bei leerem `umfragewerte`** – `parties.reduce()` ohne Initialwert (script.js:998) → „Reduce of empty array" → Daten-Tab bricht ab, sobald eine Wahl ohne Umfragewerte angelegt wird.
- [ ] **`berechneSitze()` erzeugt NaN bei keiner Partei über der Sperrklausel** – `gueltig = 0` (script.js:1215) → Division durch 0 → NaN-Sitze im Seat-Chart (`createSeatChart()`, script.js:1038-1051); Leer-Guard fehlt.

### P2 – Fehlende Features

- [ ] **„Fortsetzen" springt nach Reload immer zu Frage 1** – `saveTestState()` (script.js:54-61) speichert nur `answers` + `important`, nicht `currentQuestion`; `initializeTest()` (script.js:552) startet wieder bei 0 → Position wird nie wiederhergestellt.
- [ ] **Kein Hinweis auf fehlende einfache Sprache bei btw2029** – globaler Toggle schaltet für die Standard-Wahl still auf Normaltext zurück (`simpleQuestionText()`, script.js:20-26); keine Kennzeichnung auf Willkommens-Karte oder im Test.

### P3 – Verbesserungen

- [ ] **Sitzverteilung nutzt Largest-Remainder statt d'Hondt/Sainte-Laguë** – `berechneSitze()` (script.js:1210-1228): Bundestag = Sainte-Laguë, Landtagswahlen meist d'Hondt; verifiziert weicht ltw-sachsen-anhalt um 1 Sitz ab (AfD 42 statt 43, LINKE 15 statt 14). Verfahren pro Wahl konfigurierbar machen (`meta.verfahren`).
- [ ] **Hardcodierte Strings nicht übersetzbar** – „Quelle: " (script.js:576), Tabellenkopf „Frage/Sie" (script.js:692), Legende „✓ Zustimmung / ✗ Ablehnung / — Nicht vergleichbar" (script.js:707), Platzhalter „Test durchführen…" (script.js:1112), Toggle-Label „Einfache Sprache" (index.html:22).
- [ ] **Datenqualität: „CDU/CSU" statt „CDU" in Berlin/MV/LSA** – `werte.json`/`fragen.json`; `partyColors` (config.json:3) kennt kein „CDU"; „SSW" (0,5 %) in der Berlin-Umfrage unplausibel (nur Schleswig-Holstein).
- [ ] **Ausschluss-Checkboxen für Parteien < 5 % wirkungslos** – `populatePartyDropdowns()` (script.js:334-337) listet sie, `berechneKoalitionen()` (script.js:414-416) ignoriert sie (BSW/FDP in btw2029).
- [ ] **Fallback `data.fragen || window.parteienData` mischt Wahlen** – `setActiveElection()` (script.js:199): fehlt `fragen.json`, zeigt der Test Fragen der letzten Wahl mit neuen Umfragewerten; stattdessen Leer-State + Fehlermeldung.
- [ ] **`welcome-card-type` nicht i18n** – `renderWelcomeCards()` (script.js:254) gibt `e.type` roh aus.

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

- [ ] **Rein neutrale Nutzer-Antworten → 0 % für alle Parteien trotz „X/X Fragen beantwortet"** – `showTestResults()` (script.js:817-837) überspringt `m`-Antworten komplett (`if (!ua || ua === 'm') return`), `total=0` → `match=0`; `totalAnswered` (script.js:847) zählt `m` aber mit. Verifiziert: 45×`m` → alle 7 Parteien 0,0 % bei Anzeige „45/45 Fragen beantwortet". Betrifft auch `berechneUserMatchFuerKoalition()` (script.js:475) und `berechneUserMatchNachThema()` (script.js:726). Fix: bei `total===0` „–"/„zu wenig Antworten" statt 0 % oder nur j/n zählen.

### P2 – Fehlende Features

- [ ] **`saveTestResult()` speichert auch bei 0 verwertbaren Antworten** – übersprungener Test landet als „0,0 % AfD"-Eintrag in der Historie und verdrängt via `createTopicChart()` (script.js:1198, `.pop()`) das letzte echte Ergebnis aus der Themenverteilung. Speichern nur bei ≥ 1 j/n-Antwort.
- [ ] **Kein Transparenz-Hinweis, dass Koalitionen rein mathematisch sind** – AfD+GRÜNE+LINKE+SPD (btw2029) wird gelistet, obwohl AfD–GRÜNE 0 % Paar-Übereinstimmung hat; Methodik-Box (index.html:127) und README klären politische Realisierbarkeit nicht.
- [ ] **Kein Hinweis, dass neutrale Antworten die Frage aus dem Match entfernen** – Methodik-Box erklärt nur die 2×-Gewichtung; ohne Hinweis wirken 0 % nach rein neutraler Beantwortung wie ein Fehler.
- [ ] **„Ergebnis teilen"-Button im Koalitionen-Tab teilt den Test, nicht die Koalitions-Sicht** – `shareResults()` (script.js:81) kodiert nur Antworten + wichtige Fragen; Filter (Mindestmatch, Ausschlüsse, Typ) gehen verloren.
- [ ] **Partei-Filter-Dropdown inkonsistent mit dem Ergebnis** – FDP/BSW (btw2029) erscheinen im Ergebnis, fehlen aber im Filter (script.js:350-355); Ausschluss-Checkboxen enthalten sie dagegen.
- [ ] **Cross-Election-Leak bei `fragen.json`-Ladefehler** – `window.parteienData = data.fragen || window.parteienData` (script.js:211) behält bei Ladefehler die Fragen der vorherigen Wahl; auf null zurücksetzen.

### P3 – Verbesserungen

- [ ] **Paar-Durchschnitt verdeckt Fundamentalkonflikte** – AfD+CDU/CSU+GRÜNE = 33,7 % interne Übereinstimmung trotz AfD–GRÜNE=0 % und CDU/CSU–GRÜNE=10 %; Minimum-Paar-Agreement zusätzlich anzeigen.
- [ ] **`berechneUebereinstimmung()` ohne Umfragewert-Gewichtung** – kleine Parteien zählen wie große; Gewichtung nur in `berechneUserMatchFuerKoalition()` (script.js:482).
- [ ] **10 Fragen in „Sonstiges" (Kultur/Ehrenamt/Kirchen/Rundfunk/Schwimmbäder/Gartenschau/Tanzverbot)** – ltw 6, Berlin 3, btw2029 1; Kategorie „Kultur" oder Zuordnung „Soziales".
- [ ] **`maxCoalitionSize: 5` in `elections/ltw-sachsen-anhalt-2026/config.json` abweichend** – alle anderen 3 Wahlen nutzen 4; funktional wirkungslos, aber inkonsistent.
- [ ] **README „125 Fragen in einfacher Sprache" veraltet** – tatsächlich 170 (45+40+52+33).
- [ ] **Hartkodierte Strings „Quelle: " (script.js:629) und „Frage" (script.js:752, 1278)** – i18n-Keys ergänzen.
- [ ] **Berlin: Volt/Tierschutz 49/52 × neutral** – Match aus nur 3 Fragen (Paar GRÜNE+Volt = 100 %); als „keine Position" kennzeichnen oder entfernen.
- [ ] **`createCoalitionPotentialChart()` sortiert den `koalitionenCache` in-place** (script.js:1149) – Cache-Referenz wird mutiert.
- [ ] **„Beste Koalition für Sie" ignoriert Ausschluss-Filter des Koalitionen-Tabs** – `berechneKoalitionen('beide')` ohne `excludeParties` (script.js:881).
- [ ] **ECharts-CDN ohne Fallback** – `echarts.init` (script.js:779, 1052) wirft bei CDN-Ausfall; Fehlermeldung/Offline-Hinweis ergänzen.
- [ ] **`minMatch`-Slider-Label initial „0 %"** (index.html:102) bis zum ersten `updateKoalitionen()`.
- [ ] **`deleteTestHistoryEntry()`/`clearTestHistory()` zeichnen `createTopicChart()` bei verstecktem Daten-Tab** – echarts.init auf 0×0-Container (script.js:1031, 1037).

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
