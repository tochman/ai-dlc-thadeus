# Component Inventory — aidlc-dash

Varje komponent med ansvar och beroenden. Filkategorier finns i [code-structure.md](code-structure.md); kanaler i [api-documentation.md](api-documentation.md).

## Main Entry

`src/main/index.js`. Sätter userData till `aidlc-dash`, skapar `BrowserWindow` med sandbox/contextIsolation, blockerar navigering och nya fönster (http(s) till OS-webbläsaren), Dock-ikon i dev, registrerar IPC, stänger ner vid `before-quit`.
Beror på: ipc.js, electron.

## IPC Router

`src/main/ipc.js`. Handler-tabell för alla kanaler, projektregister `projects` (root, space, watcher, sender, models), startar om watcher vid spacebyte, stänger allt vid `shutdown`.
Beror på: projectAccess, projectService, parsers/ledger, models, settings, watcher, pty.

## Project Access

`src/main/projectAccess.js`. `openRoot`, `resolveInRoot`, `readText`, `readJsonSafe`, `listDir`, `exists`. Skrivskyddad och rotinnesluten.
Beror på: node:fs, node:path.

## Project Service

`src/main/projectService.js`. `detectProject`, `listSpaces`, `loadIntentList` (cache, omläsning per intent), `loadIntentDetail` (state, graf, audit, direktiv, artefakter), `loadCost`. Konstanter `LEDGER_PATH`, `intentsDir`.
Beror på: projectAccess, parsers.

## Configured Models

`src/main/models.js`. `getConfiguredModels(root, {exec})`: kör `aidlc config models` med inloggningsskalets PATH, faller tillbaka på agentfilernas frontmatter. Kastar aldrig.
Beror på: node:child_process, projectAccess, parsers/ledger.

## PTY Sessions

`src/main/pty.js`. `spawnSession` (claude eller shell), `writeSession`, `resizeSession`, `killSession`, `killProjectSessions`, `killAllSessions`. Lazy-laddar node-pty.
Beror på: node-pty, node:crypto.

## File Watcher

`src/main/watcher.js`. `watchIntents({intentsDir, ledgerFile, onChange})`: chokidar på intents/ (ignorerar `.aidlc-engine/` utom `active-directive.json`) och på ledgern via `aidlc/`; debounce med maxväntan.
Beror på: chokidar.

## App Settings

`src/main/settings.js`. `getSettings`/`setSettings` för öppna och senaste projekt samt aktivt projekt. Enda filskrivaren.
Beror på: electron app, node:fs.

## Parsers

`src/main/parsers/`:
- `audit.js` — `parseAudit`, `mergeAudits`, `categoryOf`, `NOISY_EVENTS`
- `intents.js` — `mergeIntents`, `dateFromDirName`
- `ledger.js` — `summarizeLedger`, `costOf`, `compareModels`, `agentName`
- `pipeline.js` — `mergePipeline` (state vinner, avvikelse flaggas)
- `runtimeGraph.js` — `parseRuntimeGraph` (stages, bolt-DAG)
- `state.js` — `parseState`, `CHECKBOX_STATUS`
- `units.js` — `unitStatuses`

Beror på: inget (rena funktioner).

## Preload Bridge

`src/preload/index.js`. `window.bridge` med 17 anrop, 4 prenumerationer och `platform`.
Beror på: electron contextBridge/ipcRenderer.

## App Shell

`src/renderer/App.jsx`. Projektflikar, öppna/stäng projekt, återställ och spara flikar, felbanner, tomt läge. Alla flikar hålls monterade.
Beror på: ProjectView, Splash, AuctumMark, bridge.

## Project View

`src/renderer/ProjectView.jsx`. Väljer mellan AI-DLC-vy (sidopanel med space-val, CostPanel, IntentList; innehåll med IntentDetail) och skärmen "Inget AI-DLC-projekt". Visar alltid TerminalPanel.
Beror på: useProject, IntentList, IntentDetail, CostPanel, TerminalPanel.

## useProject Hook

`src/renderer/useProject.js`. Laddar lista, vald detalj, kostnad och modeller; reagerar på `project:changed`; markerar nya audit-händelser i 4 s.
Beror på: bridge.

## Intent List

`src/renderer/IntentList.jsx`. Sök, filter (status, scope), sortering; rad med aktiv-tagg, live-prick (`isInFlight`), kostnad, klara/körda stages, flaggor. Exporterar `sortIntents`, `filterIntents`.
Beror på: format.

## Intent Detail

`src/renderer/IntentDetail.jsx`. Rubrik med fakta (scope, depth, test strategy, stages, aktuell stage, direktiv) och flikarna Pipeline, Tidslinje, Units, Kostnad, Filer.
Beror på: Pipeline, Timeline, BoltDag, CostTab, ArtifactReader, format.

## Pipeline View

`src/renderer/Pipeline.jsx`. Faser och stages med status, aktuell, avvikelse, agent/modell, tider, kostnad och filer.

## Timeline View

`src/renderer/Timeline.jsx`. Audit-händelser nyast först, filter för typ/stage/brus, tak 1500 rader.

## Bolt DAG View

`src/renderer/BoltDag.jsx`. SVG-layout per batch med beroendepilar och unitstatus.

## Cost Views

`src/renderer/CostPanel.jsx` (projektöversikt: total, stapeldiagram, per modell/agent/scope, modelltabell) och `src/renderer/CostTab.jsx` (intentens kostnad; exporterar `CostLabel`, `CostTable`, `ModelTable`).
Beror på: format, parsers/ledger.

## Artifact Reader

`src/renderer/ArtifactReader.jsx`. Filträd per stagemapp, markdown utan rå HTML och utan aktiva länkar, JSON snyggformaterad, "Visa i Finder" och "Öppna i editor".
Beror på: react-markdown, remark-gfm, bridge.

## Terminal Panel

`src/renderer/TerminalPanel.jsx`. Två `TermSession` (claude, shell) som hålls monterade, ändringsbar höjd, omstart vid avslut, snabbkommandon (`/aidlc --status`, `/aidlc --doctor`, `/aidlc continue`) som skrivs in i claude-fliken utan Enter via `claudeRef.insert`.
Beror på: @xterm/xterm, @xterm/addon-fit, bridge.

## Branding

`src/renderer/Splash.jsx` (startskärm 0,9–4 s, `APP_NAME`), `src/renderer/AuctumMark.jsx` (SVG-logga), `src/renderer/theme.css` (LCARS-tema, CSS-variabler).

## Format Helpers

`src/renderer/format.js`. Statusetiketter, tid/varaktighet, USD/tokens, kostnadstexter, `isInFlight`.

## Build Scripts

`scripts/check-glibc.mjs` (CI-kontroll av native-binärer mot Ubuntu 22.04), `scripts/make-icon.cjs` (SVG till PNG och Linux-storlekar via Electron).

## Intent-relevans (EPIC-05)

| Story | Berörda komponenter |
|---|---|
| US-0501 Fortsätt | Terminal Panel (insert med Enter, upptagen-signal, insert utifrån), Project View (dela terminalref), Intent List / Intent Detail (knapp), Format Helpers (`isInFlight`), Pipeline View-data (position) |
| US-0502 Uppdatera från GitHub | ny git-tjänst i main (mönster från Configured Models), IPC Router + Preload Bridge (nya kanaler), Intent List ("på GitHub"), Terminal Panel (insert i shell-fliken) |
| US-0503 Initiera AI-DLC | Project View (icke-AI-DLC-skärmen), IPC Router (omdetektering, watcher även för icke-AI-DLC), Project Service (`detectProject`), Terminal Panel (omstart av claude) |
