# Koalitions-O-Mat – Offene Aufgaben

Erledigte Aufgaben wurden nach `archived-todo.md` verschoben (Stand 2026-08-11). Dokumentierte Läufe und Umsetzungen (Friction-Score, Regierungs-Simulator, Thesen-Matrix, Ergebnis-Karte, Live-URL-Sync, Bugfixes, Einfacher/Erweiterter Modus, Dealbreaker, 2D-Politik-Kompass, Taktik-Simulator, Feature-Evaluationen, Reviews) siehe dort.

## Review vom 2026-08-11-b (PR #120: Friction-Score, Regierungs-Simulator, Ergebnis-Karte, Live-URL-Sync) + Review vom 2026-08-11 (Modus mobil, PR #119, gemergt)

Vollständiger Bericht: `reports/review-2026-08-11-b.md`. Empirisch verifiziert (alle Harnesses grün, Friction-Score gegen unabhängige Neuberechnung auf 4 Wahlen, CDP-Browsertest). Die bekannten Modus-Befunde aus PR #118 (offen) bzw. `reports/review-2026-08-11.md` (gemergt) wurden re-verifiziert und sind unten als Referenz mitgeführt.

### P1 – Bugs (bekannt, weiter offen – aus #118/#119, re-verifiziert)

- [ ] **Erweitert-Modus: alle 4 Tab-Panels gleichzeitig sichtbar** – `styles.css:1140` `body:not(.mode-simple) [data-simple-off] { display: revert }` gewinnt gegen `.tab-content.active`. PR #118, P1#1.
- [ ] **Zurück auf „Einfach" bei aktivem Nicht-Test-Tab → Dead-Zustand (kein sichtbares Panel)** – `applyModeVisibility()` (script.js:79-81), `config.ui.simple.off` enthält keine `tab.*`-Keys, die CSS-Regel blendet das aktive Panel aber aus. PR #118, P1#2.
- [ ] **`aria-label="null"` auf beiden `.mode-seg`-Buttons** – `applyStaticI18n()` (script.js:3724-3743). PR #119/#118.

### P2 – Bugs

- [ ] **Dead Guards `simpleOff('teilen'/'historie')` – Live-URL-Sync und Historie laufen im einfachen Modus** – `simple.off` kennt die Keys nicht mehr; verletzt den Privatsphäre-Kommentar in `syncShareUrl()` (script.js:209) und schreibt die Historie weiter (`saveTestResult()`, script.js:2983). PR #118, P2#1.
- [ ] **Live-URL-Sync hinterlässt nach `resetTest()` einen veralteten Share-Hash** – `resetTest()` (script.js:2006) ruft `syncShareUrl()`; bei leerem Zustand liefert `buildShareUrl()` `null` und der Hash bleibt stehen → Reload/Bookmark stellt alte Antworten wieder her. Fix: Hash beim Reset leeren (siehe Report).

### P2/P3 – Verbesserungen / Mobile (bekannt aus #119)

- [ ] **Mobile-Switch-Erreichbarkeit (sticky, Tap-Ziele, Header 481–599 px)** – Befunde aus `reports/review-2026-08-11.md` (gemergt), weiter offen.

### P3 – Verbesserungen

- [ ] **Ergebnis-Karte zeigt rohe Wahl-ID statt Wahl-Name** – `exportCardData()` (script.js:284) `electionName = activeElectionId`; `getActiveElectionName()` (script.js:3470) stattdessen verwenden.
- [ ] **i18n „es fehlen {n} Sitze"/„mind. {n} Sitze" bei {n}=1 ungrammatisch** – `einfache-sprache.json:87-88`; tritt in mv-2026 (39/79 Sitze) auf. Singular-Variante.
- [ ] **`<label class="simulator-select-label">` umschließt `<div>`** (index.html:111) – semantisch ungültig, Klick aufs Label kippt unbestimmte Checkbox. Als `<span>` ausführen.
- [ ] **`svgBar()` leerer Wrapper** (script.js:302) – entfernen oder real nutzen.
- [ ] **Modus-Wechsel ohne sichtbaren Kontext** (aus PR #119, gemergt) – nach dem Umschalten fehlt eine Erklärung, welche Ansichten im einfachen Modus ausgeblendet sind (siehe `parteiSeiteDisabled`/`shareDisabledSimple`-Muster).

### Tracking offene GitHub-Issues

- **#105 (Friction Score), #106 (Regierungs-Simulator), #110 (Ergebnis-Karte PNG/SVG)**: in PR #120 umgesetzt und verifiziert – **nach Merge von #120 schließen**.
- **#113 (Cleanup Branch issue99)**: geschlossen (Branch existiert nicht mehr, 2026-08-11).
- **PR #118 (Modus-Befunde)**: offen, Inhalte hier mitgeführt.

Derzeit sind keine weiteren offenen Aufgaben erfasst.