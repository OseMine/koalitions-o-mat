# Koalitions-O-Mat – Offene Aufgaben

Erledigte Aufgaben wurden nach `archived-todo.md` verschoben (Stand 2026-08-11). Dokumentierte Läufe und Umsetzungen (Bugfixes vom 2026-08-11, Einfacher/Erweiterter Modus, Dealbreaker, 2D-Politik-Kompass, Taktik-Simulator, Feature-Evaluationen, Reviews) siehe dort.

## Review vom 2026-08-11 (Fokus: Einfacher/Erweiterter Modus & `config.json`-Nutzung)

Details siehe [`reports/review-2026-08-11.md`](reports/review-2026-08-11.md) – alle Befunde per Headless-Chromium gegen den realen Build verifiziert.

### P1 – Bugs

- [ ] **Erweitert-Modus: alle Tab-Panels gleichzeitig sichtbar** – `styles.css:1052` (`body:not(.mode-simple) [data-simple-off] { display: revert; }`) überschreibt `.tab-content { display:none }` (0,2,1 > 0,1,0), dadurch zeigen nach `setMode('advanced')` alle vier Panels `display:block` zugleich; Tab-Wechsel blendet nichts aus, die drei Zusatz-Panels sind initial leer („Tabs zeigen nichts"). `display: revert` in gezielte Ausblend-Logik umwandeln (nur aktives Panel sichtbar).
- [ ] **Wechsel zurück auf „Einfach" bei aktivem Nicht-Test-Tab → leere tote Hauptfläche** – `applyModeVisibility()` (script.js:79) springt nur aufs Test-Tab, wenn `simpleOff('tab.<aktiverTab>')` wahr ist; da `ui.simple.off` keine `tab.*`-Keys mehr enthält, bleibt ein per CSS versteckter Tab aktiv (kein sichtbarer Tab, alle Panels `none`). Fallback unabhängig von der Config-Liste machen (z. B. `data-simple-off`-Attribut des aktiven Tab-Buttons prüfen).
- [ ] **`config.ui.simple.off` steuert die ausgeblendeten Ansichten faktisch nicht** – Sichtbarkeit von Tabs/Teilen/Kompass/Thesen-Matrix/Historie wird nur über die hard-gecodeten `data-simple-off`-Attribute (index.html:71-73/95/107/146/151/171/182/201) + styles.css:1051 bestimmt; Konfig-Liste wirkungslos (verifiziert: leere Liste blendet trotzdem alles aus). Eine Quelle der Wahrheit festlegen und die HTML-Attribute daraus erzeugen (oder umgekehrt).

### P2 – Fehlende Features

- [ ] **Dead Guards `simpleOff('tab.*')`/`teilen`/`historie`** – `switchTab()` (script.js:328), `initializeParteienPage()` (599), `initializeDaten()` (2549), `shareResults()` (172), `saveTestResult()` (2451) prüfen Keys, die nicht mehr in `ui.simple.off` stehen → Historie wird im einfachen Modus weiter gespeichert, Teilen nicht gesperrt. Guards auf dieselbe Quelle wie die CSS-Ausblendung umstellen.
- [ ] **README/Doku beschreiben `ui.simple.off`-Steuerung, die so nicht existiert** – README:17/41 und archived-todo.md:39 listen `tab.parteien`/`thesenMatrix`/`historie`/`teilen`/… als konfigurierbar, real wirkt die Liste nur auf `kompass`/`dealbreaker`/`taktik` (Doku seit Commit `963144e` veraltet).

## Feature-Evaluation vom 2026-08-10 (Issue #102 „Features might to add") – offene Features

### P2 – Neue Features

- [ ] **Koalitions-Reibungs-Index (Friction Score)** – je Koalition zusätzlich zur Übereinstimmung einen Kompromiss-Schwierigkeits-Score (P2): welche Thesen trennen die Partner am stärksten (größte Positionsdifferenz im Paar); pro Koalition die Top-Konfliktthesen anzeigen. Hoher Nutzen, da genau das Alleinstellungsmerkmal von Koalitions-Bildung.
- [ ] **Regierungs-Simulator (Custom Coalition Builder)** – eigene Koalition manuell zusammenstellen (Checkboxen/Partei-Picker statt Drag&Drop, da ohne Framework), Mehrheit anhand der Sitze prüfen, eigene Übereinstimmung mit der Kombination sowie welcher Partner bei welcher These am meisten abweichen müsste (P2).

### P3 – Neue Features

- [ ] **Ergebnis-Karte als PNG/SVG exportieren** – aus den vorhandenen Share-Daten eine Social-Media-taugliche Karte (Top-Koalition, Top-Partei, Schwerpunkt-Themen) als Bild erzeugen (P3).

## Feature-Evaluation vom 2026-08-10 (Issue „How to hash") – P3

- [ ] **Share-State live in die URL schreiben** – statt den Hash nur beim expliziten „Teilen"-Klick zu setzen, den Zustand (Wahl, Antworten, wichtige Fragen) laufend per `history.replaceState` synchron halten, sodass Fortsetzen/Teilen auch über Bookmark/URL kopieren funktioniert, ohne dass die Seiten-Historie zersplittert. Kleiner, risikoarmer Mehrwert über dem heutigen localStorage-`saveTestState()` + explizitem `shareResults()`; Kodierung bleibt das bestehende kompakte Format (kein Base64).