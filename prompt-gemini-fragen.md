# Superprompt: Election Question Generator for Koalitions-O-Mat

You are generating questions for the **Koalitions-O-Mat** — a web app that lets users compare their political positions with parties for a specific German election. The questions and party answers are stored in a JSON file that the app loads at runtime. The app displays sources and explanations alongside each answer so users can understand WHY each party holds its position.

## Your Task

Research the **current election-specific programs and official party positions** for a given election, then produce a `fragen.json` file with **40-50 questions** that are:

- **Salient** — covering the most important and debated issues of that election
- **Differentiating** — parties should disagree enough that answers reveal meaningful differences
- **Fact-based** — each party's answer must be grounded in that party's official program, public statements, voting record, or coalition agreement
- **Sourced** — every answer MUST include verifiable sources (quotes, page numbers, URLs)
- **Election-appropriate** — for *Landtagswahlen*, questions must be about *Landespolitik* (state-level responsibilities); for Bundestag elections, about *Bundespolitik* (federal)

---

## JSON Format (EXACT)

```json
{
  "fragen": [
    {
      "nr": 1,
      "thema": "Umwelt",
      "frage": "Short headline (max 60 chars)",
      "beschreibung": "Precise yes/no question (20–60 words) describing the policy proposal.",
      "antworten": {
        "PARTEI-NAME": {
          "wert": "j",
          "zitat": "Wörtliches Zitat aus dem Wahlprogramm, das die Position belegt.",
          "quelle": "Wahlprogramm 2025, S. 12; https://partei.de/programm",
          "begruendung": "Kurze Erklärung, warum die Partei diese Position vertritt (1–3 Sätze)."
        }
      }
    }
  ]
}
```

### Fields for Each Question
| Feld | Pflicht? | Beschreibung |
|------|----------|--------------|
| `"nr"` | **Ja** | Eindeutige Nummer, beginnend bei 1 |
| `"thema"` | **Ja** | Einer der validen Themen-Keys aus der Liste unten – wird von der App zur Themen-Zuordnung genutzt. OHNE dieses Feld fällt die Frage auf eine ungenaue Keyword-Erkennung zurück. |
| `"frage"` | **Ja** | Kurze Überschrift, max. 60 Zeichen |
| `"beschreibung"` | **Ja** | Präzise Ja/Nein-Frage (20–60 Wörter) |
| `"antworten"` | **Ja** | Positionen aller relevanten Parteien |

### Valid Topics (`"thema"`) – use EXACTLY one of these keys
```
Wirtschaft, Soziales, Umwelt, Außenpolitik, Inneres, Kultur, Digitales, Sonstiges
```
Choose the topic that best fits the policy area of the question. If none fits, use `"Sonstiges"` – never invent a new key.

### Answer Code (`"wert"`)
| Wert | Meaning |
|------|---------|
| `"j"` | **Yes** — party supports the proposition |
| `"n"` | **No** — party opposes the proposition |
| `"m"` | **Neutral / unclear** — party has no clear position, is internally divided, or the issue is not a priority |

### Rules for `"m"` (Neutral)
- Use sparingly — `"m"` should be the *exception*, not the default
- Only use when you have verified that the party genuinely *has no official position* OR is internally split
- Do NOT use `"m"` as a shortcut when you are unsure — do the research

### Fields for Each Party Answer
| Feld | Pflicht? | Beschreibung |
|------|----------|--------------|
| `"wert"` | **Ja** | `"j"`, `"n"` oder `"m"` |
| `"zitat"` | Nein | Wörtliches Zitat aus dem Wahlprogramm, das die Position direkt belegt. Maximal 2–3 Sätze. |
| `"quelle"` | **Ja** | Konkrete Quellenangabe mit Seitennummern und/oder URL. |
| `"begruendung"` | **Ja** | 1–3 Sätze, die die Position der Partei erklären: historische Gründe, ideologische Grundsätze, strategische Überlegungen. |

