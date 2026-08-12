# Koalitions-O-Mat – Offene Aufgaben

Erledigte Aufgaben wurden nach `archived-todo.md` verschoben (Stand 2026-08-11). Dokumentierte Läufe und Umsetzungen (Friction-Score, Regierungs-Simulator, Thesen-Matrix, Ergebnis-Karte, Live-URL-Sync, Bugfixes, Einfacher/Erweiterter Modus, Dealbreaker, 2D-Politik-Kompass, Taktik-Simulator, Feature-Evaluationen, Reviews) siehe dort.

## Review vom 2026-08-11-b (PR #120: Friction-Score, Regierungs-Simulator, Ergebnis-Karte, Live-URL-Sync) + Review vom 2026-08-11 (Modus mobil, PR #119, gemergt)

Vollständiger Bericht: `reports/review-2026-08-11-b.md`. Empirisch verifiziert (alle Harnesses grün, Friction-Score gegen unabhängige Neuberechnung auf 4 Wahlen, CDP-Browsertest). Die aus PR #118 bekannten Modus-Befunde (Fokus „Einfacher/Erweiterter Modus & `config.json`-Nutzung") wurden bei der Merge-Konflikt-Lösung übernommen und sind **behoben** – siehe Report `reports/review-2026-08-11-c.md` und Umsetzung in `archived-todo.md` (Implementierung vom 2026-08-11). Die übrigen Befunde aus #119/#120 bleiben unten offen.

### P1 – Bugs

- [x] **`aria-label="null"` auf beiden `.mode-seg`-Buttons** – `applyStaticI18n()` (script.js:3752-3778). PR #119/#118. Fix: deutsche Statik-`aria-label` in index.html ergänzt und Fallback in `applyStaticI18n()` gegen `null`/`undefined` abgesichert (restauriert nur echte Originale, sonst entfernt das Attribut). Verifiziert per CDP (kein `aria-label="null"` mehr, Normal- wie Einfache-Sprache-Modus).

### P2 – Bugs

- [ ] **Live-URL-Sync hinterlässt nach `resetTest()` einen veralteten Share-Hash** – `resetTest()` (script.js:2006) ruft `syncShareUrl()`; bei leerem Zustand liefert `buildShareUrl()` `null` und der Hash bleibt stehen → Reload/Bookmark stellt alte Antworten wieder her. Fix: Hash beim Reset leeren (siehe Report).

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

Derzeit sind keine weiteren offenen Aufgaben erfasst (offener Bug: Issue #125 – veralteter Share-Hash nach `resetTest()`, siehe oben).