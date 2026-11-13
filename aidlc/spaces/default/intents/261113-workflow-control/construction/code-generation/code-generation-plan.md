# Kodgenereringsplan — EPIC-05 Workflow Control

Underlag:
- `inception/requirements-analysis/requirements.md` (FR1–FR4, NFR1–NFR3)
- kodbaskunskapen `aidlc/spaces/default/codekb/aidlc-dash/`

Express, Minimal, inga enheter. Inga nya beroenden.

## Princip

Appens egen process kör bara läsande kommandon med fasta argument. Den använder `execFile` utan skal, med timeout och PATH från inloggningsskalet. Allt som ändrar arbetsträdet skrivs i en synlig terminalflik. Bara bytet av intent i US-0501 skickas med Enter (Q1: C). `projectAccess.js` får inga skrivanrop.

## Steg

- [x] **Steg 1 — Gemensam körning av externa kommandon** (NFR1)
  - Ny fil `src/main/exec.js`. Flytta `defaultExec` och `loginPath` ur `src/main/models.js` hit och exportera `runFixed(file, args, { cwd, timeout, exec })`. Funktionen avvisar argument som inte är strängar, använder PATH från inloggningsskalet och har timeout 10 s som standard.
  - `src/main/models.js` importerar från `exec.js`. Beteendet ändras inte, och `tests/main/configuredModels.test.js` ska vara grönt utan ändringar.

- [x] **Steg 2 — Läsande git** (FR3.1–FR3.5, FR3.8)
  - Ny fil `src/main/git.js`. Alla funktioner tar `root` och en injicerbar `exec`.
  - **`getGitStatus(root)`:** samlar repo-status. Det görs med `git rev-parse --is-inside-work-tree`, gren via `git rev-parse --abbrev-ref HEAD` och upstream via `git rev-parse --abbrev-ref --symbolic-full-name @{u}`. Saknas upstream används `origin/main` om det finns, annars `null`. `ahead`/`behind` läses med `git rev-list --left-right --count HEAD...<ref>`, och `git status --porcelain` delas upp i `aidlc/` och övrigt. Funktionen returnerar `{ isRepo, branch, upstream, ahead, behind, dirtyAidlc, dirtyOther }`.
  - **`fetchRemote(root)`:** `git fetch --quiet` med timeout 30 s.
  - **`getRemoteChanges(root, ref)`:** antal commits som berör `aidlc/` (`git rev-list --count HEAD..<ref> -- aidlc/`), ändrade filer (`git diff --name-only HEAD...<ref>`) uppdelade på `aidlc/` och övrigt (FR3.3, Q4: A), samt fjärrens `intents.json` (`git show <ref>:aidlc/spaces/<space>/intents/intents.json`). Den jämförs med den lokala listan för att få nya intents. Antalet nya audit-filrader räknas ur `git diff --numstat HEAD...<ref> -- aidlc/`.
  - **`showRemoteFile(root, ref, rel)`:** `git show <ref>:<rel>`. `rel` måste börja med `aidlc/` och får inte innehålla `..`. `ref` måste vara den upstream eller det `origin/main` som `getGitStatus` gav.
  - **`listConflicts(root)`:** `git diff --name-only --diff-filter=U`.
  - Rena tolkningsfunktioner (`parseRevCount`, `splitPorcelain`, `diffIntents`) exporteras för test. Ett argument som börjar med `-` avvisas.

- [x] **Steg 3 — Förutsättningar för att initiera AI-DLC** (FR4.2, FR4.3, FR4.5)
  - Ny fil `src/main/setup.js`. Funktionen `getSetupInfo(root, { exec })` hämtar:
    - **AI-DLC:** `aidlc --version`. Saknas kommandot blir resultatet `{ installed: false }`.
    - **Git:** om mappen är ett git-repo.
    - **Andra harnesses:** vilka av `.kiro`, `.codex`, `.cursor` och `.aidlc` som finns (via `listDir` i `projectAccess`).
    - **Förhandsvisning:** `aidlc config --harness claude --dry-run`. Utskriften visas rå, och `create=`, `update=` och `conflict=` tolkas om de finns.
    - **Plugins:** ur `aidlc config project --show --json`. Om kommandot misslyckas blir listan tom med en varning.
  - Resultatet är `{ aidlc: { installed, version }, git: { isRepo }, harnesses: [], preview: { raw, create, update, conflict, conflicts: [] }, plugins: [], presets: ['thorough','balanced','minimal'] }`.
  - Funktionen `buildSetupCommand({ needsGit, plugins, preset })` bygger kommandokedjan med `&&` (FR4.4, FR4.5):
    - `needsGit` lägger till `git init -b main` först.
    - Grundkommandot är alltid `aidlc config --harness claude --yes`.
    - Pluginnamn valideras mot den hämtade listan och mot `^[a-z0-9-]+$`, och läggs till som `aidlc config project --plugins <a,b> --yes`.
    - `preset` måste vara ett av de tre värdena och läggs till som `aidlc config models --preset <p> --project --yes`.

