# Kodgenereringsplan — EPIC-01 Bridge Console MVP

## Summary

- Builds: Electron-appen aidlc-dash med projektflikar, intent-lista, pipeline, audit-tidslinje, bolt-DAG, artefaktläsare, liveuppdatering och inbäddade claude/skal-terminaler i ett återhållsamt LCARS-tema
- Touches: `package.json`, `electron.vite.config.mjs`, `electron-builder.yml`, `vitest.config.mjs`, `src/main/`, `src/preload/`, `src/renderer/`, `tests/`, `docs/features/epic-01-bridge-console-mvp.md`, `docs/FEATURES.md`, `README.md`
- Tests: ca 14 enhetstester med Vitest, 12 för parsrar och projektåtkomst i Node och 2 för intent-listans filtrering i jsdom

## Underlag

- Krav: `aidlc/spaces/default/intents/261113-bridge-console-mvp/inception/requirements-analysis/requirements.md`. FR1–FR10 motsvarar US-0101–US-0110, plus NFR1–NFR5.
- Feature-dokument: `docs/features/epic-01-bridge-console-mvp.md`, med acceptanskriterier och dataformat.
- Express-läge utan design-stages och units. Arkitekturen bestäms här i planen.

## Arkitektur i korthet

- **Huvudprocessen** (`src/main/`) äger all fil- och pty-åtkomst. `projectAccess.js` löser varje sökväg mot en öppnad projektrot och avvisar allt utanför den (FR10.2). Läsningen sker bara med `fs.promises.readFile`/`readdir`/`stat`, och inga skrivande fs-anrop finns i modulen (NFR4).
- **Parsrar** (`src/main/parsers/`) är rena funktioner från text till objekt. Det gör dem testbara utan Electron.
- **Preload** (`src/preload/index.js`) exponerar ett smalt `window.bridge`-API via `contextBridge`. Det är invoke-kanaler för läsning och pty samt event-prenumerationer (FR10.1).
- **Renderaren** (`src/renderer/`) är React med vanlig JavaScript (Q1). Varje projektflik har sin egen vy och terminalpanel (Q2, Q3).
- **Beroenden:** `electron`, `electron-vite`, `vite`, `@vitejs/plugin-react`, `react`, `react-dom`, `chokidar` (filbevakning), `node-pty`, `@xterm/xterm`, `@xterm/addon-fit`, `react-markdown` och `remark-gfm` (markdown utan rå HTML, vilket ger saneringen i FR6.4), `@fontsource/antonio` (lokalt typsnitt, FR9.2), `electron-builder`, `vitest`, `jsdom`, `@testing-library/react`.
- **DAG:en** ritas som handskriven SVG med en kolumn per batch, utan grafbibliotek (FR5.1).

## Testing Contract

```json
{
  "version": 1,
  "methodology": "test-after",
  "source": "org",
  "ordering": "implement each applicable testable layer, then write and run that layer's tests.",
  "scope": "express",
  "test_strategy": "minimal",
  "project_type": "greenfield",
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
    "runner_step": "Bootstrap the minimal test runner/configuration and record the exact unit-scoped command.",
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
      "Bootstrap the minimal test runner/configuration and record the exact unit-scoped command.",
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
  "input_sha256": "sha256:6cb23162168334768ff8f29699669845616670119c9eb58bf9bb05af6fefd3de",
  "contract_sha256": "sha256:283a836cf0757ed2efa4b5dd3135f3986eb59880b3017f4ba87a685cfebedfdb"
}
```

Lagret "Data model / database behavior" gäller inte här. Appen har ingen databas och är skrivskyddad, och dess datamodell är AI-DLC-filformatet som parsrarna i steg 5–6 hanterar.

## Steg

- [ ] **Steg 1 — Projektstruktur och produktionskonfiguration** (FR10.1, FR10.3)
  - `package.json` med `"main": "out/main/index.js"`, skripten `dev` (`electron-vite dev`), `build` (`electron-vite build && electron-builder --mac`), `test` och `postinstall` (`electron-builder install-app-deps` som bygger om node-pty för Electron).
  - `electron.vite.config.mjs` för main, preload och renderer (React-plugin). `node-pty` och `chokidar` är externa i main.
  - `src/main/index.js` skapar ett `BrowserWindow` med `contextIsolation: true`, `nodeIntegration: false` och `sandbox: true`. Navigering och `window.open` blockeras, och CSP sätts i `index.html`.
  - `src/preload/index.js` sätter upp ett tomt `window.bridge`-skelett.
  - `src/renderer/index.html`, `src/renderer/main.jsx` och `src/renderer/App.jsx` som tomt skal.
  - Installera beroendena ovan med `npm install`.

