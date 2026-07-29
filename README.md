# Koalitions-O-Mat

Interaktiver Koalitionsrechner für die Bundestagswahl und Landtagswahlen. Zeigt mögliche Koalitionen basierend auf aktuellen Umfragewerten und offiziellen Ergebnissen, inklusive Übereinstimmungsanalyse der Parteipositionen.

## Funktionen

- **Alle Koalitionen** – Alle möglichen Mehrheits-/Minderheitskoalitionen mit Übereinstimmungswert
- **Nach Partei filtern** – Koalitionen für eine bestimmte Partei anzeigen
- **Parteien vergleichen** – Positionen mehrerer Parteien nebeneinander
- **Koalitionstest** – Eigene Positionen zu politischen Fragen mit Koalitionen abgleichen
- **Parteientest** – Eigene Positionen mit einzelnen Parteien vergleichen
- **Wahlsimulator** – Eigene Stimme abgeben mit Sitzverteilung
- **Dashboard** – Persönliche Analyse und Übersicht
- **Statistiken** – Diagramme zur politischen Landschaft

## Datenquellen

- **BTW 2025** – Offizielles Zweitstimmen-Ergebnis
- **BTW 2029** – Forsa-Umfrage (Juli 2026)
- **LTW Sachsen-Anhalt 2026** – INSA-Umfrage (Juli 2026)
- **Berlin 2026** – INSA-Umfrage (Juli 2026)
- **MV 2026** – Infratest dimap-Umfrage (Juli 2026)

## Technik

- Vanilla JavaScript, Chart.js (ECharts), CSS Custom Properties
- Dark/Light Mode mit automatischer Systemerkennung
- LocalStorage für Testergebnisse und Theme-Einstellung
- Kein Framework – läuft ohne Build-Tool
