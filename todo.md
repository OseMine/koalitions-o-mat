# Koalitions-O-Mat – Offene Aufgaben

Erledigte Aufgaben wurden nach `archived-todo.md` verschoben (Stand 2026-08-10).

## Feature-Evaluation vom 2026-08-10 (Issue #102 „Features might to add")

Bewertet wurden die 14 Vorschläge aus Issue #102 (Koalitionsanalyse, Scoring-Customizations, Visualisierung, Teilen/Export, Barrierefreiheit) gegen den Ist-Stand. Bereits vorhandene Features (Sitz-Schwelle/5-%-Hürde, Stance-Begründungen & Quellen, Ergebnis-Teilen-URL, Tastatursteuerung, Einfache Sprache, Dark/Light) werden nicht erneut aufgenommen – nur die nützlichen neuen Features wurden als offene Aufgaben ergänzt.

### Neue Features (utile, offen)

- [ ] **Koalitions-Reibungs-Index (Friction Score)** – je Koalition zusätzlich zur Übereinstimmung einen Kompromiss-Schwierigkeits-Score (P2): welche Thesen trennen die Partner am stärksten (größte Positionsdifferenz im Paar); pro Koalition die Top-Konfliktthesen anzeigen. Hoher Nutzen, da genau das Alleinstellungsmerkmal von Koalitions-Bildung.
- [ ] **Regierungs-Simulator (Custom Coalition Builder)** – eigene Koalition manuell zusammenstellen (Checkboxen/Partei-Picker statt Drag&Drop, da ohne Framework), Mehrheit anhand der Sitze prüfen, eigene Übereinstimmung mit der Kombination sowie welcher Partner bei welcher These am meisten abweichen müsste (P2).
- [ ] **Dealbreaker / Rote Linien** – Erweiterung der bestehenden „Wichtige Frage (zählt doppelt)": Thesen als unverhandelbar markieren → Parteien/Koalitionen, die dort gegen den Nutzer stehen, werden stark abgewertet oder ausgeschlossen (P2).
- [ ] **Thesis-Matrix-Heatmap** – Partei × These-Tabelle in Grün/Rot/Grau (zustimmen/dagegen/neutral) für schnelle Block-Erkennung; Daten (`wert` je Partei je Frage) sind vorhanden, nur Rendering neu (P3).
- [ ] **Ergebnis-Karte als PNG/SVG exportieren** – aus den vorhandenen Share-Daten eine Social-Media-taugliche Karte (Top-Koalition, Top-Partei, Schwerpunkt-Themen) als Bild erzeugen (P3).
- [ ] **2D-Politik-Kompass** – Nutzer, Parteien und Koalitionen auf einem 2D-Gitter (Wirtschaft links/rechts × progressiv/konservativ); benötigt neue Achsen-Daten pro Partei (P3).

### Bewusst nicht aufgenommen (bereits vorhanden)