- [x] **Steg 4 — Upptäck AI-DLC efter uppsättning** (FR4.6)
  - I `src/main/watcher.js` läggs `watchForAidlc({ root, onFound, onError })` till. Den bevakar `root` med chokidar, `depth: 2` och ett `ignored`-filter som bara släpper igenom `aidlc/` och `aidlc/spaces/`. När `aidlc/spaces` dyker upp anropas `onFound` en gång.
  - I `src/main/ipc.js`:
    - **Inte AI-DLC-projekt:** `project:open` startar `watchForAidlc` för projekt som inte är AI-DLC-projekt. När den slår till körs `detectProject` igen, `watchSpace` startas och `project:detected` skickas med `{ projectId, detection }`. `project:close` stänger även den här bevakningen.
    - **Nya IPC-kanaler:**
      - `git:status`, `git:fetch`, `git:remoteChanges`
      - `git:showRemote`, `git:conflicts`
      - `setup:info`, `setup:command`
  - `src/preload/index.js` får `getGitStatus`, `gitFetch`, `getRemoteChanges`, `showRemoteFile`, `getConflicts`, `getSetupInfo`, `buildSetupCommand` och `onProjectDetected`.

- [x] **Steg 5 — Terminalstyrning och ledig-signal** (FR1.1–FR1.4)
  - Ny fil `src/renderer/terminalControl.js` med rena funktioner:
    - `createActivity({ quietMs = 1500, now, schedule })`: håller `idle | busy | exited`. `onData()` sätter `busy` och startar en tystnadstimer som sätter `idle`, `onExit()` sätter `exited`, och `subscribe(fn)` meddelar ändringar.
    - `waitFor(activity, state, timeoutMs)`: ett promise som löses när tillståndet nås och avvisas efter timeout.
    - `runSequence(term, steps)`: kör steg av typen `{ text, submit }` i ordning. Före varje steg väntar den på `idle`. Efter ett steg med `submit` väntar den först på `busy` (högst 3 s) och sedan på `idle`.
  - Ny fil `src/renderer/TerminalContext.jsx`. `TerminalProvider` per projekt och `useTerminal()` ger `type(tab, text, { submit })`, `sequence(tab, steps)`, `state(tab)`, `show(tab)` och `restart(tab)`. När en flik har status `exited` startas den först, och skrivandet väntar sedan på första `idle`. Efter 20 s utan svar visas felet "Claude svarade inte inom 20 s" (FR1.3).
  - `src/renderer/TerminalPanel.jsx`:
    - **Registrering:** varje `TermSession` registrerar sig i kontexten med `write`, `spawn` och `activity`. `onPtyData` matar `activity.onData()` och `onPtyExit` matar `onExit()`.
    - **Visa och fokusera:** panelens öppna och aktiva flik styrs från kontexten, så att `show(tab)` öppnar panelen och fokuserar fliken (FR1.4).
    - **Snabbkommandon:** använder `type('claude', cmd, { submit: false })`. Beteendet är detsamma som förut.
    - **Statusetikett:** en liten text på varje flik, "ledig", "arbetar" eller "avslutad".
  - `src/renderer/ProjectView.jsx`: `TerminalProvider` omsluter både projektvyn och `TerminalPanel`.

