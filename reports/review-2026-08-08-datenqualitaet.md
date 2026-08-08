# Koalitions-O-Mat – Review vom 2026-08-08: Datenqualität „CDU/CSU" vs. „CDU"; „SSW" in Berlin

Fokus: Issue „Datenqualität: „CDU/CSU" vs. „CDU"; „SSW" (0,5 %) in Berlin". Alle Befunde per Node-Harness gegen die echten Datendateien (`elections/*/werte.json`, `elections/*/fragen.json`, `config.json`) verifiziert.

## Ergebnis

Alle Akzeptanzkriterien des Issues sind **bereits erfüllt** – die kritisierten Datenprobleme sind in `main` behoben. Es waren keine Datenänderungen nötig. Ein Rest-Befund wurde im Generator-Prompt korrigiert.

### Parteibezeichnungen einheitlich („CDU/CSU")

- Alle 4 Wahlen (btw2029, Berlin, LSA, MV) verwenden in `werte.json` (`umfragewerte[].partei`) und `fragen.json` (`antworten`-Keys) durchgängig **„CDU/CSU"** – kein Parteieintrag lautet exakt „CDU" (verifiziert per Node für alle Dateien).
- Die Zusammenfassung der Union zu einer Einheit ist bewusst gewählt und in `prompt-gemini-fragen.md:84` dokumentiert („CDU/CSU (always combined as one)").
- Parteimengen in `werte.json` ↔ `fragen.json` sind je Wahl identisch (7 Parteien pro Wahl).

### `partyColors` kennt alle Namen

- `config.json.partyColors` enthält `"CDU/CSU": "#000000"` sowie Farben für alle in den Datendateien verwendeten Parteinamen (AfD, BSW, CDU/CSU, FDP, GRÜNE, LINKE, SPD). Der `default`-Fallback wird nicht gebraucht.

### Kein SSW in der Berlin-Umfrage

- Keine Datendatei enthält einen SSW-Wert in Berlin; SSW kommt in der Berechnung nirgends vor (SSW ist nur für Schleswig-Holstein relevant, Farbe/News-Begriffe bleiben für künftige SH-Wahlen in `config.json`/`script.js`).

## Änderungen in diesem Lauf

- `prompt-gemini-fragen.md:92`: Hinweis „SSW (only in Schleswig-Holstein / Berlin)" → „… never in Berlin" – verhindert, dass der Generator die unplausiblen Werte bei künftigen Daten-Generationen erneut einspielt.
- `todo.md`: Punkte 107/126/134 abgehakt; nach `archived-todo.md` verschoben.
- `archived-todo.md`: Nachtrag 2026-08-08 mit dem Verifikations-Nachweis.