If you cannot find a direct quote, omit `"zitat"` but always provide `"quelle"` and `"begruendung"`.

---

## Party Names (use EXACTLY these strings)

Depending on the election, the parties set will include some subset of:

```
CDU/CSU   (always combined as one)
SPD
GRÜNE
FDP
AfD
LINKE
BSW
FREIE WÄHLER   (only in some state elections)
SSW            (only in Schleswig-Holstein – never in Berlin)
Volt
Tierschutz     (not "Tierschutzpartei" – the app uses the short name)
PARTEI
ÖDP
DieBasis
BÜNDNIS DEUTSCHLAND
Todenhöfer
PIRATEN
Verjüngung
PdH
Bündnis C
BP
MLPD
MENSCHLICHE WELT
PdF
SGP
BüSo
MERA25
WerteUnion
```

**You must be told which parties are relevant for this election.** Use only those party names, exactly as listed above.

---

## Research Methodology

For each question you must:

1. **Identify a real policy debate** relevant to this specific election
2. **Research each party's actual stance** by consulting:
   - Official election manifestos (Wahlprogramme) — the most authoritative source
   - Party websites and press releases
   - Bundestag/Landtag voting records on the issue
   - Statements by party leaders and faction spokespeople
   - Coalition agreements (for incumbent parties)
   - Reliable news sources that report party positions
3. **Document sources explicitly** — every `"quelle"` field must contain a real, verifiable reference
4. **Provide direct quotes** wherever possible — `"zitat"` fields make the app more credible

### What NOT to do
- Do NOT guess or assume a party's position based on stereotypes or ideology alone
- Do NOT make all questions "left vs right" — include cross-cutting issues and internal coalition dynamics
- Do NOT create false equivalences — if a party hasn't taken a position, that is useful information (`"m"`)
- Do NOT make questions that are purely hypothetical or not actually debated in that election cycle
- Do NOT invent sources or quotes — if you cannot find a real source, omit the quote but still provide a reasoned `"begruendung"` based on the party's general platform

---

## Quality Guidelines

### Question Design
- **Short question** (`frage`): A concise label, max ~60 chars, readable as a tab header
- **Description** (`beschreibung`): A full sentence proposing a concrete policy action. Must be answerable with Yes/No/Neutral. Include specific details (numbers, dates, names) where real.
- **Controversy**: Choose questions where at least 2–3 parties disagree — if all parties agree, the question is not useful
- **Balance**: Cover a wide range of topics: economy, social policy, environment, migration, security, digitalization, EU/foreign, education, healthcare, housing, infrastructure
- **More is better**: Generate 40–50 questions. Cover the full spectrum of policy areas. Avoid duplication.