- [x] **Steg 6 — Knappen "Fortsätt"** (FR2.1–FR2.6)
  - Ny fil `src/renderer/ResumeButton.jsx`. Den tar `intent` (med `status` och `dirName`), `activeDirName` och `pipeline` (aktuellt stage-namn, steg och totalt antal) och visas bara när `status === 'in-flight'`.
    - **Etikett:** "Fortsätt vid <stage> (steg n av m)", eller bara "Fortsätt" när pipelinedata saknas.
    - **Klick på den aktiva intenten:** `type('claude', '/aidlc', { submit: false })`.
    - **Klick på en annan intent:** `sequence('claude', [{ text: '/aidlc intent <dirName>', submit: true }, { text: '/aidlc', submit: false }])`.
    - **Claude arbetar:** är claude-fliken `busy` skrivs inget, och appen visar "Claude arbetar — vänta eller avbryt först" med `role="status"`.
    - **Övrigt:** `data-testid="intent-resume"`, och knappen fungerar med tangentbordet.
  - `src/renderer/IntentList.jsx` och `src/renderer/IntentDetail.jsx` visar knappen. `active-intent` finns redan i detection/useProject och skickas vidare. Om det saknas läses det ur `intents.json` (fältet `active`).

- [x] **Steg 7 — Uppdatera från GitHub** (FR3.2–FR3.8)
  - Ny fil `src/renderer/RefreshPanel.jsx`, med en hopfällbar panel i sidofältet under kostnadspanelen.
    - **Uppdatera:** knappen "Uppdatera" kör `gitFetch`, `getGitStatus` och `getRemoteChanges`. Ingen automatisk hämtning görs (Q3: C).
    - **Status:** gren, upstream, före/efter, ändringar som inte är committade (`aidlc/` och övrigt) och om AI-DLC arbetar. AI-DLC räknas som arbetande när claude-fliken är `busy` eller `active-directive.json` har ändrats under de senaste 5 minuterna. Det senare tas från watcherns senaste ändringstid, som `useProject` redan får.
    - **Märke:** "N nya ändringar i AI-DLC på <ref>", plus en rad om övriga filer.
    - **"Visa":** nya intents från fjärren märkta "på GitHub", ändrade filer under `aidlc/` och antal nya audit-rader. En fil under `aidlc/` på fjärren kan öppnas skrivskyddat med `showRemoteFile` och visas med den befintliga markdown-renderingen i `ArtifactReader`.
    - **"Hämta in":** visar valet Rebase eller Merge, med en mening om vart och ett (Q2: C). Det valda kommandot skrivs i shell-fliken utan Enter. På en annan gren än `main` finns också "Uppdatera från main" med samma val: `git fetch && git rebase origin/main` eller `git fetch && git merge origin/main`.
    - **Avstängt:** "Hämta in" och "Uppdatera från main" är avstängda medan AI-DLC arbetar, med texten "Vänta tills AI-DLC-steget är klart eller parkera arbetet först" (FR3.7).
    - **Konflikter:** knappen "Visa konflikter" hämtar `getConflicts`. För `intents.json` och `aidlc-state.md` visas en kort vägledning, och `git rebase --abort` eller `git merge --abort` föreslås som text. Det kommandot kan skrivas i shell-fliken utan Enter.
    - **Fel:** ett fel visas i panelen med en mening, och den gemensamma bannern används inte (NFR2). "Inte ett git-repo" och "ingen fjärr" ger en förklaring i stället för knapparna.

