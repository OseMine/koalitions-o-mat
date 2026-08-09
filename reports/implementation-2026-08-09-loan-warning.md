# Umsetzung: Leihstimmen-Warnung an Sperrklausel gekoppelt (Issue 2026-08-09)

Issue: „Taktik-Warnungen an Sperrklausel koppeln (Leihstimmen-Warnung & schwankt-Band)".
Basis: `reports/review-2026-08-09.md` P2/P3 (todo.md:16, 23) und supporting-Fix für die Mock-„Geisterpartie" (todo.md:21).

## Änderungen in `script.js`

- **`calculateTacticalPolls()`** – Mock-Umfragewerte werden nur noch als Fallback für **reale**
  Parteien der aktiven Wahl verwendet (`value` fehlt), nie mehr als „Geisterparteien" (bisher Phantom
  `CDU: 30` in allen 4 Wahlen). Verhindert, dass Phantom-Parteien die Mehrheitsberechnung des neuen
  Kriteriums verfälschen.
- **`calculateTacticalVoting()`** (Leihstimmen-Warnung, Doku Szenario B) – Kriterium auf Sperrklausen-Nähe
  des **kleineren Partners** umgestellt:
  - `naheHuerde`: kleinerer Partner liegt im **aus `tacticalThreshold()` abgeleiteten** Band
    `[threshold-1, threshold+1)` (5 % ↔ 4–6 %, bei 3 % ↔ 2–4 %) statt hartkodiert 4–6.
  - `partnerSicher`: größerer Partner über der Sperrklausel.
  - `mehrheitSicher`: Wunschkoalition hätte eine parlamentarische Mehrheit (> 50 % der simulierten
    Umfragewerte), direkt oder zusammen mit weiteren über der Sperrklausel liegenden Parteien
    (max. `maxCoalitionSize`) – **ohne politisch ausgeschlossene Koalitionen**, nutzt dafür
    `istKoalitionAusgeschlossen()`. Dadurch wird insbesondere **AfD+GRÜNE (LSA) nicht mehr** empfohlen.
  - Die angezeigte Mehrheit (`info.majorityPossible`) ist `share > 50` oder mehrheitsfähig; der
    Mehrheiten-Indikator in `updateTacticalWarnings()` nutzt sie.
- Neuer Helfer **`istKoalitionsMehrheitSicher(a, b, polls, threshold)`**.

## Verifikation (Node-Harness)

```bash
node --check script.js        # OK
node tools/tactical-harness.js
```

Harness `tools/tactical-harness.js` (Spiegelbild der neuen Logik, reale `werte.json`/`config.json`
aller 4 Wahlen):

| Wahl | vorher (alte Logik) | jetzt (neue Logik) |
|---|---|---|
| btw2029 | – | **22** Paare (FDP/BSW als kleiner Partner, u. a. AfD|FDP, CDU/CSU|BSW) |
| Berlin | – | **8** Paare (BSW als kleiner Partner, u. a. LINKE|BSW, SPD|BSW) |
| Sachsen-Anhalt | 2 (AfD\|GRÜNE) | **8** Paare (BSW/FDP als kleiner Partner); AfD\|GRÜNE feuert **nicht mehr** |
| MV | – | **8** Paare (GRÜNE als kleiner Partner, u. a. SPD|GRÜNE, CDU/CSU|GRÜNE) |
| **Σ** | **2 / 168** | **46 / 168**, in allen 4 Wahlen |

Die Warnung ist damit über mehrere Wahlen verifizierbar (nicht nur LSA) und feuert nur für
mehrheitsfähige, nicht ausgeschlossene Wunschkoalitionen mit einem nahe der Sperrklausel liegenden
kleineren Partner. Die vollständige Paarliste liefert der Harness-Auslauf.