# Component Inventory — aidlc-dash

Varje komponent med ansvar och beroenden. Filkategorier finns i [code-structure.md](code-structure.md); kanaler i [api-documentation.md](api-documentation.md). Komponenter märkta *(ytligt)* är inte djuplästa i den senaste körningen.

## Main Entry

`src/main/index.js`. Sätter userData till `aidlc-dash`, skapar `BrowserWindow` med sandbox/contextIsolation, blockerar navigering och nya fönster (http(s) till OS-webbläsaren), Dock-ikon i dev, registrerar IPC, stänger ner vid `before-quit`.
Beror på: ipc.js, electron.

## IPC Router

`src/main/ipc.js`. Handler-tabell för alla kanaler, projektregister `projects` (root, space, watcher, sender, models), startar om watcher vid spacebyte, stänger allt vid `shutdown`. Har sedan EPIC-05 även git- och setup-kanaler och push `project:detected` *(ytligt)*.
Beror på: projectAccess, projectService, parsers/ledger, models, settings, watcher, pty, git, setup.

## Project Access

`src/main/projectAccess.js`. `openRoot`, `resolveInRoot`, `readText`, `readJsonSafe`, `listDir`, `exists`. Skrivskyddad och rotinnesluten.
Beror på: node:fs, node:path.

## Project Service

