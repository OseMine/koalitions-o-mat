# Koalitions-O-Mat – Offene Aufgaben

Erledigte Aufgaben wurden nach `archived-todo.md` verschoben (Stand 2026-08-08).

## Review vom 2026-08-08 (gesamtes Projekt, Node-Verifikation + GitHub-Cleanup)

Vollständiger Bericht: `reports/review-2026-08-08.md`. Sitzsummen (630/130/83/79), Ranking-Verhalten, i18n-Abdeckung und MV-Einfach-Sprache erneut per Node-Harness gegen die echten Datendateien verifiziert. **Keine neuen P1-Bugs.**

### P3 – Verbesserungen

- [x] **Berlin-2026: BSW hat bei 6 Fragen keine Position** (nr 9, 20, 32, 36, 37, 45) – einzige Partei über alle 4 Wahlen mit Lücken; `getAnswerValue()` liefert dort `'m'` (neutral). **Erledigt**: echte belegte BSW-Positionen (`n`) für nr 9 & 32 ergänzt, übrige vier als dokumentierte Neutralität markiert – BSW hat nun in allen 52 Fragen einen Eintrag.
- [x] **Improve UX and UI** make it easier to understand. **Umsetzung (Issue „Verbesserung der UX & UI", 2026-08-09)**: ARIA-Tabs mit `role="tablist"/"tab"/"tabpanel"`, `aria-selected` + Roving-Tabindex und Pfeiltasten-/Home-/End-Navigation; sichtbarer Tastatur-Fokus (`:focus-visible`) global, Koalitions-Checkboxen wieder per Tastatur fokussierbar (statt `display:none`, jetzt `:has(input:focus-visible)`-Ring); `aria-pressed` für „Wichtige Frage"- und Antwort-Buttons; Screenreader-Status für Koalitionslisten (`#coalitionStatus`, `role="status"`) und Benachrichtigungen (`role="status"`/`role="alert"`); erklärender Filter-Hinweis + „Alle Filter zurücksetzen"-Button (`resetCoalitionFilters()`) im Koalitionen-Tab; neue i18n-Keys `filterHint`/`resetFilters`/`filtersReset` in `einfache-sprache.json`; Doku in README („Bedienung & Barrierefreiheit"). Verifiziert mit `node --check script.js`.
- [x] **Issue „Unvereinbarkeits-Koalitionen können entstehen" (2026-08-09)** – umgesetzt: neue Wahlkonfigurations-Key `koalitionsausschluss` (Objekt, das pro Partei festlegt, mit welchen Parteien sie nicht regieren will, z. B. `"AfD": ["SPD", "GRÜNE", "LINKE"]`); `istKoalitionAusgeschlossen()` (script.js) blendet jede Koalition aus, die ein solches Ausschluss-Paar enthält. Für alle 4 Wahlen AfD → SPD/GRÜNE/LINKE definiert. UX: Hinweis `.exclusion-hint` im Koalitionen-Tab (Ergebnis- und Leerzustand), `methodologyMathHint` aktualisiert, i18n-Keys `excludedCoalitionsHint`/`methodologyMathHint` in `einfache-sprache.json`; README dokumentiert die Datenstruktur. Verifiziert per Node-Harness: btw2029 22, LSA 13, Berlin 13, MV 22 Koalitionen mit AfD-SPD/GRÜNE/LINKE ausgeblendet.
### Tracking offene GitHub-Issues

- [x] **Issue #51 `newsItemMatchesParty()`-False-Positives** – umgesetzt: eigene Wortgrenzen (statt `\b`), Komposita wie „SPDler“ werden erkannt, mehrdeutige Begriffe (grüne/linke/Volt) nur mit Parteikontext. Keine Regression.
- [x] **Issue #62 „Improve OpenCode prompts in gh Actions (Review Action)"** – erledigt: verbesserter Review-Prompt liegt in `opencode-review-prompt.md` (separate Md-Datei außerhalb von `.github/workflows/`), Reviewer-Agent `.opencode/agent/reviewer.md` überarbeitet. Workflow-Datei bewusst unverändert, da die GitHub-App keine `workflows`-Berechtigung hat; Anbindung siehe Abschnitt „Einbindung" in der Prompt-Datei.
- [ ] **Issue #55 „Zeilenreferenzen verschoben (kosmetisch)"** – geschlossen (aktuelle Referenzen aktualisiert; historische Reports bleiben Momentaufnahmen). Falls gewünscht als won't-fix dokumentieren.

