# Koalitions-O-Mat – Offene Aufgaben

Erledigte Aufgaben wurden nach `archived-todo.md` verschoben (Stand 2026-08-11). Dokumentierte Läufe und Umsetzungen (Bugfixes vom 2026-08-11, Einfacher/Erweiterter Modus, Dealbreaker, 2D-Politik-Kompass, Taktik-Simulator, Feature-Evaluationen, Reviews) siehe dort.

## Review vom 2026-08-11 (Fokus: Einfach/Erweitert-Switch mobil) – siehe `reports/review-2026-08-11.md`

### P1 – Bugs

- [ ] **`aria-label="null"` (String) auf beiden Modus-Segmenten im Normalmodus** – `applyStaticI18n()` (script.js:3204-3210) setzt `setAttribute('aria-label', null)` wenn kein Einfache-Sprache-Modus aktiv ist → Screenreader sagen „null" statt „Einfacher/Erweiterter Modus".
- [ ] **Header-Zeile kollabiert bei 481–≈590 px** – ab >480 px werden Modus-/Sprach-Labels wieder eingeblendet, `.header-right` wächst auf 453 px und schiebt das `h1` aus dem Viewport (x bis −61 px, scrollWidth > innerWidth). Betrifft Phone-Landscape & schmale Tablets.

### P2 – Fehlende Features

- [ ] **Modus-Switch im laufenden Test nicht erreichbar** – nur die Tabs sind sticky (styles.css:725), der `.header-row` mit `#modeToggle` scrollt aus dem Blick; Wechsel nur nach Scrollen ganz nach oben möglich.
- [ ] **Tap-Ziele der Modus-Segmente unter 44 px, nur Icons ohne Text <480 px** – Segmente 24,5–24,9 px breit / 28–30 px hoch (styles.css:753-755), Labels ausgeblendet, `title`-Tooltip auf Touch nicht sichtbar.

### P3 – Verbesserungen

- [ ] **Modus-Wechsel ohne sichtbaren Kontext** – nach dem Umschalten fehlt eine Erklärung, welche Ansichten im einfachen Modus ausgeblendet sind (siehe `parteiSeiteDisabled`/`shareDisabledSimple`-Muster).

## Feature-Evaluation vom 2026-08-10 (Issue #102 „Features might to add") – offene Features

### P2 – Neue Features

- [ ] **Koalitions-Reibungs-Index (Friction Score)** – je Koalition zusätzlich zur Übereinstimmung einen Kompromiss-Schwierigkeits-Score (P2): welche Thesen trennen die Partner am stärksten (größte Positionsdifferenz im Paar); pro Koalition die Top-Konfliktthesen anzeigen. Hoher Nutzen, da genau das Alleinstellungsmerkmal von Koalitions-Bildung.
- [ ] **Regierungs-Simulator (Custom Coalition Builder)** – eigene Koalition manuell zusammenstellen (Checkboxen/Partei-Picker statt Drag&Drop, da ohne Framework), Mehrheit anhand der Sitze prüfen, eigene Übereinstimmung mit der Kombination sowie welcher Partner bei welcher These am meisten abweichen müsste (P2).

### P3 – Neue Features

- [x] **Thesis-Matrix-Heatmap** – Partei × These-Tabelle in Grün/Rot/Grau (zustimmen/dagegen/neutral) für schnelle Block-Erkennung; Daten (`wert` je Partei je Frage) sind vorhanden, nur Rendering neu (P3). → in `archived-todo.md` (im Code umgesetzt: `renderThesisHeatmap()` script.js:2989, `#thesisHeatmap` index.html:182).
- [ ] **Ergebnis-Karte als PNG/SVG exportieren** – aus den vorhandenen Share-Daten eine Social-Media-taugliche Karte (Top-Koalition, Top-Partei, Schwerpunkt-Themen) als Bild erzeugen (P3).

## Feature-Evaluation vom 2026-08-10 (Issue „How to hash") – P3

- [ ] **Share-State live in die URL schreiben** – statt den Hash nur beim expliziten „Teilen"-Klick zu setzen, den Zustand (Wahl, Antworten, wichtige Fragen) laufend per `history.replaceState` synchron halten, sodass Fortsetzen/Teilen auch über Bookmark/URL kopieren funktioniert, ohne dass die Seiten-Historie zersplittert. Kleiner, risikoarmer Mehrwert über dem heutigen localStorage-`saveTestState()` + explizitem `shareResults()`; Kodierung bleibt das bestehende kompakte Format (kein Base64).