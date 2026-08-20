# Koalitions-O-Mat – Offene Aufgaben

Erledigte Aufgaben wurden nach `archived-todo.md` verschoben (Stand 2026-08-13). Dokumentierte Läufe und Umsetzungen (Friction-Score, Regierungs-Simulator, Thesen-Matrix, Ergebnis-Karte, Live-URL-Sync, Bugfixes, Einfacher/Erweiterter Modus, Dealbreaker, 2D-Politik-Kompass, Taktik-Simulator, Feature-Evaluationen, Reviews) siehe dort.

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

Vollständiger Bericht: `reports/review-2026-08-13.md`. Empirisch verifiziert (Node-Harness gegen die echten Daten, Sitzverteilung aller 4 Wahlen, Übereinstimmungs-Berechnung, alle bestehenden Harnesses grün). Issue #125 (veralteter Share-Hash) ist mit PR #145 behoben und abgehakt (siehe unten). Die während des Reviews entstandenen Bot-PRs #148/#149 (Issues #146/#147) wurden begutachtet und gemergt; Issues #146/#147 sind geschlossen.

### P1 – Bugs

- [ ] **Koalitionsausschluss-Key `"CDU"` matcht keine Partei** – `elections/ltw-sachsen-anhalt-2026/config.json:9` nutzt den Key `"CDU"`, die Partei heißt in `werte.json` aber `"CDU/CSU"`. Der Ausschluss CDU–LINKE wird daher nie angewendet; die Koalition CDU/CSU–LINKE würde fälschlich als zulässig angezeigt. Fix: Key auf `"CDU/CSU"` korrigieren.

### P3 – Verbesserungen