`src/main/projectService.js`. `detectProject` (kräver `aidlc/spaces/` med minst en space; aktiv space ur `aidlc/active-space`, annars `default`, annars första), `listSpaces`, `loadIntentList` (cache, omläsning bara för `onlyDirs`, behåller förra indexet om `intents.json` är halvskriven), `loadIntentDetail` (bygger alltid om helt: state, graf, alla audit-shards via `loadAuditEvents`, direktiv, artefakter till djup 3; vid fel föregående detalj med `stale: true`), `loadCost(root)`. `assertName` avvisar namn med `/`, `\` eller inledande punkt. Konstanter `LEDGER_PATH`, `intentsDir`.
Beror på: projectAccess, parsers (intents, state, runtimeGraph, audit, pipeline, units).

## Configured Models

`src/main/models.js`. `getConfiguredModels(root, {exec})`: kör `aidlc config models` med inloggningsskalets PATH, faller tillbaka på agentfilernas frontmatter. Kastar aldrig.
Beror på: node:child_process, projectAccess, parsers/ledger.

## PTY Sessions

`src/main/pty.js`. `spawnSession` (claude eller shell), `writeSession`, `resizeSession`, `killSession`, `killProjectSessions`, `killAllSessions`. Lazy-laddar node-pty.
Beror på: node-pty, node:crypto.

## File Watcher

`src/main/watcher.js`.
- `watchIntents({intentsDir, ledgerFile, onChange, onError, debounceMs=300, maxWaitMs=800})`: chokidar på intents/ med `ignoreInitial`; ignorerar allt under `.aidlc-engine/` utom `active-directive.json`. En ändring på toppnivå (intents.json, active-intent, ny/borttagen intentmapp) sätter `indexChanged`; djupare ändringar lägger intentens mappnamn i `dirNames`; punktmappar ignoreras. Ledgern bevakas via `aidlc/` (djup 1) eftersom chokidar v4 missar filer vars mapp saknas vid start. Returnerar `{ready, close}`.
- `watchForAidlc({root, onFound, onError})`: släpper bara igenom rot, `aidlc/`, `aidlc/spaces/` och dess barn; anropar `onFound` en gång när första space-mappen dyker upp (EPIC-05 US-0503).
Beror på: chokidar, node:path.

## App Settings

`src/main/settings.js`. `getSettings`/`setSettings` för öppna och senaste projekt samt aktivt projekt. Enda filskrivaren.
Beror på: electron app, node:fs.

## External Commands

*(ytligt)* `src/main/exec.js`. `runFixed` m.m.: `execFile` utan skal, fasta argument, timeout (standard 10 s), inloggningsskalets PATH. Gemensam för git och setup.
Beror på: node:child_process.

## Git Service

*(ytligt)* `src/main/git.js`. Skrivskyddad git för "Uppdatera från GitHub" (US-0502): fetch, rev-parse, rev-list, diff, status, show.
Beror på: exec, projectAccess.

## Setup Service

*(ytligt)* `src/main/setup.js`. Förkontroller och kommandokedja för "Initiera AI-DLC" (US-0503); själva installationen skrivs i skalfliken.
Beror på: exec, git, projectAccess.

## Audit Parser

`src/main/parsers/audit.js` (utbruten ur Parsers för EPIC-03).
- `parseAudit(text, source)`: delar på rader som bara är `---`; varje block ger `{timestamp, event, title, fields, source}` eller kastas om det saknar både rubrik och fält. Okända händelsetyper och fält behålls. Blockets position i sharden sparas inte.
- `mergeAudits(files)`: platta ut alla shards, stabil sortering på `timestamp` med `localeCompare` (`null` → `''`, alltså först), sätt `seq` = index efter sortering.
- `categoryOf(event)`: `error | gate | subagent | unit | guard | human | stage | other` efter prefix/innehåll.
- `NOISY_EVENTS`: `GUARD_DISABLED`, `SENSOR_PASSED`, `SENSOR_FIRED`, `GUARD_STOOD_ASIDE`.
Beror på: inget (ren modul; importeras även av renderaren).

## Parsers

`src/main/parsers/` (utom audit.js, se Audit Parser):
- `intents.js` — `mergeIntents`, `dateFromDirName`
- `ledger.js` — `summarizeLedger`, `costOf`, `compareModels`, `agentName`
- `pipeline.js` — `mergePipeline` (state vinner, avvikelse flaggas)
- `runtimeGraph.js` — `parseRuntimeGraph` (stages, bolt-DAG)
- `state.js` — `parseState`, `CHECKBOX_STATUS`
- `units.js` — `unitStatuses` (läser även audit-händelserna)

Beror på: inget (rena funktioner).

## Preload Bridge

`src/preload/index.js`. `window.bridge` med namngivna anrop och prenumerationer (29 kanaler sedan EPIC-05) och `platform`.
Beror på: electron contextBridge/ipcRenderer.

## App Shell

`src/renderer/App.jsx`. Projektflikar, öppna/stäng projekt, återställ och spara flikar, felbanner, tomt läge. Alla flikar hålls monterade.
Beror på: ProjectView, Splash, AuctumMark, bridge.

## Project View

`src/renderer/ProjectView.jsx`. Väljer mellan AI-DLC-vy (sidopanel med space-val, CostPanel, IntentList; innehåll med IntentDetail) och skärmen "Inget AI-DLC-projekt". Visar alltid TerminalPanel. Skickar `p.newSeqFrom` och `p.detail` vidare till IntentDetail.
Beror på: useProject, IntentList, IntentDetail, CostPanel, TerminalPanel (+ EPIC-05-vyer, ytligt).

## useProject Hook

`src/renderer/useProject.js`. Per projektflik: `space`, intentlista med varning, vald intent (förvalt aktiv eller första), detalj, kostnad, modeller, fel och `lastIntentChangeAt` (för RefreshPanel).
- `loadDetail(dirName, {live})` kastar svar om valet hunnit ändras. Vid `live` och samma intent: om `next.events.length > prev.events.length` sätts `newSeqFrom = prev.events.length` och en `setTimeout` på `HIGHLIGHT_MS = 4000` nollställer det (timern rensas aldrig).
- Byte av vald intent nollställer `newSeqFrom` och laddar detaljen.
- `project:changed`: laddar om listan (alla vid `indexChanged`, annars `dirNames`), kostnaden vid `costChanged`/`indexChanged`, detaljen live om vald intent nämns eller indexet ändrats.
- Kostnadsfel sätter aldrig den delade felbannern.
Beror på: react, window.bridge.

## Intent List

`src/renderer/IntentList.jsx`. Sök, filter (status, scope), sortering; rad med aktiv-tagg, live-prick (`isInFlight`), kostnad, klara/körda stages, flaggor. Exporterar `sortIntents`, `filterIntents`.
Beror på: format.

## Intent Detail

`src/renderer/IntentDetail.jsx`. Rubrik med fakta (scope, depth, test strategy, stages, aktuell stage, direktiv) och flikarna Pipeline, Tidslinje, Units, Kostnad, Filer. Tidslinjen monteras bara när fliken är vald (`tab === 'timeline'`).
Beror på: Pipeline, Timeline, BoltDag, CostTab, ArtifactReader, format.

## Pipeline View

`src/renderer/Pipeline.jsx`. Faser och stages med status, aktuell, avvikelse, agent/modell, tider, kostnad och filer.

## Timeline View

`src/renderer/Timeline.jsx`. Props `events`, `newSeqFrom`.
- Lokalt tillstånd: `showNoise` (av), `type`, `stage` (tomt = alla). Typ- och stagelistor memoiseras ur `events`.
- Synliga rader räknas om vid varje rendering: filter (brus, typ, `fields.Stage`) → `slice(-MAX_ROWS)` med `MAX_ROWS = 1500` (`ponytail:`) → `reverse()` (nyast först). Allt renderas som `<li>` i en `<ol>`; ingen virtualisering, ingen scrollhantering.
- `EventRow`: `<button aria-expanded>` som fäller ut en `<dl>` med titel, alla fält och källa (varierande radhöjd); eget `open`-tillstånd. `key={e.seq}`.
- Ny-markering: klass `is-new` när `seq >= newSeqFrom`.
- Räknare "`{visible.length} av {events.length} händelser`" och tomt läge "Inga audit-händelser hittades i audit/.".
Beror på: react, format (`CATEGORY_LABEL`, `formatTime`), Audit Parser (`NOISY_EVENTS`).

## Bolt DAG View

`src/renderer/BoltDag.jsx`. SVG-layout per batch med beroendepilar och unitstatus.

## Cost Views

`src/renderer/CostPanel.jsx` (projektöversikt: total, stapeldiagram, per modell/agent/scope, modelltabell) och `src/renderer/CostTab.jsx` (intentens kostnad; exporterar `CostLabel`, `CostTable`, `ModelTable`).
Beror på: format, parsers/ledger.

## Artifact Reader

`src/renderer/ArtifactReader.jsx`. Filträd per stagemapp, markdown utan rå HTML och utan aktiva länkar, JSON snyggformaterad, "Visa i Finder" och "Öppna i editor". Exporterar sedan EPIC-05 även `FileContent` (används av RefreshPanel, ytligt).
Beror på: react-markdown, remark-gfm, bridge.

## Terminal Panel

`src/renderer/TerminalPanel.jsx`. Två `TermSession` (claude, shell) som hålls monterade, ändringsbar höjd, omstart vid avslut, snabbkommandon (`/aidlc --status`, `/aidlc --doctor`, `/aidlc continue`). Sedan EPIC-05 styrs inskrivning utifrån via Terminal Control *(ytligt, inte omverifierat)*.
Beror på: @xterm/xterm, @xterm/addon-fit, bridge.

## Terminal Control

*(ytligt)* `src/renderer/TerminalContext.jsx` (`useTerminal()`: andra vyer skriver i claude- eller shell-fliken) och `src/renderer/terminalControl.js` (ren modul: aktivitetssignal `QUIET_MS = 1500`, `READY_TIMEOUT_MS = 20000`, `runSequence`, `waitFor`, `withEnter`).

## Workflow Control Views

*(ytligt)* `src/renderer/ResumeButton.jsx` (Fortsätt, US-0501), `src/renderer/RefreshPanel.jsx` (Uppdatera från GitHub, US-0502), `src/renderer/SetupAidlc.jsx` (Initiera AI-DLC, US-0503). Alla skriver kommandon i terminalen via `useTerminal()`.

## Branding

`src/renderer/Splash.jsx` (startskärm 0,9–4 s, `APP_NAME`), `src/renderer/AuctumMark.jsx` (SVG-logga), `src/renderer/theme.css` (LCARS-tema, CSS-variabler; `.event.is-new .event-row { animation: flash 4s }`).

## Format Helpers

`src/renderer/format.js`. Statusetiketter, tid/varaktighet, USD/tokens, kostnadstexter, `isInFlight`, `CATEGORY_LABEL`, `formatTime`.

## Build Scripts

`scripts/check-glibc.mjs` (CI-kontroll av native-binärer mot Ubuntu 22.04), `scripts/make-icon.cjs` (SVG till PNG och Linux-storlekar via Electron).

## Intent-relevans (EPIC-03)

| Story | Berörda komponenter |
|---|---|
| US-0301 Virtualiserad tidslinje | Timeline View (ta bort `MAX_ROWS`, fönstring med varierande radhöjd, hoppa till nyast/stagestart, bevarad scrollposition, tangentbord/ARIA), Branding (`theme.css`: höjd och scrollbehållare för `.events`), Intent Detail (tidslinjen monteras om vid flikbyte, scrollposition förloras) |
| US-0302 Exakt ny-markering | Audit Parser (stabil identitet, t.ex. `source` + blockposition), useProject Hook (jämför identiteter i stället för antal, timerhantering), Timeline View (`key` och `isNew` på identitet, räknare "N nya händelser"), Project Service (`loadAuditEvents` skickar identiteten), Parsers (`unitStatuses` får inte brytas av ändrad händelseform) |
| Ej berörda | File Watcher (meddelar redan vilken intent som ändrats; ingen ändring krävs), IPC Router/Preload Bridge (samma kanaler räcker) |
