# Koalitions-O-Mat – Offene Aufgaben

Erledigte Aufgaben wurden nach `archived-todo.md` verschoben (Stand 2026-09-21). Dokumentierte Läufe und Umsetzungen (Friction-Score, Regierungs-Simulator, Thesen-Matrix, Ergebnis-Karte, Live-URL-Sync, Bugfixes, Einfacher/Erweiterter Modus, Dealbreaker, 2D-Politik-Kompass, Taktik-Simulator, Feature-Evaluationen, Reviews) siehe dort.

## Review vom 2026-09-28 (vollständiger Review + GitHub-Maintenance)

Vollständiger Bericht: `reports/review-2026-09-28.md`. Vollständiger Projekt-Review ohne Fokus (Phase 1–6). Empirisch verifiziert (Node gegen die echten Datendateien aller 4 Wahlen): Sitzverteilung exakt aufsummiert (btw 630, LSA 83, Berlin 130, MV 79) inkl. d'Hondt und Hare-Niemeyer, Koalitionslisten inkl. `koalitionsausschluss` (btw 28, LSA 21, Berlin 12, MV 28), 222 Fragen konsistent mit `einfache-sprache.json`, i18n-Schlüssel-Abdeckung vollständig. Alle 8 Harness-/Tool-Skripte grün, `node --check script.js` OK. **1 neuer P3-Befund** (N-03), keine neuen P1/P2. GitHub: PR #174 (Review vom 2026-09-21) geprüft (CLEAN/MERGEABLE, alle Checks grün, reine Doku-/Todo-Änderung) und **gemergt** (`36d6e1a`), Head-Branch `opencode/schedule-31b9a7-20260921113915` gelöscht; 0 offene PRs; 9 offene Issues (#164–#172) unverändert berechtigt offen.

### P3 – Neu (Review 2026-09-28)

- [ ] **„Alle Filter zurücksetzen" stellt nicht den Ausgangszustand her und deaktiviert den Wahl-Default dauerhaft** (N-03) – `resetCoalitionFilters()` (script.js:1997-2016) setzt `minEl.value = 0` und `minEl.dataset.touched = '1'` (Z. 2002-2003). Der Ausgangswert ist aber `config.thresholds.minMatchForCoalition` = 20 (config.json:67), den `setActiveElection()` (script.js:819-822) nur setzt, solange `!slider.dataset.touched`. Zwei Folgen: (a) Der Wert 0 % weicht vom Ausgangszustand 20 % ab, obwohl README:29 ausdrücklich verspricht, die Filter ließen sich damit „wieder auf den Ausgangszustand bringen". (b) Das `touched`-Flag wird nie zurückgesetzt, sodass jeder nachfolgende Wahlwechsel den Default stillschweigend überspringt – der Regler bleibt für den Rest der Sitzung auf 0 %. Verifiziert per VM-Harness gegen die echten Daten: `setActiveElection('btw2029')` → `value=20, touched=undefined`; `resetCoalitionFilters()` → `value=0, touched=1`; `setActiveElection('mv-2026')` → `value=0, touched=1` (statt 20). Betrifft alle vier Wahlen (alle nutzen `minMatchForCoalition: 20`). Vorschlag: in `resetCoalitionFilters()` `config.thresholds.minMatchForCoalition` statt `0` setzen und `dataset.touched` entfernen.

### P3 – Geprüft, bewusst nicht als neuer Befund geführt

