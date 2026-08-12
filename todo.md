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

- [ ] **Ergebnis-Karte zeigt rohe Wahl-ID statt Wahl-Name** – `exportCardData()` (script.js:284) `electionName = activeElectionId`; `getActiveElectionName()` (script.js:3470) stattdessen verwenden.
- [ ] **i18n „es fehlen {n} Sitze"/„mind. {n} Sitze" bei {n}=1 ungrammatisch** – `einfache-sprache.json:87-88`; tritt in mv-2026 (39/79 Sitze) auf. Singular-Variante.
- [ ] **`<label class="simulator-select-label">` umschließt `<div>`** (index.html:111) – semantisch ungültig, Klick aufs Label kippt unbestimmte Checkbox. Als `<span>` ausführen.
- [ ] **`svgBar()` leerer Wrapper** (script.js:302) – entfernen oder real nutzen.
- [ ] **Modus-Wechsel ohne sichtbaren Kontext** (aus PR #119, gemergt) – nach dem Umschalten fehlt eine Erklärung, welche Ansichten im einfachen Modus ausgeblendet sind (siehe `parteiSeiteDisabled`/`shareDisabledSimple`-Muster).

### Tracking offene GitHub-Issues

- **#105 (Friction Score), #106 (Regierungs-Simulator), #110 (Ergebnis-Karte PNG/SVG)**: in PR #120 umgesetzt und verifiziert – **nach Merge von #120 schließen**.
- **#113 (Cleanup Branch issue99)**: geschlossen (Branch existiert nicht mehr, 2026-08-11).
- **PR #118 (Modus & config.json)**: Merge-Konflikte gelöst, alle 5 Befunde behoben und hier übernommen (Report `reports/review-2026-08-11-c.md`, Umsetzung in `archived-todo.md`); #118 nach Merge dieses PRs schließen.

Derzeit sind keine weiteren offenen Aufgaben erfasst.