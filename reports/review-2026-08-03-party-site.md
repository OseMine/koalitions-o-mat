# Koalitions-O-Mat – Review vom 2026-08-03 (Partei-Seite: Inhalte, Historie-Daten, Nachrichten)

Fokus der Nutzer-Meldung: „Auf der Partei-Seite sind Inhalte nur über den geteilten Link sichtbar; die historischen Daten funktionieren nicht; Aktuelle Nachrichten laden nicht (und sollten neutral bzw. unabhängig von jeder Partei sein)."

Verifiziert per Node gegen die echten Datendateien (`elections/*/werte.json`) und die Partei-Seiten-Funktionen in `script.js` (`openPartyPage`, `renderPartyTimeline`, `renderPartyProgramm`, `renderPartyFeasibility`, `loadPartyNews`, `fetchNewsFeedProxy`). `node --check script.js` OK. Ausführbarkeit der Funktionen über ein DOM-Shim-Harness geprüft.

## Kernbefunde (zusammengefasst)

1. **Daten-Lücke statt Code-Bug für „Historie funktioniert nicht":** Nur `btw2029/werte.json` enthält `verlauf` (für die 7 größten Parteien, je 4–5 Punkte). Alle drei Landtagswahlen (`ltw-sachsen-anhalt-2026`, `berlin-2026`, `mv-2026`) haben **keinerlei `verlauf`** → `renderPartyTimeline()` (script.js:608) zeigt für jede Partei nur den Empty-Text „Noch keine historische Umfragewerte …". Zusätzlich fehlen `verlauf`/`rss` in btw2029 für FREIE WÄHLER, Volt, Tierschutz, PARTEI, SSW, BÜNDNIS DEUTSCHLAND.
2. **Einzige echte P1: Neutralitäts-Verstoß des News-Feeds.** `loadPartyNews()` (script.js:705) lädt die **partei-eigenen** RSS-Feeds (`afd.de/feed`, `cdu.de/feed`, `gruene.de/rss-feed`, `spd.de/rss/feed/aktuell`, `fdp.de/rss.xml`, `die-linke.de/feed`, `bsw-partei.de/feed`). Das sind Eigenkanäle (Eigenwerbung), keine neutralen Nachrichten – es widerspricht der ausdrücklichen Neutralitäts-Zusage in `index.html:51` (`transparencyText`), Footer und README Z. 10 („Die Seite ist neutral").
3. **News laden technisch unzuverlässig:** `fetchNewsFeedProxy()` (script.js:737) nutzt den öffentlichen Proxy `https://api.allorigins.win/raw?url=` (config.json:66) ohne Timeout/AbortController. Latenz getestet ~5,5 s; der Proxy fällt regelmäßig aus. Bei Hänger bleibt „Nachrichten werden geladen…" dauerhaft stehen.
4. **„Inhalte nur über Teilen-Link" nicht als Code-Pfad reproduzierbar.** `openPartyPage()` (script.js:506) ist im direkten Klick- und im Teilen-Link-Pfad identisch; beide rendern das Wahlprogramm (verifiziert: LSA CDU/CSU 30 Punkte/6 Themen, btw2029 AfD 41 Punkte/7 Themen). Die Wahrnehmung ist konsistent mit Issue #21 (mobile Tap-Probleme) + den Daten-Lücken oben.

---

## P1 – Neutralität (Nachrichten-Feed)

- [x] **Nachweis (Daten):** Alle konfigurierten `rss`-Feed-URLs in `werte.json` zeigen auf die offiziellen Website-/Presseseiten der jeweiligen Partei.
- [ ] **`loadPartyNews()` lädt Partei-eigene Feeds als „Aktuelle Nachrichten"** – `elections/btw2029/werte.json` (alle 7 Parteien). Damit werden ungefilterte Partei-Kommunikation und Eigendarstellung im App-Kontext als sachliche News präsentiert. Die Transparenz-/Unabhängigkeits-Zusagen (index.html:51 `transparencyText`, README.md:10 „neutral") werden nicht eingehalten. Hinweis `party.newsSource` („Auswahl & Zusammensetzung können nicht kontrolliert werden") nennt die Quelle nicht als Parteikanal. Empfehlung: auf neutrale, unabhängige Quellen je Partei umstellen (z. B. Tagesschau-Themenseite, Zeit/FAZ-Sachgebietspunkt, kennzeichnen) **oder** Sektion entfernen bzw. klar als „Eigendarstellung der Partei" kennzeichnen.

## P1 – Bugs

- [x] **Kein Info-Pfad-Unterschied reproduziert** – direkte Navigation vs. `&p=`-Teilen-Link laufen beide über `openPartyPage()`; Programm-/Feasibility-/Timeline-Render identisch (per Harness verifiziert). Der Meldung „Inhalte nur über Teilen-Link" liegt kein eigener Code-Pfad zugrunde.
- [ ] **`party.notFound` fehlt weiterhin in `einfache-sprache.json`** – re-verifiziert: `es.ui['party.notFound']` → `undefined` (Fallback „Partei nicht gefunden."). Bereits in todo.md (2026-08-03-b) als offen gelistet; hier bestätigt und weiterhin offen.

## P2 – Fehlende Features

- [ ] **`verlauf` (Historie) fehlt in 3 von 4 Wahlen** – `ltw-sachsen-anhalt-2026`, `berlin-2026`, `mv-2026`: keine Partei hat `verlauf`. README-Zusage (Z. 10) „Veränderung der Umfragewerte über die Zeit" nie erfüllt; `renderPartyTimeline()` zeigt nur den Empty-Text. → Daten-Grundlage je Partei ergänzen.
- [ ] **`rss` fehlt in 3 von 4 Wahlen** – News-Sektion kippt für alle Parteien der Landtagswahlen in den Empty-Zustand „noch keine Nachrichten-Quellen eingerichtet" (`party.newsEmpty`). Zusätzlich in btw2029 für die 6 Kleinstparteien weder `verlauf` noch `rss`.
- [ ] **News-Fetch ohne Timeout/Retry/Caching** – `fetchNewsFeedProxy()` (script.js:737) ohne `AbortController`; hängt der Proxy, bleibt „Nachrichten werden geladen…" (`party.loading` in `openPartyPage`) dauerhaft stehen. Timeout (~8 s), Fehlerzustand und optional Cache einführen.
- [ ] **Keine Quellen-Kennzeichnung auf der Partei-Seite** – Nachrichten werden ohne Hinweis darauf angezeigt, dass es sich um Partei-Kanäle handelt (`party.newsSource` adressiert die Quelle nicht als Parteikanal).

## P3 – Verbesserungen

- [ ] **„Details, Programm & News"-Button ist ein kleines Tap-Ziel** – `.party-detail-link` (styles.css:749) nur 8×14 px Padding ohne `min-height`/Tap-Target-Fläche; auf Touch-Geräten schwer treffbar. Vermutliche Ursache für „Inhalte nur über Teilen-Link erreichbar"; Issue #21 korrigierte nur die Antwort-Buttons. → 44 px Mindesthöhe.
- [ ] **Konsistente Anchor/Fallback für leere Historien-Sektion** – bei fehlendem `verlauf` zusätzlich zum Empty-Text eine deaktivierte/hinweishafte Platzhalte-Position (aus UX-Sicht wirkt eine komplett leere Sektion wie ein Bug).
- [ ] **README & `rss`-Beschreibung präzisieren** – README Z. 10 nennt „neutral" und „Nachrichten-Feed (RSS, optional `rss` pro Partei)", ohne zu erwähnen, dass dies die Partei-Feeds sind; Neutralitäts-Zusage und Kanalfrage sollten dort ehrlich dokumentiert werden.

---
Anmerkung: Der Befund „Partei-Seite leer beim direkten Öffnen" aus früheren Läufen (Bug mit `t()`-Überschattung in `renderPartyProgramm`) ist seit dem 2026-08-03 gefixt – im aktuellen Code tritt er nicht mehr auf; Empfehlungen fokussieren daher auf Daten-Grundlage, Tap-Target und Neutralität.

Verifikationsprotokoll (README-Referenzen/Lines geprüft):
- `node --check script.js` OK.
- `elections/btw2029/werte.json`: verlauf 7× (5 Punkte/4 Punkte BSW), rss 7×; Kleinst-Parteien (FREIE WÄHLER, Volt, Tierschutz, PARTEI, SSW, BÜNDNIS DEUTSCHLAND) ohne `verlauf`/`rss`.
- `elections/ltw-sachsen-anhalt-2026|berlin-2026|mv-2026/werte.json`: `verlauf`=0, `rss`=0 je Wahl.
- Harness: `openPartyPage`/`renderPartyProgramm` rendern in allen 4 Wahlen Programm-Punkte (btw AfD 41, CDU/CSU 36; LSA 20–38; Berlin 40–52; MV 23–32) – direkt aufgerufen **und** im Teilen-Pfad identisch.
- `renderPartyTimeline` ohne `verlauf`: Empty-Text, Chart versteckt (kein Crash) – Historie „funktioniert nicht" = Datengrundlage fehlt.
- Proxy `api.allorigins.win/raw`: HTTP 200, Latenz ~5,5 s (fragil, kein Timeout im Code).