# Koalitions-O-Mat

Interaktiver Koalitionsrechner und Parteien-Test für die Bundestagswahl 2029 und Landtagswahlen 2026. Zeigt mögliche Koalitionen basierend auf aktuellen Umfragewerten, inklusive Übereinstimmungsanalyse der Parteipositionen.

## Funktionen

- **Parteien-Test** – Eigene Positionen zu politischen Fragen mit Parteien und Koalitionen abgleichen (Wahl-O-Mat-Stil: Themen-Badge, Fortschrittsanzeige, Überspringen, Tastatursteuerung 1/2/3 und Pfeiltasten, Willkommensscreen)
- **Alle Koalitionen** – Alle möglichen Mehrheits-/Minderheitskoalitionen mit Übereinstimmungswert
- **Filter** – Mindestübereinstimmung, Koalitionsart (Mehrheit/Minderheit/Alle), nach Partei filtern, Parteien ausschließen
- **Parteien vergleichen** – Positionen mehrerer Parteien nebeneinander mit Quellen und Begründungen
- **Daten & Charts** – Umfragewerte, Sitzverteilung, Koalitionspotential, Parteipositionen nach Themen, Themenverteilung
- **Einfache Sprache** – Umschalter für alle UI-Texte und 178 Fragen in einfacher Sprache
- **Dark/Light Mode** – mit automatischer Systemerkennung
- **Ergebnis-Historie** – Testergebnisse werden gespeichert

## Wahlen & Datenquellen

| Wahl | Umfrage |
|------|---------|
| Bundestagswahl 2029 | Umfrage Juli 2026 |
| Landtagswahl Sachsen-Anhalt 2026 | Umfrage Juli 2026 |
| Abgeordnetenhaus Berlin 2026 | Umfrage Juli 2026 |
| Landtagswahl Mecklenburg-Vorpommern 2026 | Umfrage Juli 2026 |

## Datenstruktur

- `elections/<id>/fragen.json` – Fragen mit Parteipositionen (`wert`, `zitat`, `quelle`, `begruendung`)
- `elections/<id>/werte.json` – Umfragewerte und Wahl-Metadaten (Sperrklausel, Sitzzahl)
- `elections/<id>/config.json` – optionale Schwellenwerte pro Wahl
- `einfache-sprache.json` – Übersetzungen für UI-Texte und Fragen in einfacher Sprache
- `config.json` – globale Farben und Themen-Kategorien

## Technik

- Vanilla JavaScript, ECharts, CSS Custom Properties
- Kein Framework – läuft ohne Build-Tool, einfach per Static-Server servieren (z. B. `python -m http.server 3000`)
- LocalStorage für Theme, aktive Wahl, Einfache-Sprache-Einstellung und Test-Historie

## Fragen generieren

Neue Fragenkataloge können mit dem Prompt in [prompt-gemini-fragen.md](prompt-gemini-fragen.md) per Gemini erstellt werden.
