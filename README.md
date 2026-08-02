# Koalitions-O-Mat

Interaktiver Koalitionsrechner und Parteien-Test für die Bundestagswahl 2029 und Landtagswahlen 2026. Zeigt mögliche Koalitionen basierend auf aktuellen Umfragewerten, inklusive Übereinstimmungsanalyse der Parteipositionen.

## Funktionen

- **Parteien-Test** – Eigene Positionen zu politischen Fragen mit Parteien und Koalitionen abgleichen (Wahl-O-Mat-Stil: Themen-Badge, Fortschrittsanzeige, Überspringen, Tastatursteuerung 1/2/3 und Pfeiltasten)
- **Willkommensseite** – Hero mit Schritt-Erklärung und klickbaren Wahl-Karten (Parteien- und Fragenzahl pro Wahl) zum direkten Start
- **Parteien & Kandidaten** – Eigene Seite pro Wahl mit allen Parteien: Umfragewerte, Programmbeschreibungen, Kandidatinnen und Kandidaten, Partei-Websites (optional in `werte.json`)
- **Partei-Seiten** – Jede Partei hat eine eigene Detailseite (über „Details, Programm & News"): Spitzenkandidat:in, Veränderung der Umfragewerte über die Zeit (Diagramm, optional `verlauf`), die wichtigsten Punkte des Wahlprogramms mit „Was bedeutet das?"-Einordnung, eine Einschätzung zu Machbarkeit/Möglich-Umgesetzt werden (basierend auf Umfragewerten) sowie einen Nachrichten-Feed (RSS, optional `rss` pro Partei). Die Seite ist neutral, mobil optimiert und über einen eigenen Share-Button (Link mit `&p=<Partei>`) teilbar.
- **Alle Koalitionen** – Alle möglichen Mehrheits-/Minderheitskoalitionen mit Übereinstimmungswert (paarweiser Vergleich der Parteipositionen)
- **Filter** – Mindestübereinstimmung, Koalitionsart (Mehrheit/Minderheit/Alle), nach Partei filtern, Parteien ausschließen
- **Parteien vergleichen** – Positionen mehrerer Parteien nebeneinander mit Quellen und Begründungen
- **Daten & Charts** – Umfragewerte, Sitzverteilung, Koalitionspotential, Parteipositionen nach Themen, Themenverteilung
- **Einfache Sprache** – Umschalter für alle UI-Texte und alle 170 Fragen (45 Bundestag + 40 Sachsen-Anhalt + 52 Berlin + 33 Mecklenburg-Vorpommern) in einfacher Sprache
- **Dark/Light Mode** – mit automatischer Systemerkennung
- **Ergebnis-Historie** – Testergebnisse werden gespeichert
- **Ergebnis teilen** – Testergebnis als kompakte URL teilen (Wahl, Antworten, wichtige Fragen, neutrale Antworten); beim Öffnen wird das Ergebnis ohne History-Eintrag wiederhergestellt. Im Koalitionen-Tab werden zusätzlich die Filter (Typ, Mindestmatch, Partei-Filter, Ausschlüsse) mitgeteilt
- **Fortsetzen & Zurücksetzen** – frühere Testsitzungen werden angezeigt („Fortgesetzt: X von Y Fragen beantwortet") und fortgesetzt; Antworten lassen sich jederzeit per Button zurücksetzen
- **Transparenz** – Hinweis auf Willkommensseite und Footer: privates Projekt, keine Verbindung zu Parteien, Organisationen oder staatlichen Stellen, keine finanzielle Förderung

## Wahlen & Datenquellen

| Wahl | Umfrage |
|------|---------|
| Bundestagswahl 2029 | Umfrage Juli 2026 |
| Landtagswahl Sachsen-Anhalt 2026 | Umfrage Juli 2026 |
| Abgeordnetenhaus Berlin 2026 | Umfrage Juli 2026 |
| Landtagswahl Mecklenburg-Vorpommern 2026 | Umfrage Juli 2026 |

## Datenstruktur

- `elections/<id>/fragen.json` – Fragen mit Parteipositionen (`wert`, `zitat`, `quelle`, `begruendung`)
- `elections/<id>/werte.json` – Umfragewerte und Wahl-Metadaten (Sperrklausel, Sitzzahl); optional pro Partei: `beschreibung`, `kandidaten` (`name`, `rolle`), `spitzenkandidat` (Name eines Eintrags aus `kandidaten`), `verlauf` (`label`, `prozent` für die Zeit-Entwicklung), `rss` (Array von RSS-/Atom-Feed-URLs für den Nachrichten-Feed), `website`
- `elections/<id>/config.json` – optionale Schwellenwerte pro Wahl
- `einfache-sprache.json` – Übersetzungen für UI-Texte und Fragen in einfacher Sprache
- `config.json` – globale Farben und Themen-Kategorien

## Technik

- Vanilla JavaScript, ECharts, CSS Custom Properties
- Kein Framework – läuft ohne Build-Tool, einfach per Static-Server servieren (z. B. `python -m http.server 3000`)
- LocalStorage für Theme, aktive Wahl, Einfache-Sprache-Einstellung und Test-Historie

## Automatisiertes Code-Review

Die GitHub Action [`.github/workflows/opencode-review.yml`](.github/workflows/opencode-review.yml) lässt OpenCode (Modell `opencode/deepseek-v4-flash-free` über OpenCode Zen) den Code wöchentlich und manuell reviewen: Bugs, fehlende Features und Algorithmus-Verbesserungen werden als `reports/review-<Datum>.md` geschrieben, in `todo.md` übernommen und als Pull Request geöffnet. Der Reviewer-Agent liegt in [`.opencode/agent/reviewer.md`](.opencode/agent/reviewer.md).

Einrichtung: Secret `OPENCODE_API_KEY` in GitHub → Settings → Secrets and variables → Actions anlegen (Key unter https://opencode.ai/auth).

## Fragen generieren

Neue Fragenkataloge können mit dem Prompt in [prompt-gemini-fragen.md](prompt-gemini-fragen.md) per Gemini erstellt werden.