- Sitz-Schwelle/5-%-Hürde & 50-%-Mehrheit ↔ vorhanden (`sperrklausel`-Filter und Sitzrechnung in `berechneKoalitionen()`, Koalitionsart Mehrheit/Minderheit)
- Stance-Erklärungen & Quellen ↔ vorhanden (`zitat`/`quelle`/`begruendung` je Partei je Frage, „Parteien vergleichen"-Ansicht)
- Teilbare URL / URL-State ↔ vorhanden (`shareResults()`, `#w/#a/#i/#p`)
- Tastatur-Navigation ↔ vorhanden (1/2/3, Pfeiltasten, Home/End)
- Leichte-Sprache-Toggle ↔ vorhanden (`einfache-sprache.json` deckt UI + Fragen ab)
- Dark/Light-Mode-Toggle & Kontrast ↔ vorhanden (inkl. Systemerkennung)

## Feature-Evaluation vom 2026-08-10 (Issue „How to hash": URL-Hash-Kodierung von Antworten)

Bewertet wurde der Vorschlag, Quiz-Antworten als kompakten Positions-String (z. B. `210x2*1`) per URL-sicherem Base64 in einen `#q=`-Hash zu kodieren, inkl. `weighted`-Flag und `history.replaceState`-Live-Sync (Vergleich mit `shareResults()`/`parseShareHash()`, script.js:108-170).

**Fazit: weitgehend redundant – nicht als eigenständiges Feature aufgenommen.** Das Projekt teilt Ergebnisse bereits sehr kompakt (`#w=<wahl>&a=<index+antwort>&i=<wichtig>&c=<koalition>&p=<partei>`): die bestehende Kodierung `0j1n3j` (Index+Antwort ohne Trennzeichen) ist kürzer als der Vorschlag, da Base64 URLs um ~33 % aufbläht und der Vorschlag zusätzlich `-`-Trenner plus `w`-Suffix pro Antwort braucht. Das `weighted`-Flag entspricht der vorhandenen „Wichtige Frage (zählt doppelt)" (`importantQuestions`, `#i=`, `frageGewicht()` script.js:92-94); „übersprungen" wird bereits durch Weglassen unbeantworteter Fragen abgebildet. Zudem passt die 2/1/0-Skala (Zustimmen/Neutral/Dagegen) nicht zum bestehenden Datenmodell (`j`/`n`/`m`).

### P3 – Verbesserung (der einzige neue Mehrwert)

- [ ] **Share-State live in die URL schreiben** – statt den Hash nur beim expliziten „Teilen"-Klick zu setzen, den Zustand (Wahl, Antworten, wichtige Fragen) laufend per `history.replaceState` synchron halten, sodass Fortsetzen/Teilen auch über Bookmark/URL kopieren funktioniert, ohne dass die Seiten-Historie zersplittert. Kleiner, risikoarmer Mehrwert über dem heutigen localStorage-`saveTestState()` + explizitem `shareResults()`; Kodierung bleibt das bestehende kompakte Format (kein Base64).

## Review vom 2026-08-10 (Fokus: Neue Features)

Vollständiger Bericht: `reports/review-2026-08-10-b.md`. Zweiter Lauf am 2026-08-10 (nach dem Leerlauf-`review-2026-08-10.md` aus dem Schedule-Lauf 07:34); Fokus laut Auftrag: **Neue Features** (Partei-Seiten, Nachrichten-Feed, Taktik-Simulator Szenarien B/C/D, Teilen-Links) plus Algorithmen (Übereinstimmungsrechnung, Koalitionsberechnung, Themenzuordnung, Sitzverteilung). Verifiziert per Node-Harness gegen die echten Datendateien: Sitzsummen alle 4 Wahlen = `meta.sitze` (630/130/83/79), keine ausgeschlossene Koalition in `berechneKoalitionen()`, Taktik-Warnungen plausibel (46/168 Top-2-Paare über alle 4 Wahlen), Share-Hashs korrekt geparst (inkl. leerem `&a=`). `node --check script.js` + `tools/tactical-harness.js` + `harness/*` fehlerfrei. **Keine neuen P1-Bugs.** GitHub-Cleanup offen: verwaister Branch `opencode/issue99-20260810091339` (PR #100 ohne Merge geschlossen, Issue #99 geschlossen).

### P3 – Verbesserungen

- [x] **`determineTopic()`-Keyword-Fallback klassifiziert anders als das explizite `thema`** – alle Fragen aller 4 Wahlen haben ein valides `thema` (Fallback wird aktuell nie erreicht); der Keyword-Fallback (script.js:2592-2602) würde aber für viele Fragen ein anderes Topic liefern als das redaktionelle `thema` (btw2029 14, LSA 19, Berlin 21, MV 15 Mismatches; z. B. btw2029 #11 Soziales→Wirtschaft, #19 Umwelt→Außenpolitik, #20 Außenpolitik→Wirtschaft, Berlin #21/#28/#46 Umwelt→Digitales). Kein Live-Effekt bei den aktuellen Daten, aber latente Fehlerquelle für künftige Wahlen ohne Pflicht-`thema`. **Entscheidung: Fallback entfernt** – `determineTopic()` klassifiziert ausschließlich über das redaktionelle `thema` (Pflichtfeld); Fragen ohne/ungültiges `thema` landen ehrlich in „Sonstiges" und lösen einen einmaligen `console.error`-Fehlerhinweis aus (keine stille Keyword-Fehlklassifikation mehr). Verifiziert per Node-Harness `harness/determine-topic-check.js` (170 Fragen aller 4 Wahlen = redaktionelles `thema`). → in `archived-todo.md`.

## Review vom 2026-08-09 (Fokus: Tactical Voting – Funktion und Algorithmus)

Vollständiger Bericht: `reports/review-2026-08-09.md`. Alle Befunde per Node-Harness gegen die echten Datendateien verifiziert (`node --check script.js` OK, alle 4 Wahlen). Erste eingehende Bewertung des Taktik-Moduls (PR #68 / Issue #67); zuvor gab es keine Taktik-Befunde in Reports/Archiv. Keine neuen P1-Code-Bugs; 1× P1 Einfache Sprache, 3× P2, 4× P3.

### P1 – Einfache Sprache

- [x] **Taktik-Sektion komplett ohne `t()`** – `tacticalSectionHTML()` (script.js:1911-1928), `tacticalSlidersHTML()` (1891-1909), `calculateTacticalVoting()` (1930-1973), `updateTacticalWarnings()` (1975-1996) nutzen nur hartkodiertes Deutsch; im Einfache-Sprache-Modus (`isSimpleLang()`) bleibt Normal-Deutsch – bricht das README-Versprechen „Umschalter für alle UI-Texte". Verifiziert: 0 Taktik-Keys in `einfache-sprache.json`. **Erledigt (Issue #81, 2026-08-09)**: alle 4 Funktionen nutzen jetzt `t()`; 18 neue Keys `tactical.*` in `einfache-sprache.json.ui` (176 Keys, eindeutig, valides JSON). Verifiziert per Node-Harness (Normal- und Einfache-Sprache-Modus) + `node --check script.js`. → in `archived-todo.md`.

### P2 – Algorithmus

- [x] **Taktik-Simulator ignoriert `koalitionsausschluss`** – `calculateTacticalVoting()` (script.js:1952-1971) bildet die „Wunschkoalition" aus den Top-2 des Nutzers ohne `istKoalitionAusgeschlossen()`-Check (script.js:1117). Verifiziert: LSA Paar **AfD+GRÜNE** (41 % + 5 %) löst die Leihstimmen-Warnung aus – genau diese Koalition wird von `berechneKoalitionen()` (script.js:1157) und der Ausschluss-Config ausgeblendet. Empfehlung: textlich als Tipp umformulieren und nur Parteien aus zulässigen Koalitionen zulassen. **Umsetzung**: `calculateTacticalVoting()` prüft das Top-2-Paar jetzt mit `istKoalitionAusgeschlossen()` – ausgeschlossene Wunschkoalitionen erzeugen eine textliche `excluded`-Warnung (Typ „Hinweis") statt Leihstimmen- oder konkreter Koalitionsempfehlung (`info.coalition` bleibt `null`). Zusätzlich bewertet die Leihstimmen-Warnung die Mehrheitsfähigkeit ausschluss-bewusst (`istKoalitionsMehrheitSicher()`), sodass ausgeschlossene Paare (z. B. LSA AfD+GRÜNE) nie eine Loan-Warnung auslösen. Verifiziert per Node-Harness über alle 4 Wahlen × alle 168 Top-2-Paare (24 ausgeschlossen): 0 Leihstimmen-Warnungen auf ausgeschlossenen Paaren, alle mit textlichem Tipp, Loan-Pfad für zulässige Paare unverändert. → in `archived-todo.md`.
- [x] **Leihstimmen-Warnung (Doku Szenario B) faktisch unerreichbar** – Bedingung `share > 50` (script.js:1959,1964) + hartkodiertes Band 4–6 % (script.js:1963): Node-Harness über alle 4 Wahlen × alle Top-2-Paare → **nur 2 von 168 Treffer (AfD|GRÜNE in LSA)**, nie in btw2029/Berlin/MV. Kriterium auf Sperrklausen-Nähe des kleineren Partners umstellen. **Umgesetzt**: Kriterium ist jetzt der kleinere Partner im aus `tacticalThreshold()` abgeleiteten Band `[threshold-1, threshold+1)` bei mehrheitsfähiger (nicht ausgeschlossener) Wunschkoalition (`istKoalitionsMehrheitSicher()`); Harness `tools/tactical-harness.js`: 46/168 Paare, in allen 4 Wahlen (btw 22, Berlin 8, LSA 8, MV 8).
- [x] **Erststimme-/Grundmandatsklausel-Szenarien fehlen** – `tactical-voting.md` Szenarien C/D (Grundmandatsklausel, strategische Erststimme/Blockadewahl, S. 79-85) werden im Simulator nicht abgebildet; es fließen nur Partei-Zweitstimmen-Prozente ein, keine Wahlkreise/Direktmandate. **Umgesetzt (Issue #84, 2026-08-09)**: optionale `direktmandate`-Struktur in `elections/*/config.json` (`{ grundmandate: 3, parteien: { "LINKE": { sicher, chancen } } }`, geladen in `setActiveElection()`; befüllt nur für `btw2029` als hypothetische Schätzung, LSA/Berlin/MV bewusst ohne Daten). **Szenario C**: neue Regler „Direktmandate" simulieren Erststimmen-Bündelung (`tacticalDirectMandates`); Parteien unter der Sperrklausel mit `>= grundmandate` Direktmandaten ziehen ein – die Wasted-Vote-Warnung wird durch eine `grundmandat`-Warnung ersetzt und die Partei zählt zur Koalitionsbasis (sonst falsche Mehrheitsrechnung). C-Sektion listet unter-Hürden-Parteien mit `einzug`/`nah`/`weit`-Status. **Szenario D**: ohne Wahlkreis-Daten nur erklärt, nicht berechnet. Ohne `direktmandate`-Daten erscheint der explizite Hinweis „Szenarien C/D werden hier NICHT abgebildet – nur Zweitstimmen-Umfragewerte". Verifiziert per Node-Harness (23 Checks). → in `archived-todo.md`.

### P3 – Verbesserungen

- [x] **Mock-Polls injizieren „Geisterpartei" CDU in alle 4 Wahlen** – `TACTICAL_MOCK_POLLS` (script.js:18-20) in `calculateTacticalPolls()` (script.js:1883-1885): jedes `werte.json` erhält ein Phantom `CDU` (30 %). Aktuell unsichtbar (kein Slider, nicht in `results`), aber latent fehlerhaft für künftige Wahlen ohne FDP/LINKE. Mock nur als Fallback für reale Parteien der Wahl. **Umgesetzt**: Mock-Werte werden nur noch als Fallback für reale Parteien der aktiven Wahl eingefügt (`realParties` aus Umfragewerten + Fragebogen-Antworten, `calculateTacticalPolls()`).
- [x] **Taktik-Warnungen ohne eine einzige Ja/Nein-Antwort irreführend** – `showTestResults()` hängt den Taktik-Abschnitt immer an (script.js:1860); ohne verwertbare Antworten ist „Deine Top-Partei" nur die erste Partei der `werte.json`-Reihenfolge (btw2029: AfD). **Erledigt am 2026-08-09**: Taktik-Abschnitt wird nur noch bei `usableAnswered > 0` angehängt (script.js:1859-1865) – bei 0 verwertbaren Antworten erscheint kein irreführendes „Deine Top-Partei/Wunschkoalition"-Ranking; mit Antworten unverändert. → in `archived-todo.md`.
- [x] **`schwankt`-Band hartkodiert 4–6** (script.js:1963) – sollte relativ zur Wahl-Sperrklausel (`threshold`, `tacticalThreshold()`, script.js:1873) sein. **Umgesetzt**: Band `[threshold-1, threshold+1)` abgeleitet aus `tacticalThreshold()` (5 % ↔ 4–6 %, 3 % ↔ 2–4 %).
- [x] **Expected-Utility-Modell (tactical-voting.md §5) nur als Rangfolge abgebildet** – `calculateTacticalVoting()` sortiert nur nach `match` (script.js:1934), ignoriert Abstände; nahe Gleichstände (60,1 % vs. 60,0 %) erzeugen identische Warnungen wie klare Präferenzen. → in `archived-todo.md`.

## Review vom 2026-08-08 (gesamtes Projekt, Node-Verifikation + GitHub-Cleanup)

Vollständiger Bericht: `reports/review-2026-08-08.md`. Sitzsummen (630/130/83/79), Ranking-Verhalten, i18n-Abdeckung und MV-Einfach-Sprache erneut per Node-Harness gegen die echten Datendateien verifiziert. **Keine neuen P1-Bugs.**

### P3 – Verbesserungen

Alle in diesem Abschnitt abgehakten Punkte (BSW-Positionen Berlin, UX/UI, `koalitionsausschluss`, #51, #62, #55) sind erledigt und nach `archived-todo.md` verschoben (Stand 2026-08-09).
- [x] **Issue #55 „Zeilenreferenzen verschoben (kosmetisch)"** – geschlossen (aktuelle Referenzen aktualisiert; historische Reports bleiben Momentaufnahmen). → in `archived-todo.md`.

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