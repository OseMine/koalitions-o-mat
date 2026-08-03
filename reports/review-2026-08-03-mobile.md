# Koalitions-O-Mat – Mobile-Fixes vom 2026-08-03 (Issue #21)

Implementierung und Verifikation der in Issue #21 gemeldeten mobilen Bugs („Contents are overflowing + some Buttons in the Party Test dont work"). Alle Fixes wurden per Headless-Chromium (CDP, mobile Viewports 320/360/390 px) gegen die echten Datendateien verifiziert. Betroffene Dateien: `script.js`, `styles.css`.

## P1 – Bugs

- [x] **Partei-Seite stürzt ab → Seite ohne Inhalte** – `renderPartyProgramm()` (script.js:654): `entries.map(([topic, t]) => …)` überschattet die i18n-Funktion `t()` mit der lokalen Themen-Variablen → `TypeError: t is not a function` → „Wahlprogramm" bleibt leer, `loadPartyNews()` wird nie erreicht (News hängt auf „Nachrichten werden geladen…"). Fix: Variable in `tdata` umbenannt (`t.j`/`t.n` → `tdata.j`/`tdata.n`). Verifiziert: 29 Programm-Punkte / 7 Themen bei AfD (btw2029), 20 Punkte bei CDU/CSU (LSA).
- [x] **Teilen-Link zeigt dem Empfänger einen Fehler** – derselbe Crash in `renderPartyProgramm()` propagierte durch `openPartyPage()` → `setActiveElection()` → `loadElections()` in den globalen catch des Bootstrap → Empfänger sah „⚠️ Fehler beim Laden." statt der geteilten Partei-Seite. Nach dem Fix öffnet sich die geteilte Partei-Seite (per CDP verifiziert: Empfänger-Navigation `#w=btw2029&a=&p=AfD` → PartyPage sichtbar, Titel „AfD", keine Runtime-Exception).
- [x] **Antwort-Buttons im Parteien-Test „registrieren nicht"** – Fragen haben unterschiedliche Höhen; nach dem Auto-Weiter lagen die Antwort-Buttons der nächsten Frage unterhalb des Viewports (per CDP gemessen: Q1-Button bei y=787 > Viewport 740) → Taps landen ins Leere. Fix: neue `scrollQuestionButtonsIntoView()` (script.js), aufgerufen in `showNextQuestion()`/`showPreviousQuestion()`/`initializeTest()`/`backToTest()`; `scrollIntoView({block:'nearest'})` scrollt nur minimal, wenn die Buttons außerhalb des sichtbaren Bereichs liegen. Zusätzlich `fadeIn`-Animation auf reine Opacity-Einblendung reduziert (styles.css) – ein sich bewegendes (`translateY`) Element kann Taps verschlucken.

## P2 – Fehlende Features

- [x] **Horizontales Scrollen durch überlaufenden Inhalt** – drei Ursachen beseitigt:
  - Tab-Leiste: 4 Tabs à `white-space:nowrap` waren zusammen breiter als der Viewport (scrollWidth 462 > 320) und wurden durch `overflow:hidden` abgeschnitten („Parteien & Kandidaten" unlesbar). Fix: `.tab-button` darf auf ≤480 px umbrechen (`white-space:normal`, kleinere Schrift/Padding).
  - Wahl-Umschalter (`.election-toggles`): Carousel mit `nowrap` + `overflow-x:auto` → horizontaler Scroll auf der Willkommens-Seite; „Bundestagswahl 2029 (Umfrage)" war allein 338 px breit. Fix: `.election-toggle` darf auf ≤600 px umbrechen (`flex-shrink:1`, `white-space:normal`, `max-width:100%`), `.election-toggles` nutzt `flex-wrap:wrap`.
  - Body-Guard: `overflow-x: clip` auf `body` (styles.css) verhindert versehentliches horizontales Seiten-Scrolling durch breite ECharts-Canvases/lange URLs; `clip` erzeugt keinen Scroll-Container, `position:sticky` der Tabs bleibt funktionsfähig.

## Prüfprotokoll (Verifikation per Headless-Chromium)

- `node --check script.js` OK.
- Kein horizontales Seiten-Overflow mehr auf allen 4 Tabs bei 320 px und 360 px (`document.documentElement.scrollWidth === innerWidth`), vorher: `.election-toggle` bis right:365 und scrollWidth 365 bei 320 px Viewport.
- Tab-Buttons ohne abgeschnittene Labels (scrollWidth ≤ clientWidth, 320 px).
- Partei-Seiten (btw2029 AfD, LSA CDU/CSU): öffnen ohne Exception, Programm/Themen/Feasibility/Kandidat (Reiner Haseloff) gerendert, News-Feed läuft an.
- Teilen: Empfänger-Sicht für Partei-Link (`&p=`) und Ergebnis-Link (`&a=0j1n2m`, 7 Ergebnis-Karten) korrekt wiederhergestellt, keine Fehler-Notification.
- Antwort-Flow: Antwort auf Frage 0 → Weiter → Buttons der Frage 1 liegen im Viewport (inView:true).
