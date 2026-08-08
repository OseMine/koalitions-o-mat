# Koalitions-O-Mat – Offene Aufgaben

Erledigte Aufgaben wurden nach `archived-todo.md` verschoben (Stand 2026-08-06).

## Review vom 2026-08-06 (Lauf B, gesamtes Projekt + GitHub-Cleanup)

Vollständiger Bericht: `reports/review-2026-08-06-b.md`. Sitzsummen (630/130/83/79), Koalitionswerte, Ranking-Verhalten und i18n-Abdeckung erneut per Node-Harness gegen die echten Datendateien verifiziert. **Keine neuen P1-Bugs.**

Status-Korrekturen: PR #37 (RSS-Parteifilter) ist inzwischen gemergt, Issue #36 geschlossen; PWA (PR #41) auf `origin/main` gemergt, Issue #40 geschlossen. Die veralteten Einträge dazu wurden abgehakt und nach `archived-todo.md` verschoben.

### P2 – Fehlende Features

- [ ] **MV-2026: keine Einfache-Sprache-Parteibeschreibungen** – weiterhin offen (re-verifiziert). `einfache-sprache.json.parteien` nur LSA/Berlin; MV ohne `beschreibung_einfach` → `simplePartyText()` (script.js:17-26) fällt auf komplexe `beschreibung` zurück.

### P3 – Verbesserungen