## Review vom 2026-08-06 (Lauf B, gesamtes Projekt + GitHub-Cleanup)

Vollständiger Bericht: `reports/review-2026-08-06-b.md`. Sitzsummen (630/130/83/79), Koalitionswerte, Ranking-Verhalten und i18n-Abdeckung erneut per Node-Harness gegen die echten Datendateien verifiziert. **Keine neuen P1-Bugs.**

Status-Korrekturen: PR #37 (RSS-Parteifilter) ist inzwischen gemergt, Issue #36 geschlossen; PWA (PR #41) auf `origin/main` gemergt, Issue #40 geschlossen. Die veralteten Einträge dazu wurden abgehakt und nach `archived-todo.md` verschoben.

### P3 – Verbesserungen

- [x] **`newsItemMatchesParty()`-False-Positives** (script.js:782-792, nun gemergt) – umgesetzt über Issue #51; aktuelle Funktion in script.js (`PARTY_NEWS_AMBIGUOUS` usw.). → in `archived-todo.md` verschoben.

## Review vom 2026-08-06 (gesamtes Projekt, Node-Verifikation + GitHub-Cleanup)

Vollständiger Bericht: `reports/review-2026-08-06.md`. Alle Algorithmus-Befunde per Node-Harness gegen die echten Datendateien verifiziert (Sitzverteilung, Koalitionen, Übereinstimmung, Ranking). Keine neuen P1-Bugs. Alle Befunde aus diesem Lauf sind [x] und in `archived-todo.md` dokumentiert.

## Review vom 2026-08-05 (gesamtes Projekt, Node-Verifikation)

Vollständiger Bericht: `reports/review-2026-08-05.md`. Alle Befunde per Node gegen die echten Datendateien verifiziert. Hinweis: Der offene PR #32 (`opencode/dispatch-c0b481-20260805222205`) aus einem vorherigen Lauf enthält bereits die Sitzverteilungs-Analyse; hier erneut bestätigt und aufgenommen. → in `archived-todo.md`.

## Review vom 2026-08-04 (gesamtes Projekt, Node-Simulation + DOM-Harness)

Vollständiger Bericht: `reports/review-2026-08-04.md`. Koalitions-/Sitzwerte und i18n-Abdeckung per Node gegen die echten Datendateien re-verifiziert. → in `archived-todo.md`.

## Review vom 2026-08-03 (Partei-Seite: Inhalte, Historie-Daten, Nachrichten)

Vollständiger Bericht: `reports/review-2026-08-03-party-site.md`. Verifiziert per Node gegen die echten Datendateien. → in `archived-todo.md`.

## Review vom 2026-08-03 (6. Lauf, gesamtes Projekt)

Vollständiger Bericht: `reports/review-2026-08-03-b.md`. → in `archived-todo.md`.

## Review vom 2026-08-02 (5. Lauf, PR #18 im Merge-Review)

Vollständiger Bericht: `reports/review-2026-08-02-f.md`. → in `archived-todo.md`.

## Review vom 2026-08-02 (4. Lauf, Issue #17: Tab-Wechsel beim vertikalen Scrollen)

Vollständiger Bericht: `reports/review-2026-08-02-d.md`. → in `archived-todo.md`.

## Automatisiertes Review vom 2026-08-02 (2. Lauf, HEAD `918d05f`)

→ in `archived-todo.md`.

## Automatisiertes Review vom 2026-08-02 (2. Lauf, Nachtrag)

Vollständiger Bericht: `reports/review-2026-08-02-b.md`. → in `archived-todo.md`.