- [x] **Steg 8 — Initiera AI-DLC** (FR4.1–FR4.8)
  - Ny fil `src/renderer/SetupAidlc.jsx`. Den ersätter innehållet i rutan `project-not-aidlc` i `ProjectView.jsx` och behåller förklaringen och sökvägen.
    - **Förutsättningar:** knappen "Initiera AI-DLC" visar förutsättningarna ur `getSetupInfo`. Saknas `aidlc` visas länken `https://github.com/awslabs/aidlc-workflows` med en mening, och flödet stannar. Saknas git visas att `git init -b main` läggs först.
    - **Förhandsvisning:** visas med create, update och conflict. Vid konflikter listas de, och "Initiera" är avstängd.
    - **Avancerade inställningar:** en hopfälld sektion (`<details>`) med kryssrutor för plugins och en radiogrupp för modellnivå. "Standard (ingen förinställning)" är förvalt, och varje förinställning har en rad beskrivning.
    - **"Initiera":** kör `buildSetupCommand` och skriver kedjan i shell-fliken utan Enter. Fliken visas och får fokus.
    - **Efter uppsättningen:** `useProject` och `App` lyssnar på `onProjectDetected` och byter projektets `detection`, så att samma flik visar projektvyn. Claude-fliken startas om (`restart('claude')`) med meddelandet "Claude startas om så att AI-DLC laddas". Därefter visas en rad med "Kör /aidlc --doctor" (`/aidlc --doctor`) och "Starta första arbetet" (`/aidlc `). Båda skrivs i claude-fliken utan Enter.
    - **Fel:** om skal-fliken avslutas med en annan kod än 0 utan att AI-DLC har dykt upp, visar appen "Uppsättningen misslyckades — se terminalen. Kör `aidlc doctor` för att se vad som saknas." Inget tas bort.
  - `src/renderer/App.jsx` uppdaterar projektets `detection` vid `project:detected`.
  - `src/renderer/theme.css`: stilar för Fortsätt-knappen, panelen för GitHub-uppdatering, uppsättningsdialogen och flikstatus. Stilarna följer de befintliga LCARS-variablerna.

- [x] **Steg 9 — Tester** (se `unit-test-instructions.md`)
  - `tests/main/git.test.js` (4):
    - status med upstream och ändringar uppdelade på `aidlc/` och övrigt
    - fallback till `origin/main` och ingen fjärr
    - fjärrändringar med nya intents
    - `showRemoteFile` avvisar sökvägar utanför `aidlc/` och argument som börjar med `-`
  - `tests/main/setup.test.js` (3):
    - aidlc saknas
    - förhandsvisning med konflikter
    - `buildSetupCommand` med standardval, med git, plugins och förinställning, och med ogiltiga plugins som avvisas
  - `tests/main/watcher.test.js` (+1): `watchForAidlc` anropar `onFound` en gång när `aidlc/spaces` skapas.
  - `tests/renderer/terminalControl.test.js` (3):
    - `idle` efter tystnad och `busy` vid data
    - `runSequence` väntar på `idle` mellan stegen och skickar Enter bara för steg med `submit`
    - timeout ger fel
  - `tests/renderer/ResumeButton.test.jsx` (3):
    - aktiv intent: `/aidlc` skrivs utan Enter
    - annan intent: sekvensen med bytet först
    - `busy`: inget skrivs och meddelandet visas. Ingen knapp för `complete`.
  - `tests/renderer/RefreshPanel.test.jsx` (2):
    - märket och valet Rebase/Merge skriver rätt kommando i shell-fliken utan Enter
    - avstängd medan AI-DLC arbetar
  - `tests/renderer/SetupAidlc.test.jsx` (2):
    - kommandokedjan utan avancerade val
    - "Initiera" är avstängd vid konflikter och när aidlc saknas
  - Kör de nya testerna och sedan hela sviten `npx vitest run tests/` (39 tidigare plus ungefär 18 nya).

- [x] **Steg 10 — Bygge och dokument**
  - `npx electron-vite build` ska gå igenom.
  - `docs/features/epic-05-workflow-control.md`:
    - US-0501–US-0503 får status 🚧 Byggd, ej releasad, och byggda kriterier bockas av.
    - De öppna frågorna i US-0502 ersätts med besluten: hämtning bara manuellt, Rebase eller Merge väljs varje gång, och ramverket hanteras i US-0504.
    - US-0504 läggs till: "Update the AI-DLC framework from the console" 📋 Planned. Den visar en ny `aidlc`-version och ändrade `.claude/`-filer och skriver `aidlc update` eller `aidlc config` i terminalen.
  - `docs/FEATURES.md`: raden för EPIC-05 uppdateras.