- [ ] **Steg 2 — Testkörare** (FR10.5)
  - `vitest.config.mjs` med miljön `node` som standard och `jsdom` för `tests/renderer/**`.
  - Kommando: `npx vitest run tests/` (se `unit-test-instructions.md`).
  - Fixtures under `tests/fixtures/project/` med en kopia av en verklig AI-DLC-struktur från `~/Projects/visinv`:
    - `aidlc/active-space`
    - `intents.json`, med ett extra id som saknar mapp
    - två intent-mappar, varav den ena (`261110-epic02-finish`) har en `runtime-graph.json` med `bolt_dag`
    - `aidlc-state.md`
    - `project-description.json`
    - en nedkortad audit-fil döpt till `machine-a.md` och en andra audit-fil `machine-b.md`, för sammanslagning
    - en artefakt-`.md`
    - en intent-mapp som saknas i `intents.json` och saknar `runtime-graph.json`
  - Inga maskinnamn eller hemligheter följer med i fixtures. Beställningstexterna kortas ner.

- [ ] **Steg 3 — Projektåtkomst (repository-lager), implementera** (FR1.2, FR1.3, FR10.2, NFR4)
  - `src/main/projectAccess.js`: `openRoot(path)`, `resolveInRoot(root, rel)` som kastar fel vid `..`, absoluta sökvägar och symlänkar ut ur roten (via `fs.realpath`), samt `readText`, `readJsonSafe` (returnerar `{ok:false}` vid ogiltig JSON i stället för att kasta, FR7.4) och `listDir`.
  - `src/main/projectService.js`: `detectProject(root)` (`aidlc/spaces/` och `active-space`, annars `{isAidlc:false, reason}`), `listSpaces`, `loadIntentList(root, space)` och `loadIntentDetail(root, space, dirName)`. Vid parsningsfel returnerar den tidigare giltiga cachen per intent (FR7.4, NFR2).

- [ ] **Steg 4 — Projektåtkomst, skriv och kör tester**
  - `tests/main/projectAccess.test.js`:
    - en sökväg inom roten löses
    - `../` och en absolut sökväg utanför roten avvisas (FR10.2)
    - `readJsonSafe` på trasig JSON ger `ok:false` utan att kasta (FR7.4)
  - `tests/main/projectService.test.js`:
    - fixture-projektet känns igen med space `default` (FR1.2)
    - en vanlig mapp ger `isAidlc:false`
  - Kör `npx vitest run tests/main/projectAccess.test.js tests/main/projectService.test.js`.

- [ ] **Steg 5 — Parsrar och sammanslagning (affärslogik), implementera** (FR2, FR3, FR4, FR5)
  - `src/main/parsers/intents.js`: slår ihop `intents.json` med mapplistningen. Sorterar nyast först efter datumprefixet i `dirName`, markerar `missingOnDisk`/`missingInIndex` (FR2.1, FR2.5) och markerar `active` (FR2.3).
  - `src/main/parsers/state.js`: tolkar `aidlc-state.md`. Tar ut Project Information, Scope Configuration (Depth, Test Strategy) och stage-checkboxar per fas med status (`[ ]` ej startad, `[-]` pågår, `[?]` väntar, `[R]` revideras, `[x]` klar, `[S]` överhoppad) och `EXECUTE`/`SKIP` (FR3.1, FR3.2).
  - `src/main/parsers/runtimeGraph.js`: stages med agent, tider, varaktighet och utfall, plus `bolt_dag`.
  - `src/main/parsers/audit.js`: tolkar `## Titel`-block avgränsade av `---` till `{timestamp, event, title, fields, source}`. Okända typer och fält behålls (FR4.1, FR4.6). Flera filer slås ihop sorterade på tidsstämpel, och ordningen är stabil vid lika tider (FR4.2). `categoryOf(event)` ger kategorierna stage, subagent, gate, human, unit, error, guard och other (FR4.3). `NOISY_EVENTS` innehåller `GUARD_DISABLED`, `SENSOR_PASSED`, `SENSOR_FIRED` och `GUARD_STOOD_ASIDE` (FR4.4).
  - `src/main/parsers/pipeline.js`: `mergePipeline(state, graph)`. State-filen vinner, och avvikelser markeras med `mismatch:true`. Utan graph används bara state (FR3.4, FR3.5). Ger också antal klara och antal körda stages (FR2.2).
  - `src/main/parsers/units.js`: `unitStatuses(dag, events)` sätter `pending`/`running`/`done` från `UNIT_STARTED`/`UNIT_COMPLETED` (FR5.2).