- **`zitat` fehlt bei 748 Objektantworten** (60/536/64/88 je Wahl), alle haben `quelle`. Die UI rendert `zitat`/`begruendung`/`quelle` jeweils nur bei Vorhandensein (script.js:2295-2308, 3710-3718), `getAnswerSources()` liefert für Legacy-Strings `null`. Kein Anzeigefehler, `zitat` ist laut README:42 kein Pflichtfeld. Kein Befund.
- **i18n-Keys `type`, `typeBundestagswahl`, `typeLandtagswahl`, `typeAbgeordnetenhauswahl`, `modeOffParteiSeite`, `modeOffDealbreaker`** wirkten zunächst fehlend/tot, sind es aber nicht: `t('type' + e.type.replace(/\s+/g, ''), …)` (script.js:861, 871) baut den Schlüssel dynamisch, `modeOffParteiSeite`/`modeOffDealbreaker` werden im `simpleOff`-Array (script.js:134, 137) referenziert. Alle 253 statischen `t()`-/`data-i18n`-Schlüssel vorhanden. Kein Befund.
- **Gewichtung „wichtig + Dealbreaker"** (`frageGewicht()`, script.js:203-208) liefert 4 statt einer Multiplikation mit 2. Das ist **kein** Befund: README:7, `reports/implementation-2026-08-10-dealbreaker.md:10` und `harness/dealbreaker-harness.js:106` beschreiben exakt dieses Verhalten (Skala um eine Stufe erweitert, nicht multipliziert); Doku und Code sind konsistent.

### P3 – Inkonsistente Sonderbehandlung „Andere" (Hinweis, derzeit latent)

- [ ] **`berechneSitze()`/`createStatsSummary()` schließen die synthetische Partei „Andere" nicht aus, 13 andere Pfade schon** – `berechneSitze()` (script.js:3804-3808) und `createStatsSummary()` (script.js:3311) filtern nur nach `sperrklausel`, während u. a. `berechneKoalitionen()` (script.js:1647), `berechneUserMatchRanking()` (script.js:336), `simulatorParties()` (script.js:2028) und 10 weitere Pfade `p.partei !== 'Andere'` explizit ausschließen. Mit den aktuellen Daten latent, da `Andere` in keiner `werte.json` vorkommt. Synthetisch verifiziert: mit `{partei:'Andere', prozent:6}` vergibt `berechneSitze()` **39 Sitze** an „Andere" (Summe bleibt korrekt 630), während `berechneKoalitionen()` sie konsequent ausschließt. Vorschlag: denselben Ausschluss auch in den Sitz-/Statistikpfaden ziehen, damit die Sonderbehandlung nicht auseinanderläuft.

### P3 – Bestätigt offene Befunde (alle unverändert)