- [x] **Steg 11 — Rättelser F-01 och F-02 från Build and Test** (Loop-back 1. Användaren valde "Retry with fix". Gäller FR1.2, FR2.2, FR2.3, FR4.3 och FR4.4)
  - **F-01:** ny fil `scripts/fix-pty-perms.cjs`. Skriptet går igenom `node_modules/node-pty/prebuilds/*/spawn-helper` och sätter körrättighet med `fs.chmodSync(p, 0o755)`, utan externa kommandon. Saknas mappen gör skriptet ingenting och avslutas med exit 0. `package.json` får `"postinstall": "node scripts/fix-pty-perms.cjs"`. Om det redan finns en `postinstall` kedjas skriptet på med `&&`. Kör sedan `npm run postinstall` lokalt. Testet `tests/main/ptyPerms.test.js` ger skriptets funktion en tillfällig mapp med en fil utan körrättighet och kontrollerar att filen får körrättighet efteråt.
  - **F-02:** i `src/main/setup.js`:
    - förhandsvisningen körs med fasta argument: `['--project-dir', root, 'config', '--harness', 'claude', '--dry-run']`, där `root` är den öppnade projektroten
    - `buildSetupCommand` skriver `aidlc --project-dir . config --harness claude --yes`
    - `parsePreview` tolkar också `merge=`, `preserve=` och `remove=`, och rader som börjar med `Note:` blir `notes[]`
    - `SetupAidlc.jsx` visar notes som en varning
  - Uppdatera `tests/main/setup.test.js` och `tests/renderer/SetupAidlc.test.jsx` för de nya argumenten och kommandot. Den riktiga utskriften `config plan for <dir>: create=360 update=0 merge=0 preserve=1 remove=0 conflict=0` används som testdata.
  - Kör `npx vitest run tests/` och `npx electron-vite build`.

## Spårbarhet

| Krav | Steg |
|------|------|
| FR1.1–FR1.4 | 5 |
| FR2.1–FR2.6 | 5, 6 |
| FR3.1 | 1, 2 |
| FR3.2–FR3.8 | 2, 4, 7 |
| FR3.9 | 10 |
| FR4.1–FR4.5 | 3, 4, 8 |
| FR4.6–FR4.8 | 4, 8 |
| NFR1 | 1, 2, 3 |
| NFR2 | 7, 8 |
| NFR3 | 5, 9 |
## Testing Contract

```json
{
  "version": 1,
  "methodology": "test-after",
  "source": "org",
  "ordering": "implement each applicable testable layer, then write and run that layer's tests.",
  "scope": "express",
  "test_strategy": "minimal",
  "project_type": "brownfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nBuild and Test verifies defined coverage floors and affirmed quality targets;\nthey may not be weakened to make a step pass.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    }
  ],
  "obligations": {
    "strategy": "minimal",
    "strategy_volume": [
      "One verifiable test per requirement at the narrowest effective level.",
      "At least one happy-path unit test per component.",
      "Unit tests are the default; a bugfix/security scope floor may require an integration or E2E regression when that is the narrowest level that reproduces the defect."
    ],
    "scope_floor": [
      "Keep the existing test suite green.",
      "This scope adds no extra new-test floor beyond the selected test strategy."
    ],
    "combination_rule": "Apply every selected-strategy obligation and every scope-floor obligation; neither replaces the other, and a targeted scope regression may add the narrowest necessary test type beyond the strategy default."
  },
  "plan_profile": {
    "methodology": "test-after",
    "runner_step": "Verify the existing test runner/configuration and record the exact unit-scoped command.",
    "runner_ready_before_first_test": true,
    "testable_layers": [
      "Data model / database behavior",
      "Repository / data access",
      "Business logic",
      "API / endpoint",
      "Frontend behavior"
    ],
    "steps": [
      "Project structure and production configuration skeleton.",
      "Verify the existing test runner/configuration and record the exact unit-scoped command.",
      "Data model / database behavior - implement.",
      "Data model / database behavior - write and run its tests after implementation.",
      "Repository / data access - implement.",
      "Repository / data access - write and run its tests after implementation.",
      "Business logic - implement.",
      "Business logic - write and run its tests after implementation.",
      "API / endpoint - implement.",
      "API / endpoint - write and run its tests after implementation.",
      "Frontend behavior - implement.",
      "Frontend behavior - write and run its tests after implementation.",
      "Environment/build configuration.",
      "Documentation and traceability."
    ]
  },
  "input_sha256": "sha256:c8f84e35190e007d9863fad236154d0269ab9bf633fc2a3ff106ed965ba4a9b9",
  "contract_sha256": "sha256:bb76c1b22f8307be6e5780d50cabab891684449d5b164bd0e825e9e4e5c61e5b"
}
```