- [ ] **Steg 6 — Parsrar, skriv och kör tester**
  - `tests/main/parsers.test.js`:
    - intent-listan sorteras nyast först och markerar intents som saknas i index eller på disk (FR2.1, FR2.5)
    - state-parsern ger depth, test strategy och rätt status för varje checkbox-typ (FR3.1, FR3.2)
    - `mergePipeline` låter state vinna och markerar avvikelser (FR3.4)
    - `mergePipeline` fungerar utan graph (FR3.5)
    - audit-parsern behåller okända händelsetyper och fält (FR4.1, FR4.6)
    - två audit-filer slås ihop i tidsordning (FR4.2)
    - `unitStatuses` på epic02-DAG:en ger rätt status per unit (FR5.2)
  - Kör `npx vitest run tests/main/parsers.test.js`.

- [ ] **Steg 7 — IPC-API, bevakning och pty (API-lager), implementera** (FR1, FR6.3, FR7, FR8, FR10.1)
  - `src/main/ipc.js` registrerar invoke-kanalerna:
    - `project:pick` (dialog), `project:open`, `project:close`
    - `project:spaces`, `project:intents`, `project:intent`, `project:file`
    - `shell:reveal`, `shell:openInEditor` (`shell.showItemInFolder` och `shell.openPath`, bara för sökvägar inom roten)
    - `settings:get`, `settings:set`
    - `pty:spawn`, `pty:write`, `pty:resize`, `pty:kill`

    Varje anrop validerar `projectId` och relativa sökvägar via `projectAccess`.
  - `src/main/settings.js` sparar senaste och öppna projekt i `app.getPath('userData')/settings.json`. Det är appens egen fil och ingen AI-DLC-fil (FR1.5).
  - `src/main/watcher.js` startar en chokidar-instans per öppet projekt på `aidlc/spaces/<space>/intents/`. `.aidlc-engine/**` ignoreras utom `active-directive.json`. Ändringar debouncas 300 ms per intent, och `project:changed {projectId, dirNames}` skickas till renderaren (FR7.1, FR7.2).
  - `src/main/pty.js` startar via node-pty `process.env.SHELL || /bin/zsh` med `-l -c claude` eller `-l`, med `cwd` = projektroten och full `process.env`. Data och exit skickas som `pty:data`/`pty:exit`, och alla sessioner för en `projectId` dödas vid `project:close` (FR8.1, FR8.2, FR8.6, FR8.7).
  - `src/preload/index.js` exponerar varje kanal som en egen funktion på `window.bridge`, utan generisk `invoke`.

- [ ] **Steg 8 — API-lager, skriv och kör tester**
  - `tests/main/watcher.test.js`: en ändring i en intents fil ger efter debounce exakt ett `changed`-anrop med just det `dirName`, och skrivningar under `.aidlc-engine/` ignoreras (FR7.1, FR7.2).
  - Kör `npx vitest run tests/main/watcher.test.js`.
  - Pty och dialog kräver Electron och testas manuellt i Build and Test (se `unit-test-instructions.md`).

- [ ] **Steg 9 — Gränssnitt (frontend), implementera** (FR1–FR9)
  - `src/renderer/App.jsx`: projektflikar med lägg till via mappväljare, stäng och byt. Öppna flikar återställs vid start (FR1.1, FR1.4, FR1.5).
  - `src/renderer/ProjectView.jsx`: space-väljare, ett meddelande om mappen inte är ett AI-DLC-projekt, intent-lista och detaljvy (FR1.2, FR1.3).
  - `src/renderer/IntentList.jsx`: filtrering på status och scope, fritextsökning, markering av aktiv intent och märken för intents som saknas i index eller på disk. Statusen visas både som text och som färg (FR2, FR9.3).
  - `src/renderer/IntentDetail.jsx` med flikarna Pipeline, Timeline, Units och Files:
    - `Pipeline.jsx`: faser och stages med status, agent, tider och varaktighet. Överhoppade stages tonas ned, den aktuella pulserar och avvikelser markeras (FR3).
    - `Timeline.jsx`: färgkodade händelser med kategorietikett. Brusfiltret är på som standard, och det går att filtrera på typ och stage. Ett klick visar fälten, och nya händelser framhävs kort (FR4, FR7.3).
    - `BoltDag.jsx`: SVG med batch-kolumner, pilar för `depends_on` och noder med namn, typ och status som text och färg. Saknas DAG visas en förklaring (FR5).
    - `ArtifactReader.jsx`: fillista per stage, `react-markdown` med `remark-gfm` utan `rehype-raw` för markdown och formaterad JSON. Knappar för "Visa i Finder" och "Öppna i editor" (FR6).
  - `src/renderer/TerminalPanel.jsx`: xterm med fit-addon och flikarna "claude" och "shell" per projekt. Panelen kan visas, döljas och ändras i storlek, och terminalerna monteras inte om vid vybyten. Snabbknapparna infogar `/aidlc --status`, `/aidlc --doctor` och `/aidlc continue` utan Enter, och en omstartsknapp visas vid exit (FR8).
  - `src/renderer/useProject.js`: hook som laddar data och lyssnar på `project:changed` för att ladda om berörda intents. En live-indikator visas när en intent är in-flight (FR7.3).
  - `src/renderer/theme.css`:
    - CSS-variabler för en nästan svart bakgrund, elbow-paneler (rundade hörn och sidobalkar), amber/orange-, lavendel-, blå- och röd accent
    - Antonio från `@fontsource/antonio` för rubriker, systemets sans-serif för brödtext och monospace för terminalen
    - minst 4,5:1 kontrast för brödtext och fokusmarkeringar på alla kontroller
    - `@media (prefers-reduced-motion: reduce)` stänger av animationer
    - inga varumärken eller logotyper (FR9, NFR3)
  - `data-testid` på alla interaktiva element.

