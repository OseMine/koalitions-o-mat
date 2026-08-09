# Superprompt: Election Party Data Generator for Koalitions-O-Mat

You are generating the **supplementary party data** for the **Koalitions-O-Mat** — a web app that compares users' political positions with German parties for a specific election. The app loads `elections/<id>/werte.json` at runtime. This file already contains `umfragewerte` (party name + current poll value `prozent`) and `meta`. Your task is to generate the **optional per-party fields** that enrich the party detail pages:

- `beschreibung` (party description)
- `beschreibung_einfach` (simple-language version of `beschreibung`)
- `website` (official party website)
- `kandidaten` (list of top candidates) + `spitzenkandidat` (lead candidate)
- `verlauf` (historical poll values over time)
- `rss` (news feed URLs — **neutral, independent sources only**)

You will be told which election and which parties (with their current poll values) are relevant.

Each election directory additionally contains `elections/<id>/config.json` with per-election settings. It is read by the app at runtime and is **not** part of your output — but you must keep its party names in mind (see Rules):

```json
{
  "thresholds": { "sperrklausel": 5, "minMatchForCoalition": 20, "maxCoalitionSize": 4 },
  "koalitionsausschluss": { "AfD": ["SPD", "GRÜNE", "LINKE"] }
}
```

- `koalitionsausschluss` maps a party to the other parties it refuses to govern with. Any coalition containing such a pair (e. g. AfD + SPD) is never shown by the app.
- Party keys **must be spelled exactly like the `partei` entries** in `werte.json`.

---

## JSON Format (EXACT)

Take the existing `werte.json` and **add the optional fields to each party entry**. Output the complete file:

```json
{
  "meta": {
    "name": "Wahlname",
    "sperrklausel": 5,
    "sitze": 87,
    "verfahren": "dhondt"
  },
  "umfragewerte": [
    {
      "partei": "CDU/CSU",
      "prozent": 32,
      "beschreibung": "2–4 Sätze: politische Grundlinien der Partei, aktuelles Wahlprogramm, Schwerpunkte.",
      "beschreibung_einfach": "2–3 kurze Sätze in einfacher Sprache (Alltagswörter, kurze Sätze, kein Jargon).",
      "website": "https://www.cdu.de",
      "kandidaten": [
        { "name": "Vollständiger Name", "rolle": "Landesvorsitzender" },
        { "name": "Vollständiger Name", "rolle": "Spitzenkandidatin für die Landtagswahl" }
      ],
      "spitzenkandidat": "Vollständiger Name (muss exakt einem Namen aus `kandidaten` entsprechen)",
      "verlauf": [
        { "label": "Okt 2021", "prozent": 30 },
        { "label": "Jun 2023", "prozent": 28 },
        { "label": "Jul 2026", "prozent": 32 }
      ],
      "rss": [
        "https://www.tagesschau.de/inland/thema-partei-name.rss"
      ]
    }
  ]
}
```

### Fields for Each Party
| Feld | Pflicht? | Beschreibung |
|------|----------|--------------|
| `partei` | **Ja** | Exakt der Parteiename aus der vorhandenen `werte.json` – niemals ändern/umbenennen; muss zudem exakt den Partei-Keys in `config.json` (`koalitionsausschluss`) entsprechen |
| `prozent` | **Ja** | Vorhandener aktueller Umfragewert – unverändert lassen |
| `beschreibung` | **Ja** | 2–4 neutrale Sätze zu Grundlinien, Wahlprogramm und Schwerpunkten |
| `beschreibung_einfach` | Nein | Einfache-Sprache-Version der Beschreibung: 2–3 kurze Sätze, Alltagswörter, keine Fachbegriffe. Die App zeigt sie bei aktivierter „Einfacher Sprache" |
| `website` | **Ja** | Offizielle Partei-Website (https) |
| `kandidaten` | Je nach Wahl | Top-Kandidatinnen und -Kandidaten: `name` + `rolle` (Landesvorsitz, Spitzenkandidat:in, Ministerpräsident:in …) |
| `spitzenkandidat` | Nein | Exakter `name` aus `kandidaten` |
| `verlauf` | **Ja** | Mindestens 4 Zeitpunkte (Label + `prozent`), letzter Eintrag ≈ aktueller `prozent` |
| `rss` | **Ja** | **Neutrale, unabhängige Nachrichten-Feeds** (RSS/Atom), keine Partei-Eigenkanäle |

---

## Rules

