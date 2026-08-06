# Koalitions-O-Mat – Offene Aufgaben

Erledigte Aufgaben wurden nach `archived-todo.md` verschoben (Stand 2026-08-05).

## Review vom 2026-08-05 (gesamtes Projekt, Node-Verifikation)

Vollständiger Bericht: `reports/review-2026-08-05.md`. Alle Befunde per Node gegen die echten Datendateien verifiziert. Hinweis: Der offene PR #32 (`opencode/dispatch-c0b481-20260805222205`) aus einem vorherigen Lauf enthält bereits die Sitzverteilungs-Analyse; hier erneut bestätigt und aufgenommen.

### P1 – Bugs

- [ ] **Sitzverteilung: konfiguriertes Verfahren wird nie angewendet** – `berechneSitze()` (script.js:1824-1846) prüft exakt `'sainteLague'` (script.js:1832/1838), die `werte.json`-Werte sind aber `'sainte-lague'` (btw2029), `'saintelague'` (berlin-2026) und `'hare-niemeyer'` (LSA, MV) → kein Match, alle Wahlen fallen still auf d'Hondt. Verifiziert: LSA (83) App d'Hondt `AfD:39 … GRÜNE:4` vs. deklariert Hare-Niemeyer `AfD:38 … GRÜNE:5`; btw/Berlin aktuell nur zufällig identisch (latent). Verfahrensnamen normalisieren oder Strings in den 4 `werte.json` vereinheitlichen.

### P2 – Fehlende Features