- [ ] **`newsItemMatchesParty()`-False-Positives** (script.js:782-792, nun gemergt) – `\b`-Boundary trifft „SPDler" nicht; „linke"/„grüne" treffen als Adjektive, „Volt" als Einheit.
- [ ] **Ranking bei wenigen Antworten weiterhin irreführend** – re-verifiziert btw2029 (1 Antwort „j" → SPD/GRÜNE/LINKE/BSW 100 %); `fewAnswersHint` (script.js:1584) zeigt Partei- statt Nutzer-Abdeckung.
- [ ] **Sainte-Laguë erster Divisor 1 statt 1,4** (script.js:2023) – bei aktuellen btw2029-Daten identische Sitze, bei knappen Verteilungen abweichbar (per Harness belegt).
- [ ] **Kosmetik: `}function berechneUserMatchNachThema` auf einer Zeile** (script.js:1362).
- [ ] **10 „Sonstiges"-Fragen** (btw2029 1, Berlin 3, LSA 6: Rundfunk/Clubs/Kultur/Tanzverbot/Kirchen/Ehrenamt/Schwimmbäder/Gartenschau) – Kategorie „Kultur" fehlt in `config.topics`.

## Review vom 2026-08-06 (gesamtes Projekt, Node-Verifikation + GitHub-Cleanup)

Vollständiger Bericht: `reports/review-2026-08-06.md`. Alle Algorithmus-Befunde per Node-Harness gegen die echten Datendateien verifiziert (Sitzverteilung, Koalitionen, Übereinstimmung, Ranking). Keine neuen P1-Bugs.

### Verifiziert behoben (vorherige Befunde, unten als [x] markiert)

- Sitzverteilungs-Verfahren (P1 2026-08-05), Hare-Niemeyer (P2 2026-08-05), `meta.verfahren`-Normalisierung, SPD/BSW-Farbe, `party.newsRetry`, „Fortsetzen"-P1 (2026-08-04), `partyFilter`-Erklärung, Koalitions-Share ohne Antworten, `aria-label`s, Tab-Wechsel, Ladefehler-Karte, Historien-Platzhalter, `.party-detail-link`-Tap-Ziel (44 px), SSW aus Berlin-Daten – alle per Code/Daten/Node re-verifiziert. i18n vollständig (112 `t()`-Keys, 170 Fragen, alle `data-i18n`/`aria`), Parteimengen `fragen.json` ↔ `werte.json` identisch, alle `thema` gültig.
- **Issue #43 (P3): `berechneUebereinstimmung()` ohne Umfragewert-Gewichtung** – per Code/Node re-verifiziert: `berechneUebereinstimmung()` (script.js:1009-1032) vergleicht paarweise ohne `prozent`-Gewichtung, kleine Parteien zählen wie große; Umfragewert-Gewichtung existiert nur in `berechneUserMatchFuerKoalition()` (script.js:1059-1079). Bereits erfüllt, kein Code-Change nötig.
- **Issue #43 (P3): Kategorie „Kultur" ergänzt** – `config.json`-`topics.Kultur` (Keyword `Rundfunk` aus „Inneres" herausgenommen), 10 Fragen von „Sonstiges" → „Kultur" umkategorisiert (btw2029 #34, LSA #8/#18/#29/#35/#36/#40, Berlin #20/#34/#52), `prompt-gemini-fragen.md`-Topic-Liste aktualisiert. Verifiziert: `determineTopic()` liefert für alle 180 Fragen das explizite `thema`.

### P2 – Fehlende Features

- [ ] **MV-2026: keine Einfache-Sprache-Parteibeschreibungen** – `einfache-sprache.json.parteien` nur für LSA/Berlin, MV-Parteien ohne `beschreibung_einfach` in `werte.json` → `simplePartyText()` (script.js:17-26) fällt auf komplexe `beschreibung` zurück (Partei-Liste script.js:480-485, Partei-Seite script.js:558).

### P3 – Verbesserungen

- [ ] **Sainte-Laguë: Standard- statt modifiziertes Verfahren (erster Divisor 1 statt 1,4)** – `berechneSitze()` (script.js:1911-1915); bei aktuellen btw2029-Daten identische Sitze (verifiziert), bei anderen Umfragewerten abweichbar. Dokumentieren oder 1,4 implementieren.
- [ ] **Ranking bei wenigen Nutzer-Antworten weiterhin irreführend** – verifiziert btw2029 (1 Antwort „j" → SPD/GRÜNE/LINKE/BSW à 100 %); `fewAnswersHint` (script.js:1475-1477) zeigt die Partei-Abdeckung statt der dünnen Nutzer-Antwortbasis. Mindestzahl vergleichbarer Fragen für die Sortierung.
- [ ] **Kosmetik: `}function berechneUserMatchNachThema` auf einer Zeile** (script.js:1253-1254).

### Tracking offene GitHub-Issues

- [ ] **Issue #27 „More Mobile friendly"** – Rest-Touch-/Tap-Flächen prüfen.

### GitHub-Cleanup (2026-08-06)

- Verwaiste Branches gelöscht: `opencode/dispatch-077e39-20260805222758` (PR #33), `opencode/issue34-20260806072619` (PR #35).
- Issue #7 „GitHub repo is very messy" geschlossen.

## Review vom 2026-08-05 (gesamtes Projekt, Node-Verifikation)

Vollständiger Bericht: `reports/review-2026-08-05.md`. Alle Befunde per Node gegen die echten Datendateien verifiziert. Hinweis: Der offene PR #32 (`opencode/dispatch-c0b481-20260805222205`) aus einem vorherigen Lauf enthält bereits die Sitzverteilungs-Analyse; hier erneut bestätigt und aufgenommen.

### P1 – Bugs

### P2 – Fehlende Features

### P3 – Verbesserungen

### Tracking offene GitHub-Issues

- [ ] **Issue #27 „More Mobile friendly"** – Tastatur-Hinweis inzwischen Desktop-only (`keyboard-hint`), touch mobile friendly weiter verbessert (PR #28 gemerged); Issue bleibt offen. Rest-Touch-/Tap-Flächen prüfen (z. B. `.party-detail-link`-Tap-Ziel, todo oben).

## Implementierung vom 2026-08-05 (P2 + P3 aus Review 2026-08-04 & Folgebefunde)

Verifiziert per `node --check`, JSON-Validierung und DOM-Harness gegen die echten Datendateien.

### Weiter offen (Daten/Design, nicht im Code lösbar ohne Diskussion)

- [ ] MV GRÜNE exakt 5 %-Grenzwert; Ranking-Normalisierung bei wenigen Antworten; hartkodierte `aria-label`s (index.html:22-24); `partyFilter` leere Liste ohne Erklärung.

## Review vom 2026-08-04 (gesamtes Projekt, Node-Simulation + DOM-Harness)

Vollständiger Bericht: `reports/review-2026-08-04.md`. Koalitions-/Sitzwerte und i18n-Abdeckung per Node gegen die echten Datendateien re-verifiziert (siehe „Verifiziert").

### P1 – Bugs

## Review vom 2026-08-03 (Partei-Seite: Inhalte, Historie-Daten, Nachrichten)

Fokus der Nutzer-Meldung: „Auf der Partei-Seite sind Inhalte nur über den geteilten Link sichtbar; die historischen Daten funktionieren nicht; Aktuelle Nachrichten laden nicht (und sollten neutral und unabhängig von jeder Partei sein)." Verifiziert per Node gegen die echten Datendateien (`elections/*/werte.json`) und die Partei-Seiten-Funktionen in `script.js` (DOM-Shim-Harness). Vollständiger Bericht: `reports/review-2026-08-03-party-site.md`.

### P1 – Neutralität

Keine offenen Punkte mehr – Partei-eigene Feeds wurden durch neutrale Quellen ersetzt (siehe Archiv).

### P1 – Bugs

- [ ] **Kein Code-Unterschied zwischen direktem Öffnen und Teilen-Link reproduzierbar** – `openPartyPage()` (script.js:506) ist in beiden Pfaden identisch (Harness: Programm rendert in allen 4 Wahlen). Die Wahrnehmung „Inhalte nur über Teilen-Link" stammt vermutlich aus den Tap-/Daten-Lücken unten.

### P2 – Fehlende Features

Keine offenen Punkte mehr – `verlauf`/`rss` sind in allen 4 Wahlen für alle Parteien vorhanden (siehe Archiv).

### P3 – Verbesserungen

## Review vom 2026-08-03 (6. Lauf, gesamtes Projekt)

Vollständiger Bericht: `reports/review-2026-08-03-b.md`. Keine neuen harten P1-Bugs; Koalitionswerte, Sitzsummen und i18n-Abdeckung per Node gegen die echten Datendateien re-verifiziert (siehe „Verifiziert"). Neue P2/P3-Befunde:

### P2 – Fehlende Features / UX

### P3 – Verbesserungen

### Weiterhin offen (aus früheren Läufen, Zeilennummern aktualisiert)
- [x] **Datenqualität: „CDU/CSU" vs. „CDU"; „SSW" (0,5 %) in Berlin unplausibel.** – verifiziert behoben (siehe archiviert, 2026-08-08): alle 4 Wahlen nutzen einheitlich „CDU/CSU", `partyColors` kennt die Bezeichnung, keine SSW-Werte mehr in Berlin.

## Review vom 2026-08-02 (5. Lauf, PR #18: Issue #17-Fixes im Merge-Review)

Merge-Review des PR „Issue #17 behoben: Swipe fix + Review umgesetzt" (`reports/review-2026-08-02-f.md`). Ergebnis: **PR mergefähig**, alle drei P1-Fixes zu Issue #17 sowie die P2/P3-Mitfixes per Node-Simulation und gegen die echten Datendateien verifiziert, keine Regressionen. Die folgenden Punkte sind Nachbesserungsvorschläge.

### P3 – Verbesserungen (neu)
- [ ] **Zeilenreferenzen in todo.md/Report-e verschoben** – `script.js:1620-1657` vs. tatsächlich 1628-1664, `403-413` vs. 405-419, `1425` vs. 1424, `82-113` vs. 82-116 (kosmetisch).

## Review vom 2026-08-02 (4. Lauf, Issue #17: Tab-Wechsel beim vertikalen Scrollen)

Fokus: Issue #17 – Swipe-Geste wechselt beim vertikalen Scrollen weiterhin Tabs. Vollständiger Bericht: `reports/review-2026-08-02-d.md`. Ursache per Node-Simulation bestätigt: Der Handler prüft nur Start-/Endkoordinaten, diagonale Flicks (z. B. 80 px horizontal / 95 px vertikal) passieren die 1.2×-Regel.

### P3 – Verbesserungen

- [ ] **Ranking bei wenigen beantworteten Fragen irreführend** – Berlin: Volt/Tierschutz (3/52, alle „j") erreichen 100 % und verdrängen große Parteien (script.js:918-942); `fewAnswersHint` normalisiert nicht. Mindestzahl vergleichbarer Fragen für die Sortierung.

### Verifiziert weiter offen (aus früheren Läufen)

- [x] Datenqualität „CDU/CSU" vs. „CDU"; „SSW" (0,5 %) in Berlin-Umfrage unplausibel – verifiziert behoben (2026-08-08): einheitlich „CDU/CSU", kein SSW in Berlin.

## Automatisiertes Review vom 2026-08-02 (2. Lauf, HEAD `918d05f`)

### P3 – Verbesserungen

Hinweis (erledigt seit 1. Lauf): `noData`-Key ist inzwischen vorhanden (`einfache-sprache.json` Zeile 98) – der P3-Eintrag „`noData`-Key fehlt" weiter unten ist abgehakt.

- [x] **Datenqualität: „CDU/CSU" statt „CDU" in Berlin/MV/LSA** – verifiziert behoben (2026-08-08): alle 4 Wahlen nutzen einheitlich „CDU/CSU" (bewusste Zusammenfassung der Union), `partyColors` (config.json) kennt „CDU/CSU", kein „SSW"-Wert in Berlin.

## Automatisiertes Review vom 2026-08-02 (2. Lauf, Nachtrag)

Vollständiger Bericht: `reports/review-2026-08-02-b.md`. Alle Befunde per Node gegen die echten Datendateien verifiziert.

### P3 – Verbesserungen

- [x] **`berechneUebereinstimmung()` ohne Umfragewert-Gewichtung** – kleine Parteien zählen wie große; Gewichtung nur in `berechneUserMatchFuerKoalition()` (script.js:482). → bereits erfüllt (siehe oben, Issue #43).
