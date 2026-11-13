# Integrationstester — EPIC-05

Underlag: `construction/code-generation/code-summary.md`.

Integrationen testas i riktig Electron med ett tillfälligt skript i `tests/.tmp/`, som är git-ignorerat. Skriptet skickar aldrig Enter i ett riktigt projekt.

1. **visinv:** Fortsätt-knapparna ska visas på intents med status in-flight. Claude-fliken ska starta, och dess status ska växla mellan "ledig" och "arbetar".
2. **aidlc-dash:**
   - `getGitStatus`, `gitFetch` och `getRemoteChanges` ska fungera mot GitHub.
   - `showRemoteFile` med `../package.json` ska avvisas.
3. **Tom mapp under `tests/.tmp/`:**
   - `getSetupInfo` ska ge en förhandsvisning med create- och conflict-antal.
   - `buildSetupCommand` ska ge `aidlc --project-dir . config --harness claude --yes`.
   - När `aidlc/spaces/default` skapas ska `project:detected` komma.

Resultat: se `test-results.md`.