### Party Answer Distribution
- Vary which parties agree/disagree across questions
- Avoid always having the same coalitions (e.g., don't make every question SPD+GRÜNE vs CDU+FDP)
- Include at least one question where the current coalition partners disagree (reveals coalition tensions)

---

## Elections Reference

### Federal elections (Bundestag)
- Topics: defense, foreign policy, federal taxes, social security, energy policy, migration law, EU policy, federal infrastructure, nationwide minimum wage, cannabis, etc.

### State elections (Landtag)
- Topics: education (schools, universities), police, local public transport, housing policy, state-level economic development, culture, state hospitals, wind/solar zoning, state civil service, municipal finance
- **Crucial**: Do NOT ask about federal-only topics like defense, foreign policy, federal pensions, or EU treaties for state elections

---

## Example (from BTW 2025)

```json
{
  "nr": 1,
  "thema": "Umwelt",
  "frage": "Kohleausstieg bis 2030",
  "beschreibung": "Soll der Kohleausstieg in Deutschland bereits bis 2030 statt bis 2038 umgesetzt werden?",
  "antworten": {
    "CDU/CSU": {
      "wert": "n",
      "zitat": "Wir lehnen einen vorgezogenen Kohleausstieg ab. Die Versorgungssicherheit hat Vorrang.",
      "quelle": "CDU/CSU-Wahlprogramm 2025, S. 24; https://example.com/cdu-kohle",
      "begruendung": "Die Union hält am Ausstiegsdatum 2038 fest und argumentiert, dass ein früherer Ausstieg die Energieversorgung gefährdet."
    },
    "AfD": {
      "wert": "n",
      "zitat": "Kohlekraftwerke sichern unsere Energieunabhängigkeit.",
      "quelle": "AfD-Wahlprogramm 2025, S. 31; https://example.com/afd-energie",
      "begruendung": "Die AfD lehnt den Kohleausstieg grundsätzlich ab und setzt auf fossile Energien."
    },
    "SPD": {
      "wert": "j",
      "zitat": "Wir wollen den Kohleausstieg idealerweise bis 2030 schaffen.",
      "quelle": "SPD-Wahlprogramm 2025, S. 42; https://example.com/spd-klima",
      "begruendung": "Die SPD befürwortet einen beschleunigten Ausstieg, um die Klimaziele zu erreichen."
    },
    "GRÜNE": {
      "wert": "j",
      "zitat": "Der Kohleausstieg muss bis 2030 kommen – fürs Klima und für eine zukunftsfähige Wirtschaft.",
      "quelle": "GRÜNE-Wahlprogramm 2025, S. 18; https://example.com/gruene-kohle",
      "begruendung": "Die Grünen drängen auf den frühestmöglichen Kohleausstieg als zentrales Klimaschutzinstrument."
    },
    "LINKE": {
      "wert": "j",
      "zitat": "Kohleausstieg sofort – die Konzerne müssen zahlen.",
      "quelle": "DIE LINKE-Wahlprogramm 2025, S. 55; https://example.com/linke-energie",
      "begruendung": "Die Linke fordert den schnellstmöglichen Ausstieg und zusätzlich eine sozialverträgliche Gestaltung."
    },
    "BSW": {
      "wert": "m",
      "quelle": "BSW-Wahlprogramm 2025, S. 12; https://example.com/bsw-energie",
      "begruendung": "Das BSW hat sich nicht abschließend zu einem konkreten Datum positioniert und betont sowohl Klimaschutz als auch soziale Verträglichkeit."
    },
    "FDP": {
      "wert": "n",
      "zitat": "Technologieoffenheit statt Verbote – wir setzen auf Innovation, nicht auf Zwangsabschaltung.",
      "quelle": "FDP-Wahlprogramm 2025, S. 37; https://example.com/fdp-energie",
      "begruendung": "Die FDP lehnt feste Ausstiegsdaten ab und setzt stattdessen auf marktwirtschaftliche Instrumente und CO2-Preise."
    }
  }
}
```

This works because: the coal phase-out date was actively debated in the 2025 campaign, parties had clearly different positions, every answer has a source and explanation, and the question is specific and actionable.

---

## Now, Generate for THIS Election

**[INSERT ELECTION NAME AND PARTIES LIST HERE]**

Generate a complete `fragen.json` file with **40-50 questions** following all rules above. Every party answer must include `"wert"`, `"quelle"`, and `"begruendung"` (at minimum). Include `"zitat"` whenever you can find a direct quote.

Output ONLY the valid JSON, wrapped in a code block.

---

## Optional: Simple-Language Versions

The app also ships `einfache-sprache.json`, which holds simplified versions of every question for accessibility. When you generate questions, optionally also provide for each question a `frage` (headline) and `beschreibung` (description) in **einfache Sprache**: short sentences, common everyday words, no jargon, no subordinate clauses. Example:

```json
{
  "1": { "frage": "Kohleausstieg bis 2030", "beschreibung": "Soll Deutschland schon 2030 mit der Kohle aufhören? Oder erst 2038?" }
}
```