- [ ] **Tote i18n-Keys in `einfache-sprache.json`** – `electionLabel`, `modeSwitchToSimple`, `modeSwitchToAdvanced` werden nirgends per `t()` abgefragt (keine Funktionsbeeinträchtigung).
- [ ] **„Beste Koalition" im Ergebnis-Tab nutzt feste Schwelle statt des MinMatch-Reglers** – `showTestResults()` filtert über die feste `minCoalMatch`-Schwelle (config), nicht über den aktuellen Reglerwert im Koalitionen-Tab (Inkonsistenz).
- [x] **Reiner Koalitions-Share-Link ohne Antworten wird durch die Test-Tab-Sperre blockiert** (aus PR-#149-Review, Issue #154) – `applyPendingShare()` → `switchTab('koalitionen')` scheiterte am `testInProgress()`-Guard; Nutzer landete im Test statt in der geteilten Koalitions-Sicht. Fix: `switchTab()` akzeptiert `opts.force` für programmatische Wechsel (nur beim Wiederherstellen geteilter Zustände); `testInProgress()` liefert auf einem anderen als dem Test-Tab `false` (Sperre gilt nur, solange der Test-Tab aktiv ist); `applyPendingShare()` hebt die Sperre nach dem Wechsel auf. Beim manuellen Testen bleibt die Sperre unverändert, wer danach in den Test-Tab wechselt, startet den Test und unterliegt wieder der Sperre. Verifiziert per neuem Harness `harness/share-lock-harness.js` (23/23 Checks).

### Tracking GitHub-Issues (alle geschlossen)

- **#146** (Tab-Wechsel während des initialen Partei-Tests verhindern): mit PR #149 gelöst, geschlossen.
- **#147** (Feature-Request Erklärseite): mit PR #148 gelöst, geschlossen.

## Review vom 2026-08-11-b (PR #120: Friction-Score, Regierungs-Simulator, Ergebnis-Karte, Live-URL-Sync) + Review vom 2026-08-11 (Modus mobil, PR #119, gemergt)

Vollständiger Bericht: `reports/review-2026-08-11-b.md`. Empirisch verifiziert (alle Harnesses grün, Friction-Score gegen unabhängige Neuberechnung auf 4 Wahlen, CDP-Browsertest). Die aus PR #118 bekannten Modus-Befunde (Fokus „Einfacher/Erweiterter Modus & `config.json`-Nutzung") wurden bei der Merge-Konflikt-Lösung übernommen und sind **behoben** – siehe Report `reports/review-2026-08-11-c.md` und Umsetzung in `archived-todo.md` (Implementierung vom 2026-08-11). Die übrigen Befunde aus #119/#120 bleiben unten offen.

### P1 – Bugs

- [x] **`aria-label="null"` auf beiden `.mode-seg`-Buttons** – `applyStaticI18n()` (script.js:3752-3778). PR #119/#118. Fix: deutsche Statik-`aria-label` in index.html ergänzt und Fallback in `applyStaticI18n()` gegen `null`/`undefined` abgesichert (restauriert nur echte Originale, sonst entfernt das Attribut). Verifiziert per CDP (kein `aria-label="null"` mehr, Normal- wie Einfache-Sprache-Modus).

### P2 – Bugs

- [x] **Live-URL-Sync hinterlässt nach `resetTest()` einen veralteten Share-Hash** (Issue #125) – mit PR #145 gemergt; Fix in `syncShareUrl()` (script.js:270-292) verifiziert (Hash wird bei leerem Zustand geleert, `lastSyncedHash` verhindert Overwrite bei unverändertem Zustand). Archiviert in `archived-todo.md` (2026-08-13).

### P2/P3 – Verbesserungen / Mobile (bekannt aus #119)

- [x] **Mobile-Switch-Erreichbarkeit (sticky, Tap-Ziele, Header 481–599 px)** – Befunde aus `reports/review-2026-08-11.md` (gemergt). Fix: `#modeToggle` wandert auf ≤600 px aus der Kopfzeile in eine sticky `.sticky-nav`-Hülle (Modus-Umschalter als vollbreite Zeile über den Tabs, immer erreichbar); Segmente ≥40 px hoch mit dauerhaft sichtbaren Labels; Header-Kopfzeile dadurch entlastet (kein Overflow 481–599 px, Einfache-Sprache-Button auf ≤600 px Icon-only). Verifiziert per CDP über 320–768 px + Scroll-Test 390×844 (scrollY=600). Umsetzung siehe `archived-todo.md`.

### P3 – Verbesserungen

- [x] **Ergebnis-Karte zeigt rohe Wahl-ID statt Wahl-Name** – `exportCardData()` (script.js:312) `electionName = activeElectionId`; stattdessen `getActiveElectionName()` (script.js:3498) verwendet – identisch zur Ergebnis-Ansicht (`showTestResults()`). Verifiziert per `node --check script.js`.
- [x] **`<label class="simulator-select-label">` umschließt `<div>`** (index.html:111) – semantisch ungültig, Klick aufs Label kippt unbestimmte Checkbox. Umsetzung: `<div>`-Wrapper (Issue #133, siehe archived-todo.md).
- [x] **`svgBar()` leerer Wrapper** (script.js:330) – jetzt real genutzt: `buildResultCardSVG()` baut die Ranglisten-Balken der Ergebnis-Karte über `svgBar()` (Array → Join statt Inline-Konkatenation, gerenderte Ausgabe identisch). Verifiziert per `node --check` und Harness.
- [x] **Modus-Wechsel ohne sichtbaren Kontext** (aus PR #119, gemergt) – nach dem Umschalten fehlt eine Erklärung, welche Ansichten im einfachen Modus ausgeblendet sind (siehe `parteiSeiteDisabled`/`shareDisabledSimple`-Muster). Umsetzung: persistente Hinweiszeile `#modeHint` (benennt die via `config.ui.simple.off` ausgeblendeten Ansichten, i18n via `t()` inkl. Einfacher Sprache), siehe `archived-todo.md`.

### Tracking offene GitHub-Issues

- **#105 (Friction Score)**: in PR #120 umgesetzt und verifiziert; Best-Koalition-Anzeige („Beste Koalition für Sie") trägt zusätzlich Reibungs-Score + Konfliktthesen-Toggle. Geschlossen.
- **#106 (Regierungs-Simulator)**: in PR #120 umgesetzt und verifiziert; der i18n-Singular-Fix wurde zusätzlich umgesetzt (Issue #128/#136, `tSingularPlural()` + Singular-Keys, 4 Harness-Checks). Geschlossen.
- **#110 (Ergebnis-Karte PNG/SVG)**: in PR #120 umgesetzt und verifiziert; im UI nur noch **PNG**-Export (SVG bleibt intern Basis des PNG-Renderings), Wahl-Name statt roher Wahl-ID auf der Karte. Geschlossen.
- **#113 (Cleanup Branch issue99)**: geschlossen (Branch existiert nicht mehr, 2026-08-11).
- **#124 (`aria-label="null"` auf `.mode-seg`)**: bereits durch PR #132 (Issue #126) behoben und verifiziert. Geschlossen.
- **#129 (Label→div) / #130 (`svgBar()` real nutzen) / #131 (Hinweiszeile für ausgeblendete Ansichten)**: umgesetzt und verifiziert (PRs #133/#134/#141). Geschlossen.
- **PR #118 (Modus & config.json)**: Merge-Konflikte gelöst, alle 5 Befunde behoben und hier übernommen (Report `reports/review-2026-08-11-c.md`, Umsetzung in `archived-todo.md`); Inhalt in main, PR geschlossen.

Derzeit offene Aufgaben: P1 Koalitionsausschluss-Key `"CDU"` (LSA), P3 tote i18n-Keys, P3 Beste-Koalition-Regler-Inkonsistenz – siehe Abschnitt „Review vom 2026-08-13" oben.