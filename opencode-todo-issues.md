# Workflow: Todo → GitHub Issues (opencode-todo-issues)

This document contains the workflow that lets opencode read `todo.md` and create one GitHub issue per open task.

> **Why this file exists instead of `.github/workflows/opencode-todo-issues.yml`:**
> The GitHub App used by this repository does **not** have the `workflows` permission.
> Pushing a file into `.github/workflows/` is rejected with:
> `refusing to allow a GitHub App to create or update workflow ... without workflows permission`.
>
> Until the App gets that permission, the workflow is maintained here. To activate it,
> copy the YAML below into `.github/workflows/opencode-todo-issues.yml` in a commit made
> with a token that has `workflows` permission (e.g. manually by the repo owner), or grant
> the GitHub App the `workflows` permission in the app settings.

## Usage

```yaml
name: opencode-todo-issues

on:
  workflow_dispatch:
    inputs:
      focus:
        description: "Optional: nur diesen Abschnitt/Titel in todo.md verarbeiten (Teilstring)"
        required: false
        type: string
  schedule:
    - cron: "0 6 * * 3" # Mittwoch 06:00 UTC

permissions:
  contents: read
  issues: write

jobs:
  create-issues:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0

      - name: Run opencode to create issues from todo.md
        uses: anomalyco/opencode/github@latest
        env:
          OPENCODE_API_KEY: ${{ secrets.OPENCODE_API_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          model: opencode/deepseek-v4-flash-free
          use_github_token: true
          prompt: |
            Aufgabe: Erzeuge GitHub-Issues aus den offenen Aufgaben in todo.md.

            Schritte:
            1. Lies todo.md (und bei Bedarf reports/ für Kontext).
            2. Sammle alle offenen Aufgaben – erkennbar an „- [ ]"-Checkboxen –
               sowie die als „Tracking offene GitHub-Issues" notierten Punkte.
               Fokusbereich (optional): ${{ github.event.inputs.focus || 'alle offenen Punkte' }}
            3. Gruppiere zusammengehörige Punkte sinnvoll zu einem Issue
               (ein Issue pro logischem Task, nicht ein Issue pro Zeile).
            4. Erzeuge für jede Gruppe genau EIN GitHub-Issue mit:
               - aussagekräftigem Titel (deutsch, kurz),
               - Body mit: Kontext, betroffene Dateien/Funktionen (mit Zeilennummern
                 aus todo.md), Akzeptanzkriterien und den daraus übernommenen
                 todo.md-Text.
            5. Nutze die GitHub API via $GITHUB_TOKEN (REST: POST /repos/{owner}/{repo}/issues).
            6. Duplizierte/bereits existierende Issues nicht neu anlegen – vorher
               bestehende Issues per API auflisten und Titel vergleichen.

            WICHTIG:
            - Verändere KEINE Dateien, committe NICHTS und erstelle KEINEN Pull Request.
            - Antworte am Ende mit einer Zusammenfassung der erstellten Issues
              (Nummer, Titel) und der übersprungenen Duplikate.
```

## Aktivierung (Zwei Optionen)

**Option A – Repository-Owner (empfohlen):** Kopiere den YAML-Block oben in
`.github/workflows/opencode-todo-issues.yml` und committe ihn direkt (Owner-Token
besitzt die `workflows`-Permission).

**Option B – App-Permission:** Trage in der GitHub-App-Konfiguration unter
*Permissions → Repository permissions* den Punkt **Workflows** auf *Read and write*
und installiere die App neu. Danach kann der Branch-Push mit der Datei wie gewohnt
erfolgen.
