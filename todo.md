# Koalitions-O-Mat – Offene Aufgaben

Erledigte Aufgaben wurden nach `archived-todo.md` verschoben (Stand 2026-08-11). Dokumentierte Läufe und Umsetzungen (Bugfixes vom 2026-08-11, Einfacher/Erweiterter Modus, Dealbreaker, 2D-Politik-Kompass, Taktik-Simulator, Feature-Evaluationen, Reviews) siehe dort.

## Feature-Evaluation vom 2026-08-10 (Issue #102 „Features might to add") – offene Features

### P2 – Neue Features

- [ ] **Koalitions-Reibungs-Index (Friction Score)** – je Koalition zusätzlich zur Übereinstimmung einen Kompromiss-Schwierigkeits-Score (P2): welche Thesen trennen die Partner am stärksten (größte Positionsdifferenz im Paar); pro Koalition die Top-Konfliktthesen anzeigen. Hoher Nutzen, da genau das Alleinstellungsmerkmal von Koalitions-Bildung.
- [ ] **Regierungs-Simulator (Custom Coalition Builder)** – eigene Koalition manuell zusammenstellen (Checkboxen/Partei-Picker statt Drag&Drop, da ohne Framework), Mehrheit anhand der Sitze prüfen, eigene Übereinstimmung mit der Kombination sowie welcher Partner bei welcher These am meisten abweichen müsste (P2).

### P3 – Neue Features

- [ ] **Thesis-Matrix-Heatmap** – Partei × These-Tabelle in Grün/Rot/Grau (zustimmen/dagegen/neutral) für schnelle Block-Erkennung; Daten (`wert` je Partei je Frage) sind vorhanden, nur Rendering neu (P3).
- [ ] **Ergebnis-Karte als PNG/SVG exportieren** – aus den vorhandenen Share-Daten eine Social-Media-taugliche Karte (Top-Koalition, Top-Partei, Schwerpunkt-Themen) als Bild erzeugen (P3).

## Feature-Evaluation vom 2026-08-10 (Issue „How to hash") – P3

- [ ] **Share-State live in die URL schreiben** – statt den Hash nur beim expliziten „Teilen"-Klick zu setzen, den Zustand (Wahl, Antworten, wichtige Fragen) laufend per `history.replaceState` synchron halten, sodass Fortsetzen/Teilen auch über Bookmark/URL kopieren funktioniert, ohne dass die Seiten-Historie zersplittert. Kleiner, risikoarmer Mehrwert über dem heutigen localStorage-`saveTestState()` + explizitem `shareResults()`; Kodierung bleibt das bestehende kompakte Format (kein Base64).