- [ ] **Hare-Niemeyer/Largest-Remainder nicht implementiert** – `ltw-sachsen-anhalt-2026/werte.json` und `mv-2026/werte.json` deklarieren `meta.verfahren: "hare-niemeyer"`, `berechneSitze()` hat aber keinen Largest-Remainder-Zweig (nur d'Hondt/Sainte-Laguë).

### P3 – Verbesserungen

- [ ] **`meta.verfahren`-Werte inkonsistent** – `'sainte-lague'` vs. `'saintelague'` vs. `'hare-niemeyer'` (Trennzeichen/Kleinschreibung); einheitliche Nomenklatur dokumentieren oder im Code normalisieren.
- [ ] **Parteifarben: SPD und BSW teilen sich `#E3000F`** – config.json:9 (BSW) == config.json:4 (SPD) → farblich nicht unterscheidbar in Charts/Partei-Seiten; eigene BSW-Farbe vergeben.
- [ ] **`party.newsRetry` fehlt in `einfache-sprache.json`** – `loadPartyNews()` (script.js:723) nutzt `t('party.newsRetry', …)`; Key nicht in `ui` → „Erneut versuchen"-Button nicht einfach-sprache-übersetzt.

### Tracking offene GitHub-Issues

- [ ] **Issue #27 „More Mobile friendly"** – Tastatur-Hinweis inzwischen Desktop-only (`keyboard-hint`), touch mobile friendly weiter verbessert (PR #28 gemerged); Issue bleibt offen. Rest-Touch-/Tap-Flächen prüfen (z. B. `.party-detail-link`-Tap-Ziel, todo oben).
- [ ] **Issue #7 „GitHub repo is very messy"** – saubere automatische Branches-Alten/unused Branches regelmäßig aufräumen (siehe Schritt-6-Cleanup).

## Implementierung vom 2026-08-05 (P2 + P3 aus Review 2026-08-04 & Folgebefunde)

Verifiziert per `node --check`, JSON-Validierung und DOM-Harness gegen die echten Datendateien.



### Weiter offen (Daten/Design, nicht im Code lösbar ohne Diskussion)

- [ ] MV GRÜNE exakt 5 %-Grenzwert; Ranking-Normalisierung bei wenigen Antworten; `berechneUebereinstimmung()` ohne Umfragewert-Gewichtung; hartkodierte `aria-label`s (index.html:22-24); `partyFilter` leere Liste ohne Erklärung.

## Review vom 2026-08-04 (gesamtes Projekt, Node-Simulation + DOM-Harness)

Vollständiger Bericht: `reports/review-2026-08-04.md`. Koalitions-/Sitzwerte und i18n-Abdeckung per Node gegen die echten Datendateien re-verifiziert (siehe „Verifiziert").



### P1 – Bugs


- [ ] **„Fortsetzen" zeigt nach Reload Frage 1 statt der gespeicherten Position** – `initializeTest()` (script.js:1045) setzt die `active`-Klasse immer auf Frage 0 (`i === 0`), obwohl `currentQuestion` wiederhergestellt wird (script.js:1003–1005). Per DOM-Harness verifiziert: gespeichertes `currentQuestion=12` → sichtbar `data-q=0`, Nav-Status 12 → „Weiter" springt auf Frage 14 statt 13. Die frühere `[x]`-Markierung betraf nur die Variable, nicht die Anzeige. Fix analog `backToTest()` (script.js:1436–1438).

## Review vom 2026-08-03 (Partei-Seite: Inhalte, Historie-Daten, Nachrichten)

Fokus der Nutzer-Meldung: „Auf der Partei-Seite sind Inhalte nur über den geteilten Link sichtbar; die historischen Daten funktionieren nicht; Aktuelle Nachrichten laden nicht (und sollten neutral und unabhängig von jeder Partei sein)." Verifiziert per Node gegen die echten Datendateien (`elections/*/werte.json`) und die Partei-Seiten-Funktionen in `script.js` (DOM-Shim-Harness). Vollständiger Bericht: `reports/review-2026-08-03-party-site.md`.



### P1 – Neutralität

Keine offenen Punkte mehr – Partei-eigene Feeds wurden durch neutrale Quellen ersetzt (siehe Archiv).

### P1 – Bugs


- [ ] **Kein Code-Unterschied zwischen direktem Öffnen und Teilen-Link reproduzierbar** – `openPartyPage()` (script.js:506) ist in beiden Pfaden identisch (Harness: Programm rendert in allen 4 Wahlen). Die Wahrnehmung „Inhalte nur über Teilen-Link" stammt vermutlich aus den Tap-/Daten-Lücken unten.

### P2 – Fehlende Features

Keine offenen Punkte mehr – `verlauf`/`rss` sind in allen 4 Wahlen für alle Parteien vorhanden (siehe Archiv).

### P3 – Verbesserungen


- [ ] **„Details, Programm & News"-Button ist kleines Tap-Ziel** – `.party-detail-link` (styles.css:749) ohne `min-height`/44-px-Tap-Fläche; plausible Ursache für „Inhalte nur über Teilen-Link erreichbar" (Issue #21 fixte nur Antwort-Buttons).
- [ ] **Leere Historien-Sektion wirkt wie ein Bug** – bei fehlendem `verlauf` zusätzlich zum Empty-Text einen deaktivierten Platzhalter statt komplett leerer Sektion anbieten.

## Review vom 2026-08-03 (6. Lauf, gesamtes Projekt)

Vollständiger Bericht: `reports/review-2026-08-03-b.md`. Keine neuen harten P1-Bugs; Koalitionswerte, Sitzsummen und i18n-Abdeckung per Node gegen die echten Datendateien re-verifiziert (siehe „Verifiziert"). Neue P2/P3-Befunde:



### P2 – Fehlende Features / UX


- [ ] **Wahlwechsel springt immer auf den Test-Tab** – `setActiveElection()` endet mit `switchTab('test')` (script.js:283); Wechsel über den `election-bar`-Toggle aus einem anderen Tab (z. B. Daten-/Charts) landet überraschend bei Frage 1. Vorschlag: zuvor aktiver Tab beibehalten.
- [ ] **Kein Feedback bei Ladefehler einer Nicht-Default-Wahl** – bei `fetch`-Fehler (script.js:352-356) bleibt die Wahl in `electionsList`, aber `electionDataCache[id]` leer; Klick auf die Karte bricht still bei `if (!data) return;` ab. Vorschlag: deaktivierte Karte mit Laden-Fehler-Hinweis.

### P3 – Verbesserungen


- [ ] **MV: GRÜNE exakt 5 %** – `>= 5`-Prüfung schließt GRÜNE (5 %) in `berechneKoalitionen()`/`berechneSitze()`. Grenzwert-Entscheidung als Datenhinweis dokumentieren.

### Weiterhin offen (aus früheren Läufen, Zeilennummern aktualisiert)


- [ ] **`partyFilter` mit Partei < Sperrklausel ergibt leere Liste ohne Erklärung** – `populatePartyDropdowns()` (script.js:400-409) listet < 5 %-Parteien, `updateKoalitionen()` (script.js:896-898) filtert nur auf Koalitionen.
- [ ] **Koalitions-Share-Link ohne Antworten zeigt im Test-Tab lauter „–"** – `applyPendingShare()` (script.js:164) ruft `showTestResults()` auch bei leerem `answers`.
- [ ] **`berechneUebereinstimmung` ohne Umfragewert-Gewichtung** (script.js:812-835).
- [ ] **10 „Sonstiges"-Fragen, Kategorie „Kultur" fehlt** (btw2029 1, LSA 6, Berlin 3); Keyword „Rundfunk" unter „Inneres" würde btw2029 #34 bei fehlendem `thema` falsch zuordnen.
- [ ] **Harte `aria-label`s in index.html:22-24** (Einfache Sprache/Theme/GitHub).
- [ ] **Datenqualität: „CDU/CSU" vs. „CDU"; „SSW" (0,5 %) in Berlin unplausibel.**

## Review vom 2026-08-02 (5. Lauf, PR #18: Issue #17-Fixes im Merge-Review)

Merge-Review des PR „Issue #17 behoben: Swipe fix + Review umgesetzt" (`reports/review-2026-08-02-f.md`). Ergebnis: **PR mergefähig**, alle drei P1-Fixes zu Issue #17 sowie die P2/P3-Mitfixes per Node-Simulation und gegen die echten Datendateien verifiziert, keine Regressionen. Die folgenden Punkte sind Nachbesserungsvorschläge.



### P3 – Verbesserungen (neu)


- [ ] **`partyFilter` im Koalitionen-Tab listet Parteien < Sperrklausel, Filter-Ergebnis ist dann leer** – `populatePartyDropdowns()` (script.js:400-402) nutzt `relevant`, `updateKoalitionen()` (script.js:593-595) filtert nur Koalitionen → „FDP" (btw2029) ergibt „Keine passenden Koalitionen gefunden" ohne Erklärung. Begründung aus Report-e („Filter auf Ergebnisliste") trifft nicht zu.
- [ ] **Koalitions-Share-Link ohne Antworten hinterlässt Ergebnissicht mit lauter „–" im Test-Tab** – `applyPendingShare()` (script.js:146-183) ruft `showTestResults()` auch bei leerem `answers` auf; Vorschlag: bei leerem `answers` + nur `coalitionState` überspringen.
- [ ] **Zeilenreferenzen in todo.md/Report-e verschoben** – `script.js:1620-1657` vs. tatsächlich 1628-1664, `403-413` vs. 405-419, `1425` vs. 1424, `82-113` vs. 82-116 (kosmetisch).

## Review vom 2026-08-02 (4. Lauf, Issue #17: Tab-Wechsel beim vertikalen Scrollen)

Fokus: Issue #17 – Swipe-Geste wechselt beim vertikalen Scrollen weiterhin Tabs. Vollständiger Bericht: `reports/review-2026-08-02-d.md`. Ursache per Node-Simulation bestätigt: Der Handler prüft nur Start-/Endkoordinaten, diagonale Flicks (z. B. 80 px horizontal / 95 px vertikal) passieren die 1.2×-Regel.



### P3 – Verbesserungen


- [ ] **Ranking bei wenigen beantworteten Fragen irreführend** – Berlin: Volt/Tierschutz (3/52, alle „j") erreichen 100 % und verdrängen große Parteien (script.js:918-942); `fewAnswersHint` normalisiert nicht. Mindestzahl vergleichbarer Fragen für die Sortierung.
- [ ] **Hartkodierte `aria-label`s in index.html** – Z. 22-24 (Einfache Sprache/Theme/GitHub) nicht i18n-fähig.

### Verifiziert weiter offen (aus früheren Läufen)


- [ ] `berechneUebereinstimmung()` ohne Umfragewert-Gewichtung (script.js:501-524)
- [ ] 10 „Sonstiges"-Fragen (btw2029 1, LSA 6, Berlin 3) – Kategorie „Kultur" fehlt
- [ ] Datenqualität „CDU/CSU" vs. „CDU"; „SSW" (0,5 %) in Berlin-Umfrage unplausibel

## Automatisiertes Review vom 2026-08-02 (2. Lauf, HEAD `918d05f`)



### P3 – Verbesserungen


Hinweis (erledigt seit 1. Lauf): `noData`-Key ist inzwischen vorhanden (`einfache-sprache.json` Zeile 98) – der P3-Eintrag „`noData`-Key fehlt" weiter unten ist abgehakt.

- [ ] **Datenqualität: „CDU/CSU" statt „CDU" in Berlin/MV/LSA** – `werte.json`/`fragen.json`; `partyColors` (config.json:3) kennt kein „CDU"; „SSW" (0,5 %) in der Berlin-Umfrage unplausibel (nur Schleswig-Holstein).

## Automatisiertes Review vom 2026-08-02 (2. Lauf, Nachtrag)

Vollständiger Bericht: `reports/review-2026-08-02-b.md`. Alle Befunde per Node gegen die echten Datendateien verifiziert.



### P3 – Verbesserungen


- [ ] **`berechneUebereinstimmung()` ohne Umfragewert-Gewichtung** – kleine Parteien zählen wie große; Gewichtung nur in `berechneUserMatchFuerKoalition()` (script.js:482).
- [ ] **10 Fragen in „Sonstiges" (Kultur/Ehrenamt/Kirchen/Rundfunk/Schwimmbäder/Gartenschau/Tanzverbot)** – ltw 6, Berlin 3, btw2029 1; Kategorie „Kultur" oder Zuordnung „Soziales".
