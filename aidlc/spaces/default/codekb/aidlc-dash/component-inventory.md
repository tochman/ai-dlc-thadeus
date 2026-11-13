# Komponentinventering: aidlc-dash

Detta är den enda förteckningen över komponenter; övriga artefakter hänvisar hit.

## Main-process (`src/main/`)

### main-entry
`src/main/index.js`. Skapar fönstret med säkra webPreferences, blockerar navigering och nya fönster, behåller userData-mappen `aidlc-dash`, registrerar IPC och stänger ner vid avslut. Beror på: ipc.

### ipc
`src/main/ipc.js`. Hela IPC-ytan (se `api-documentation.md`). Håller `projects`-kartan `projectId → {root, space, watcher, sender}` och startar om bevakningen när space byts. Beror på: projectAccess, projectService, settings, watcher, pty.

### projectAccess
`src/main/projectAccess.js`. Skrivskyddad, rotbegränsad filåtkomst: `openRoot`, `resolveInRoot`, `readText`, `readJsonSafe` (kastar aldrig), `listDir`, `exists`. Beror på: `node:fs`.

### projectService
`src/main/projectService.js`. `detectProject`, `listSpaces`, `loadIntentList` (inkrementell via `onlyDirs`), `loadIntentDetail` (state, graph, pipeline, audit, units, direktiv, artefaktlista). Cachar per root/space/intent och returnerar senaste giltiga data vid fel. Beror på: projectAccess, parsers.

### watcher
`src/main/watcher.js`. `watchIntents` med chokidar över en space:s `intents/`; ignorerar `.aidlc-engine/` utom `active-directive.json`; debounce 300 ms, max 800 ms; rapporterar `{dirNames, indexChanged}`. Beror på: chokidar.

### pty
`src/main/pty.js`. Terminalsessioner via node-pty i projektroten (`$SHELL -l -i -c claude` eller `$SHELL -l`), clamping av storlek, avslut per projekt eller alla. Beror på: node-pty.

### settings
`src/main/settings.js`. Läser/skriver `userData/settings.json` (`openProjects`, `recentProjects`, `activeProject`, max 50 poster). Appens enda skrivning. Beror på: electron `app`, `node:fs`.

### parsers
`src/main/parsers/`. Rena funktioner:
- `state.js`: `parseState` för `aidlc-state.md` (sektioner med `- **Nyckel**: värde`, fas-checkboxar `[ ] [-] [?] [R] [x] [S]`).
- `audit.js`: `parseAudit`, `mergeAudits` (stabil sortering på Timestamp), `categoryOf`, `NOISY_EVENTS`.
- `runtimeGraph.js`: `parseRuntimeGraph` (stages med agent, tider, utfall, sensorantal; `bolt_dag`).
- `intents.js`: `mergeIntents` (index mot disk, saknas-flaggor, datum från mappnamn).
- `pipeline.js`: `mergePipeline` (state vinner, avvikelseflagga, klara/körda).
- `units.js`: `unitStatuses` från `UNIT_STARTED`/`UNIT_COMPLETED`.

## Preload (`src/preload/`)

### preload-bridge
`src/preload/index.js`. Exponerar `window.bridge` med namngivna anrop och prenumerationer, ingen generisk invoke. Beror på: electron `contextBridge`, `ipcRenderer`.

## Renderer (`src/renderer/`)

### App
`App.jsx`. Projektflikar, återställning och sparande av öppna flikar, felbanner. Håller alla flikar monterade. Beror på: preload-bridge, ProjectView, Splash, AuctumMark.

### ProjectView
`ProjectView.jsx`. Sidopanel (space-väljare, IntentList), innehåll (IntentDetail) och TerminalPanel; visar "Inget AI-DLC-projekt" för vanliga mappar. Beror på: useProject, IntentList, IntentDetail, TerminalPanel.

### useProject
`useProject.js`. Datahook per projektflik: laddar lista och detalj, lyssnar på `project:changed`/`project:watchError`, laddar om bara berörda intents och markerar nya audit-händelser i 4 s. Beror på: preload-bridge.

### IntentList
`IntentList.jsx`. Lista med fritext-, status- och scope-filter (`filterIntents`), flaggor för saknas/läsfel. Ingen sortering. Beror på: format.

### IntentDetail
`IntentDetail.jsx`. Rubrik med fakta (scope, depth, test strategy, stages, direktiv) och flikarna Pipeline, Tidslinje, Units, Filer. Beror på: Pipeline, Timeline, BoltDag, ArtifactReader, format.

### Pipeline
`Pipeline.jsx`. Faser och stages med status, agent, tider, varaktighet, avvikelse och filer per stage. Beror på: format.

### Timeline
`Timeline.jsx`. Audit-händelser nyast först, filter på typ/stage, brusfilter, max 1500 rader. Beror på: format, parsers (`NOISY_EVENTS`).

### BoltDag
`BoltDag.jsx`. Handritad SVG av units per batch med beroendepilar och status. Beror på: format.

### ArtifactReader
`ArtifactReader.jsx`. Filträd och filvy; markdown utan rå HTML, JSON snyggt formaterad; Visa i Finder och Öppna i editor. Beror på: preload-bridge, react-markdown, remark-gfm.

### TerminalPanel
`TerminalPanel.jsx`. Två xterm-sessioner (`claude`, `shell`), höjdjustering, snabbkommandon som skrivs in utan Enter. Beror på: preload-bridge, @xterm/xterm, @xterm/addon-fit.

### Splash
`Splash.jsx`. Startskärm, minst 900 ms, högst 4000 ms, 300 ms uttoning; exporterar `APP_NAME`. Beror på: AuctumMark.

### AuctumMark
`AuctumMark.jsx`. Auctums logga som SVG med `currentColor`.

### format
`format.js`. Statusetiketter, kategorietiketter, `formatTime` (sv-SE), `formatDuration`, `isInFlight`.

### theme
`theme.css` och `main.jsx`. Tema (LCARS-inspirerat), typsnittet Antonio, React-rot.

## Bygg och test

### release-workflow
`.github/workflows/release.yml`. Vid tagg `v*.*.*`: kontrollera att taggen matchar `package.json`, kör vitest, bygg mac (universal dmg) och linux (deb), skapa GitHub Release.

### test-suite
`tests/`. Vitest-projekten `main` (node) och `renderer` (jsdom) med fixturer; se `code-quality-assessment.md`.