### `beschreibung`
- **Neutral und wertendungsfrei** formulieren – keine Werbesprache, keine Kampfbegriffe, keine Zustimmung/Ablehnung.
- Grundlage: Wahlprogramm und öffentliche Positionen. Fakten statt Meinungen.
- 2–4 Sätze, konkrete Politikfelder nennen (z. B. Migrationspolitik, Klima, Haushalt, Bildung).

### `website`
- Offizielle Partei-Website. Für Landesparteien die Landes-URL bevorzugen (z. B. `https://www.cdu-lsa.de`), sonst Bundes-URL.

### `koalitionsausschluss` (in `config.json`)
- Nicht Teil deiner Ausgabe, aber zu beachten: Jede Partei kann in `config.json` festlegen, mit welchen anderen Parteien sie nicht koalieren will (z. B. `"AfD": ["SPD", "GRÜNE", "LINKE"]`).
- Parteien aus einem Ausschluss-Paar dürfen niemals in derselben Koalition erscheinen. In `werte.json` musst du nur sicherstellen, dass die Parteinamen exakt den Keys in `koalitionsausschluss` entsprechen (identische Schreibweise).
- Koalitionen nicht selbst in `werte.json` pflegen — die App berechnet sie aus den Umfragewerten und blendet ausgeschlossene Paare automatisch aus.

### `kandidaten` / `spitzenkandidat`
- Nur **reale, öffentlich bekannte** Personen nennen (Landesvorsitzende, Spitzenkandidat:innen, Ministerpräsident:innen).
- `spitzenkandidat` **muss exakt** dem `name`-Feld eines `kandidaten`-Eintrags entsprechen – sonst findet die App ihn nicht.
- Für Bundestagswahlen: nur wenn real bekannt (Kanzlerkandidat:innen etc.). Keine erfundenen Namen.
- Fehlt die Person oder ist unsicher, `kandidaten`/`spitzenkandidat` weglassen.

### `verlauf` (Zeit-Entwicklung)
- Reale Umfragewerte der Partei aus öffentlich zugänglichen Umfragen (z. B. Forschungsgruppe Wahlen, INSA, Infratest dimap).
- Mindestens 4 Einträge, aufsteigend sortiert, ca. 6–12 Monate Abstand.
- **Der letzte Eintrag muss dem aktuellen `prozent` entsprechen** (oder ihm sehr nahe kommen), sonst wirkt das Diagramm widersprüchlich.
- Labels: `"Monat Jahr"` (deutsch), z. B. `"Okt 2021"`, `"Jul 2026"`.

### `rss` – WICHTIG: Neutralität
- Die App verspricht **neutrale** Nachrichten (Transparenz-Hinweis). Deshalb:
  - **Verboten:** Partei-eigene Feeds (z. B. `afd.de/feed`, `cdu.de/feed`) und parteinahe Portale.
  - **Erlaubt:** überregionale bzw. regionale Nachrichten-Feeds mit thematischem Bezug, z. B. Tagesschau-Themenseiten, MDR/NDR/rbb-Landesfeeds, dpa-Themenfeeds, öffentlich-rechtliche Nachrichtenangebote.
- 1–2 stabile RSS-/Atom-URLs pro Partei; nur URLs, die ein gültiges RSS/Atom-XML liefern.
- Existiert kein passender neutraler Feed, das Feld weglassen (die App zeigt dann einen Empty-Text).

---

## Research Methodology

1. **Official sources first**: Wahlprogramm, Partei-Website, Landesverband-Websites.
2. **Cross-check** candidate names and roles with current press coverage (Stand: 2026).
3. **Poll values** (`verlauf`) from published poll series — never invent values.
4. **Verify feed URLs** are real RSS/Atom endpoints of neutral outlets before including them.

### What NOT to do
- Do NOT change `partei` or `prozent` of existing entries
- Do NOT invent candidates, quotes, or poll values
- Do NOT use party-owned or party-affiliated RSS feeds
- Do NOT write evaluative descriptions (no "gut"/"schlecht", no campaign language)

---

## Output

Output ONLY the complete valid JSON (`werte.json`), wrapped in a code block. Keep all existing fields (`meta`, `partei`, `prozent`) exactly as given.

---

## Optional: Simple-Language Descriptions

The app also ships `einfache-sprache.json` (UI + question translations). Party descriptions are currently only shown in normal German. If you generate `beschreibung` texts, optionally provide a simplified version per party (short sentences, everyday words, no jargon) for future accessibility work.