Die 11 bekannten P3-Punkte aus den Abschnitten 2026-09-21, 2026-09-14, 2026-09-08 und 2026-08-17 gelten weiter: N-01 (Issue #172), N-02 (Issue #171), F-07 (Issue #164), F-08 (Issue #165), F-09/README-Zahlen (Issue #170), tote `keywords`/`default`/`year` (Issue #169), Stale Share-Hash einfacher Modus (Issue #166), umfragegewichteter Koalitions-Wert (Issue #167), 50-%-Baseline (Issue #168), uneinheitliches Parteinamen-Escaping (Issue #170).

## Review vom 2026-09-14 (wöchentlicher Lauf + GitHub-Maintenance)

Vollständiger Bericht: `reports/review-2026-09-14.md`. Empirisch verifiziert (Node gegen die echten Datendateien aller 4 Wahlen): 222 Fragen konsistent mit `einfache-sprache.json` (222/222), Sitzverteilung exakt aufsummiert (btw 630, LSA 83, Berlin 130, MV 79), Koalitionen inkl. Ausschlüsse korrekt, einfache-Sprache-Parteibeschreibungen über beide Mechanismen abgedeckt. Alle 9 bekannten P3-Befunde (F-07–F-09 + 6 aus 2026-08-17) unverändert offen; **2 neue P3-Punkte** (N-01, N-02) hinzugekommen. GitHub: 0 offene PRs; 7 offene Issues (#164–#170) deckungsgleich mit todo.md; Stale Branch `opencode/dispatch-a62a81-20260908081821` (PR #163) gelöscht. Keine neuen P1/P2-Befunde.

### P3 – Neu (Review 2026-09-14)

- [ ] **Exakt-50-%-Koalition unter den Typ-Filtern unsichtbar** (N-01, Issue #172) – `berechneKoalitionen()` (script.js:1638): `sum > 50` ⇒ „mehrheit", `sum < 50` ⇒ „minderheit"; eine Koalition mit exakt 50 % erscheint nur unter „beide". Empirisch betroffen: btw2029 **CDU/CSU+SPD+LINKE+FDP (50,0 %)**; auch das Koalitions-Potenzial-Chart (`createCoalitionPotentialChart()`, script.js:3372, `type='mehrheit'`) blendet sie aus. Vorschlag: exakt 50 % der „minderheit" zuschlagen oder Filter-Labels präzisieren.
- [ ] **Zwei parallele Mechanismen für Einfache-Sprache-Parteibeschreibungen** (N-02, Issue #171) – `simplePartyText()` (script.js:30): erst `werte.json.beschreibung_einfach`, dann `einfache-sprache.json.parteien[activeElectionId]`. btw2029 nutzt nur den ersten Weg (kein `parteien`-Block), LSA/Berlin/MV nur den zweiten (kein `beschreibung_einfach`). Kein Live-Fehler (alle Parteien abgedeckt), aber Drift-Gefahr bei künftigen reinen Datendateien-Updates wie Issue #161. Vorschlag: einen Mechanismus vereinheitlichen oder dokumentieren.

### P3 – Bestätigte offene Befunde (alle unverändert)

Die 9 Punkte aus den Abschnitten „Review vom 2026-09-08" (F-07 resetAnswers-Hash, F-08 setMode-Rerender, F-09 README-Zahlen) und „Review vom 2026-08-17" (tote `keywords`, tote Felder `default`/`year`, Stale Share-Hash einfacher Modus, umfragegewichteter Koalitions-Wert, uneinheitliches Escaping inkl. `createStatsSummary()` Z. 3315, 50-%-Baseline) gelten weiter – siehe dort.

## Review vom 2026-09-08 (wöchentlicher Lauf + GitHub-Maintenance)

Vollständiger Bericht: `reports/review-2026-09-08.md`. Empirisch verifiziert (alle bestehenden P3-Befunde bestätigt; Sachsen-Anhalt-Daten auf Wahlergebnis Sept. 2026 geprüft: 92 Fragen, 7 Parteien, alle Metadaten vollständig, `koalitionsausschluss`-Key `CDU/CSU` korrekt). GitHub: 0 offene PRs, 0 offene Issues; 2 Stale Branches aus gemergten PRs (#160, #162) identifiziert. Keine neuen P1/P2-Befunde.

### P3 – Bestätigte offene Befunde (alle aus vorherigen Reviews)

- [ ] **`resetAnswers()` lässt den Share-Hash stehen** (F-07) – `resetAnswers()` (script.js:2227) ruft `syncShareUrl()` **nicht** auf, anders als `resetTest()` (script.js:2210). Der #125-Fix (Clear-Zweig in `syncShareUrl()`) greift nach dem Klick auf „Antworten zurücksetzen" daher nie; `#w=…&a=…` bleibt stehen, ein Reload stellt die alten Antworten wieder her. Verifiziert per Harness im erweiterten Modus.
- [ ] **Modus-Wechsel rendert das aktive Testergebnis nicht neu** (F-08) – `setMode()` (script.js:117) ruft keinerlei Render-Funktion auf (nur `toggleSimpleLanguage()` rendert die Ergebnis-Ansicht neu, script.js:3979). Die in `showTestResults()` dynamisch erzeugten Sektionen (Kompass, Export-Karte, Taktik, Dealbreaker-Hinweis) tragen kein `data-simple-off`; Wechsel Erweitert→Einfach blendet sie nicht aus, Wechsel Einfach→Erweitert zeigt sie erst nach erneutem Render. README-Zeile 21 verspricht „blendet die Ansichten sofort ein bzw. aus".
- [ ] **README nennt veraltete Fragenzahlen** (F-09/Doku) – `README.md:20` nennt „alle 170 Fragen (45 + 40 + 52 + 33)", tatsächlich sind es 222 (Sachsen-Anhalt: 92 statt 40). Verifiziert gegen alle `elections/*/fragen.json` und `einfache-sprache.json` (alle 222 Übersetzungen vorhanden).
- [ ] **Tote `keywords` in `config.json`** – `determineTopic()` (script.js:3662) klassifiziert nur über `thema`; die `keywords`-Arrays (config.json:24–48) sind seit dem Fallback-Removal tote Konfiguration.
- [ ] **Tote Felder `default` und `year` in `elections.json`** – script.js liest nur `id`, `name`, `type`.
- [ ] **Stale Share-Hash im einfachen Modus** – `syncShareUrl()` (script.js:276) bricht bei `simpleOff('teilen')` ab, bevor der Clear-Zweig greift.
- [ ] **Koalitions-„Mit Ihnen"-Wert umfragegewichtet** – `berechneUserMatchFuerKoalition()` (script.js:1828) gewichtet mit `prozentOf[name] || 1`.
- [ ] **Uneinheitliches Escaping von Parteinamen** – `updateKoalitionen()` (script.js:1911), `createStatsSummary()` (script.js:3260) ohne `escapeHtml()`.
- [ ] **50-%-Baseline bei null vergleichbaren Antworten** – `berechneUebereinstimmung()` (script.js:1703), `minPaar` (script.js:1642/2080).

## Review vom 2026-08-20 (wöchentlicher Lauf + GitHub-Maintenance)

Vollständiger Bericht: `reports/review-2026-08-20.md`. Empirisch verifiziert (alle bestehenden Harnesses grün; eigene Harnesses für Sitzverteilung aller 4 Wahlen, Koalitionen/Ausschlüsse, determineTopic, i18n sowie Befund F-07). Die sechs offenen P3-Punkte aus dem Review vom 2026-08-17 wurden erneut bestätigt (tote `keywords`, tote Felder `default`/`year`, Stale Share-Hash einfacher Modus, umfragegewichteter Koalitions-Wert, uneinheitliches Escaping, 50-%-Baseline). GitHub: 0 offene PRs, alle Issues geschlossen; 5 Stale Branches aus gemergten PRs (#155–#159) gelöscht.

### P3 – Neu

- [ ] **`resetAnswers()` lässt den Share-Hash stehen** (F-07) – `resetAnswers()` (script.js:2227) ruft `syncShareUrl()` **nicht** auf, anders als `resetTest()` (script.js:2210). Der #125-Fix (Clear-Zweig in `syncShareUrl()`) greift nach dem Klick auf „Antworten zurücksetzen" daher nie; `#w=…&a=…` bleibt stehen, ein Reload stellt die alten Antworten wieder her. Verifiziert per Harness im erweiterten Modus: `resetTest()` → `history.replaceState('#')`, `resetAnswers()` → kein Aufruf, Hash unverändert.
- [ ] **Modus-Wechsel rendert das aktive Testergebnis nicht neu** (F-08) – `setMode()` (script.js:117) ruft keinerlei Render-Funktion auf (nur `toggleSimpleLanguage()` rendert die Ergebnis-Ansicht neu, script.js:3979). Die in `showTestResults()` dynamisch erzeugten Sektionen (Kompass, Export-Karte, Taktik, Dealbreaker-Hinweis) tragen kein `data-simple-off`; Wechsel Erweitert→Einfach blendet sie nicht aus, Wechsel Einfach→Erweitert zeigt sie erst nach erneutem Render (z. B. Tab-Wechsel). README-Zeile 21 verspricht „blendet die Ansichten sofort ein bzw. aus".
- [ ] **README nennt veraltete Fragenzahlen** (F-09/Doku) – `README.md:20` nennt „alle 170 Fragen (45 + 40 + 52 + 33)", tatsächlich sind es 222 (Sachsen-Anhalt: 92 statt 40). Verifiziert gegen alle `elections/*/fragen.json` und `einfache-sprache.json` (alle 222 Übersetzungen vorhanden).

## Review vom 2026-08-17 (wöchentlicher Lauf + GitHub-Maintenance)

Vollständiger Bericht: `reports/review-2026-08-17.md`. Empirisch verifiziert (alle bestehenden Harnesses grün; eigene Harnesses für Sitzverteilung aller 4 Wahlen, Koalitionen/Ausschlüsse, UserMatch, Reibung sowie die neuen Befunde unten). Die vier offenen Punkte aus dem Review vom 2026-08-13 wurden erneut bestätigt (P1 `"CDU"`-Key LSA, P3 tote i18n-Keys, P3 Beste-Koalition-Regler-Inkonsistenz, P3 Koalitions-Share-Link-Sperre). GitHub: 0 offene PRs; Issues #151–#154 weiterhin offen und berechtigt; Stale Branch `opencode/dispatch-58192f-20260813113515` (PR #150) gelöscht.

### P3 – Verbesserungen (neu)

- [ ] **Tote `keywords` in `config.json`** – `determineTopic()` (script.js:3607) klassifiziert nur über `thema`; die `keywords`-Arrays (config.json:24–48) sind seit dem Fallback-Removal (Review 2026-08-10) tote Konfiguration. Entfernen oder wieder nutzen.
- [ ] **Tote Felder `default` und `year` in `elections.json`** – script.js liest nur `id`, `name`, `type` (Z. 807/831/867/3162/3626); `default` und `year` werden nirgends ausgewertet.
- [ ] **Stale Share-Hash im einfachen Modus** – `syncShareUrl()` (script.js:271) bricht bei `simpleOff('teilen')` ab, bevor der Clear-Zweig (Z. 273–282) greift; nach Wechsel Erweitert→Einfach + Reset bleibt `#w=…` stehen, ein Reload stellt die alten Antworten wieder her. Verifiziert (Harness). Der #125-Fix deckt nur den erweiterten Modus ab.
- [ ] **Koalitions-„Mit Ihnen"-Wert umfragegewichtet** – `berechneUserMatchFuerKoalition()` (script.js:1828) gewichtet mit `prozentOf[name] || 1`; kleine Partner tragen kaum bei (btw2029 verifiziert: FDP 100 %, CDU/CSU 80,6 % → Koalition 85,1 % statt ~90 %). Ungewichtetes Mittel oder Methodik-Note erwägen.
- [ ] **Uneinheitliches Escaping von Parteinamen** – `updateKoalitionen()` (script.js:1911), `createStatsSummary()` (script.js:3260), `renderTestHistory()` (script.js:3171) rendern Parteinamen ohne `escapeHtml()`; bei lokalen Daten kein XSS-Risiko, aber inkonsistent.
- [ ] **50-%-Baseline bei null vergleichbaren Antworten** – `berechneUebereinstimmung()` (script.js:1680) und `minPaar` (Z. 1642/2080) liefern 50 bei fehlenden j/n-Antworten statt „keine Daten"; mit den aktuellen Daten nicht triggerbar, aber potenziell irreführend im Koalitionen-Ranking/Filter.

## Review vom 2026-08-13 (vollständiger Review + GitHub-Maintenance)

Vollständiger Bericht: `reports/review-2026-08-13.md`. Empirisch verifiziert (Node-Harness gegen die echten Daten, Sitzverteilung aller 4 Wahlen, Übereinstimmungs-Berechnung, alle bestehenden Harnesses grün). Issue #125 (veralteter Share-Hash) ist mit PR #145 behoben und abgehakt. Die während des Reviews entstandenen Bot-PRs #148/#149 (Issues #146/#147) wurden begutachtet und gemergt; Issues #146/#147 sind geschlossen.

**Alle Befunde dieses Laufs sind erledigt und am 2026-09-28 nach `archived-todo.md` verschoben** (P1 Koalitionsausschluss-Key `"CDU"` – Issue #151; P3 tote i18n-Keys – Issue #152; P3 Beste-Koalition-Regler-Inkonsistenz – Issue #153; P3 Koalitions-Share-Link-Sperre – Issue #154). Beim Verschieben gegen den Code re-verifiziert: `koalitionsausschluss` nutzt in allen vier Wahlen gültige Parteinamen; die drei toten i18n-Keys sind in `einfache-sprache.json` nicht mehr vorhanden; „Beste Koalition" (script.js:368, 2653) und der Koalitionen-Tab (script.js:1923) nutzen beide `berechneGefilterteKoalitionen()`. Es bleiben keine offenen Punkte aus diesem Lauf.

## Review vom 2026-08-11-b (PR #120: Friction-Score, Regierungs-Simulator, Ergebnis-Karte, Live-URL-Sync) + Review vom 2026-08-11 (Modus mobil, PR #119, gemergt)

Vollständiger Bericht: `reports/review-2026-08-11-b.md`. Empirisch verifiziert (alle Harnesses grün, Friction-Score gegen unabhängige Neuberechnung auf 4 Wahlen, CDP-Browsertest). Die aus PR #118 bekannten Modus-Befunde wurden bei der Merge-Konflikt-Lösung übernommen und sind **behoben** – siehe Report `reports/review-2026-08-11-c.md` und Umsetzung in `archived-todo.md` (Implementierung vom 2026-08-11).

**Alle Befunde dieses Laufs sind erledigt und am 2026-09-28 nach `archived-todo.md` verschoben** (P1 `aria-label="null"`; P2 Live-URL-Sync nach `resetTest()` – Issue #125; P2/P3 Mobile-Switch-Erreichbarkeit; P3 Ergebnis-Karte Wahl-ID; P3 Label→div – Issue #133; P3 `svgBar()` – Issue #130; P3 Modus-Wechsel-Kontext – Issue #131). Beim Verschieben gegen den Code re-verifiziert: `switchTab(tabName, opts)` akzeptiert `opts.force` (script.js:702, 709), `syncShareUrl()` löscht den Hash im Leerzustand (script.js:278-285), `exportCardData()` nutzt den Wahl-Namen, und `index.html` verwendet `<div class="simulator-select-label">`. Alle Issues (#105, #106, #110, #113, #124, #129–#131) sowie PR #118 sind geschlossen bzw. gemergt. Es bleiben keine offenen Punkte aus diesem Lauf.

### Tracking offene GitHub-Issues (Stand 2026-09-28)

9 offene Issues, alle deckungsgleich mit den oben genannten P3-Punkten und weiterhin berechtigt offen. Keines geschlossen, keines neu angelegt (N-03 ist bewusst noch nicht als Issue erfasst):

| Issue | Titel | Befund |
| --- | --- | --- |
| #164 | resetAnswers() lässt Share-Hash stehen | F-07 |
| #165 | Modus-Wechsel rendert aktives Testergebnis nicht neu | F-08 |
| #166 | Stale Share-Hash im einfachen Modus nach Reset | 2026-08-17 |
| #167 | Koalitions-„Mit Ihnen"- Wert umfragegewichtet | 2026-08-17 |
| #168 | 50-%-Baseline bei null vergleichbaren Antworten | 2026-08-17 |
| #169 | Tote `config.json`-Keywords und `elections.json`-Felder | 2026-08-17 |
| #170 | README-Fragenzahlen + Escaping Parteinamen | F-09 + 2026-08-17 |
| #171 | Zwei parallele Mechanismen für Partei-Beschreibungen | N-02 |
| #172 | Koalition mit exakt 50 % unter Typ-Filtern unsichtbar | N-01 |

### Tracking offene GitHub-Pull-Requests (Stand 2026-09-28)

0 offene PRs. PR #174 („Review 2026-09-21: keine neuen Befunde, PR #173 gemergt, docs aktualisiert") geprüft (CLEAN, MERGEABLE, alle Checks grün, reine Doku-/Todo-Änderung ohne Anwendungscode) und gemergt (`36d6e1a`); Head-Branch `opencode/schedule-31b9a7-20260921113915` gelöscht. Keine weiteren verwaisten oder duplizierten Branches.

Derzeit offene Aufgaben: die P3-Punkte im Abschnitt „Review vom 2026-09-28" oben (N-03 neu, inkonsistente „Andere"-Sonderbehandlung) sowie die bestätigten P3-Punkte aus den Abschnitten 2026-09-14/2026-09-08/2026-08-20/2026-08-17.