- [ ] **Steg 10 — Gränssnitt, skriv och kör tester**
  - `tests/renderer/IntentList.test.jsx`: fritextsökning och statusfilter ger rätt rader (FR2.4), och statusen syns som text (FR9.3).
  - Kör `npx vitest run tests/renderer/IntentList.test.jsx`.

- [ ] **Steg 11 — Bygg- och miljökonfiguration** (FR10.3, FR10.4)
  - `electron-builder.yml`: `appId`, macOS-target `dmg` och `dir`, `identity: null` (osignerad, Q4) och `asarUnpack` för node-pty.
  - `.gitignore` utökas med `node_modules/`, `out/` och `dist/`. Det är den enda ändringen i en befintlig fil som behövs för att bygga.

- [ ] **Steg 12 — Dokumentation och spårbarhet**
  - `README.md`: kompletteras med avsnitten "Kom igång" (`npm install`, `npm run dev`, `npm run build`, `npx vitest run tests/`) och "Säkerhet" (skrivskyddad, bara åtkomst inom projektroten). Den befintliga visionen behålls.
  - `docs/features/epic-01-bridge-console-mvp.md`:
    - status 🚧 Byggd per story och bockade acceptanskriterier för det som byggts
    - US-0101 och US-0108 uppdaterade med besluten Q3 (flikar) och Q2 (claude- och skalflik)
    - en statusrad för epicen
  - `docs/FEATURES.md`: statusen för EPIC-01 uppdateras.
  - `code-summary.md` och `traceability.json` i stage-katalogen.

- [x] **Steg 13 — Auctum-profilering** (önskemål från användaren 2026-11-13: "brand it with Auctum … the new one", "Call it Auctu AIDLC Coltrol or soething. the logo should be on a splash screen and on the interface"; utvidgar US-0109)
  - Namn: **Auctum AIDLC Control**. Det ska stå i `productName` i `package.json` och `electron-builder.yml` (`appId: se.auctum.aidlc-control`), i fönstertiteln (`src/main/index.js`), i `<title>` i `src/renderer/index.html` och i sidhuvudet, där det ersätter "BRIDGE CONSOLE".
  - Logga: den nya geometriska loggan från `~/Projects/visinv/public/auctum.svg`. Använd inte de äldre varianterna i `public/logos/`. Den kopieras som en React-komponent `src/renderer/AuctumMark.jsx` med samma två paths och viewBox `202 274 848 708`, `fill="currentColor"` och `role="img"` + `aria-label="Auctum"`, så att färgen följer temat.
  - Startskärm: `src/renderer/Splash.jsx` visas när appen startar. Den visar loggan (stor, i amber), namnet och en diskret laddrad. Den döljs när flikarna har återställts, dock tidigast efter 900 ms och senast efter 4 s, och tonar ut. Med `prefers-reduced-motion` visas den utan animation. `data-testid="splash"`.
  - Gränssnitt: liten logga och namnet i sidhuvudet (`App.jsx`). Loggan används också i tomläget "Inget projekt öppet".
  - Test: `tests/renderer/Splash.test.jsx` (jsdom) kontrollerar att startskärmen visar loggan (role img med namnet "Auctum") och texten "Auctum AIDLC Control", och att den försvinner när `ready` blir sann efter minimitiden.
  - Kör `npx vitest run tests/` och `npx electron-vite build`.
  - Dokumentation: README:s rubrik och inledning, ett nytt acceptanskriterium för Auctum-profilering i US-0109 och `docs/FEATURES.md`.

## Spårbarhet steg → story

| Steg | Story / krav |
|------|--------------|
| 1, 11 | US-0110 (FR10.1, FR10.3, FR10.4) |
| 2 | US-0110 (FR10.5) |
| 3–4 | US-0101 (FR1.2, FR1.3), US-0110 (FR10.2), US-0107 (FR7.4) |
| 5–6 | US-0102, US-0103, US-0104, US-0105 |
| 7–8 | US-0101 (FR1.1, FR1.5), US-0106 (FR6.3), US-0107, US-0108 |
| 9–10 | US-0101–US-0109 (gränssnitt) |
| 12 | Begränsningen att feature-dokumentet ska uppdateras |
