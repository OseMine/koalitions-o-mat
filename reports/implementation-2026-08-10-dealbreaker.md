# Umsetzung: Dealbreaker / Rote Linien (Issue #107, 2026-08-10)

Quelle: `todo.md:13` – „Erweiterung der bestehenden „Wichtige Frage (zählt doppelt)": Thesen als unverhandelbar markieren → Parteien/Koalitionen, die dort gegen den Nutzer stehen, werden stark abgewertet (P2)".

## Änderungen

### `script.js`

- **Zustand**: neues `let dealbreakerQuestions = new Set()`; Hilfsfunktion `dealbreakerWeight()` liest `config.thresholds.dealbreakerWeight` (Standard 4).
- **`frageGewicht(idx)`**: liefert für Dealbreaker das Dealbreaker-Gewicht (4), sonst 2 (wichtig) bzw. 1 (normal). Kombination „wichtig + Dealbreaker" ergibt das Dealbreaker-Gewicht → **Gewichtungslogik erweitert, nicht ersetzt**.
- **`toggleDealbreaker(idx)`** – Umschalter analog `toggleImportant`, mit `aria-pressed`.
- **Persistenz**: `saveTestState()` / `loadTestState()` speichern/laden `dealbreakers`; `resetAnswers()` und `initializeTest()` berücksichtigen das Set.
- **Teilen**: Share-URL um `&d=<Dealbreaker-Indizes>` erweitert; `parseShareHash()` parst das neue Feld rückwärtskompatibel (alte Links ohne `&d=` bleiben gültig, `&c=`/`&p=`-Gruppen verschoben auf Index 5/6); `applyPendingShare()` befüllt das Set und die ⛔-Buttons.
- **Berechnung**: neue zentrale Hilfsfunktion **`berechneUserMatch(partei)`** (in `showTestResults()` refactoriert, single source of truth, Node-testbar) zählt zusätzlich `dealbreakerConflicts` (Konflikt j/n bei als Dealbreaker markierter These). `berechneUserMatchFuerKoalition()` und `berechneUserMatchNachThema()` erben die Dealbreaker-Gewichtung automatisch über `frageGewicht()`.
- **Ergebnis-UI**: Hinweis `.dealbreaker-active-hint`, sobald Dealbreaker gesetzt sind; Konflikt-Badge `.tr-dealbreaker-conflict` im Partei-Card, wenn die Partei bei einer unverhandelbaren These gegen den Nutzer steht.
- **Frage-Karte**: ⛔-Button (`.q-dealbreaker`, rotes Active-Styling, Tooltip/Aria aus `dealbreakerHint`) neben dem ★-Button.

### Weitere Dateien

- `config.json` – `thresholds.dealbreakerWeight: 4` aufgenommen.
- `einfache-sprache.json` – neue Keys `dealbreakerHint`, `dealbreakerActiveHint`, `dealbreakerConflict` (in einfacher Sprache); `methodologyNote` aktualisiert.
- `index.html` – `methodologyNote` erklärt die starke Abwertung.
- `styles.css` – `.q-dealbreaker` (+ 44 px Touch-Ziel mobil), `.tr-dealbreaker-conflict`, `.dealbreaker-active-hint`.
- `README.md` – Parteien-Test-Beschreibung und `config.json`-Doku ergänzt.

## Verifikation (Node-Harness)

```bash
node --check script.js                      # OK
node harness/dealbreaker-harness.js         # 25/25 ok (neu)
node harness/tactical-match-gap.js          # 15/15 ok (keine Regression)
node harness/tactical-scenarios-check.js    # 17/17 ok (keine Regression)
node tools/tactical-harness.js              # OK (keine Regression)
```

Neuer Harness `harness/dealbreaker-harness.js` prüft:

- Gewichte: normal=1, wichtig=2, Dealbreaker=4 (`dealbreakerWeight`), wichtig+Dealbreaker → 4.
- `berechneUserMatch()`: volle Zustimmung 100 % (A), nur-wichtiger-Konflikt ~71,4 % (B), **Dealbreaker-Konflikt ~42,9 % (C)** → deutlich stärker abgewertet; `dealbreakerConflicts` korrekt.
- Regression: Ohne Dealbreaker-Markierung verhält sich C wie eine normale wichtige Frage (75 %, keine Konflikt-Zählung).
- `berechneUserMatchFuerKoalition()`: [A,B] ohne Konflikt ~87 %, [A,C] mit Dealbreaker-Konflikt ~77,1 %; ohne Markierung ~90 % → keine Regression.
- Share-Hash-Round-Trip: `&d=1,2` geparst; alte Links mit `&c=` bleiben gültig.
- i18n: `dealbreakerHint`/`dealbreakerActiveHint`/`dealbreakerConflict` in `einfache-sprache.json` vorhanden.