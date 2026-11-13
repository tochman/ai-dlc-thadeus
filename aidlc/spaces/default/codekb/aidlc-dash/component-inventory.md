# Component Inventory — aidlc-dash

Varje komponent med ansvar och beroenden. Filkategorier finns i [code-structure.md](code-structure.md); kanaler i [api-documentation.md](api-documentation.md). Komponenter märkta *(ytligt)* är inte djuplästa i den senaste körningen; djupt lästa i den här körningen är IPC Router, Project Access, App Settings, Setup Service, Preload Bridge, App Shell, Project View, Setup View och Artifact Reader.

## Main Entry

`src/main/index.js`. Sätter userData till `aidlc-dash`, skapar `BrowserWindow` med sandbox/contextIsolation, blockerar navigering och nya fönster (http(s) till OS-webbläsaren), Dock-ikon i dev, registrerar IPC, stänger ner vid `before-quit`.
Beror på: ipc.js, electron.

## IPC Router

`src/main/ipc.js`. Handler-tabell för 24 kanaler (`:84-162`), registrerade i en loop med gemensam fellogg (`registerIpc`). Projektregister `projects` (projectId → `{root, space, watcher, setupWatcher, sender, models, setupInfo}`).
- `project:open`: `openRoot` + `detectProject`; startar `watchSpace` (AI-DLC) eller `watchForSetup` (annars).
- `watchSpace(projectId, space)`: (om)startar `watchIntents` för `intentsDir(space)` och ledgern bara vid spacebyte; skickar `project:changed`/`project:watchError`.
- `watchForSetup(projectId)`: `watchForAidlc` på roten; vid fynd omdetektering, stäng setup-bevakaren, `watchSpace`, push `project:detected`.
- `closeWatcher` stänger båda bevakarna; `shutdown` dödar alla terminaler och stänger alla bevakare.
- `project:file` → `readText`; `shell:reveal`/`shell:openInEditor` → `resolveInRoot` (editor bara för `.md .json .txt .yaml .yml`).
- `setup:info` sparar svaret som `setupInfo`; `setup:command` validerar plugins mot det.
Beror på: projectAccess, projectService, parsers/ledger, models, git, setup, settings, watcher, pty, electron (`dialog`, `shell`, `ipcMain`, `BrowserWindow`).

## Project Access

`src/main/projectAccess.js`. Skrivskyddad och rotinnesluten; inga skrivanrop.
- `openRoot(dir)`: realpath, måste vara en mapp.
- `resolveInRoot(root, rel)`: avvisar icke-strängar, absoluta sökvägar, sökvägar utanför roten och symlänkar som pekar ut (realpath kontrolleras). Kastar `ENOENT` för saknade filer.
- `readText` (UTF-8), `readJsonSafe` (kastar aldrig: `{ok, value}` eller `{ok:false, missing, error}`), `listDir` (saknad mapp → `[]`, `{name, isDir}`), `exists` (alla fel → `false`).
Beror på: node:fs, node:path.

## Project Service

*(ytligt i denna körning)* `src/main/projectService.js`. `detectProject` (kräver `aidlc/spaces/` med minst en space; aktiv space ur `aidlc/active-space`, annars `default`, annars första; annars `{isAidlc:false, reason}`), `listSpaces`, `loadIntentList` (cache, omläsning bara för `onlyDirs`, behåller förra indexet om `intents.json` är halvskriven), `loadIntentDetail` (bygger alltid om helt: state, graf, alla audit-shards via `loadAuditEvents`, direktiv, artefakter till djup 3; vid fel föregående detalj med `stale: true`), `loadCost(root)`. `assertName` avvisar namn med `/`, `\` eller inledande punkt. Konstanter `LEDGER_PATH`, `intentsDir`.
Beror på: projectAccess, parsers (intents, state, runtimeGraph, audit, pipeline, units).

## Configured Models

`src/main/models.js`. `getConfiguredModels(root, {exec})`: kör `aidlc config models` med inloggningsskalets PATH, faller tillbaka på agentfilernas frontmatter. Kastar aldrig.
Beror på: node:child_process, projectAccess, parsers/ledger.

## PTY Sessions

`src/main/pty.js`. `spawnSession` (claude eller shell), `writeSession`, `resizeSession`, `killSession`, `killProjectSessions`, `killAllSessions`. Lazy-laddar node-pty.
Beror på: node-pty, node:crypto.

## File Watcher

*(ytligt i denna körning)* `src/main/watcher.js`.
- `watchIntents({intentsDir, ledgerFile, onChange, onError, debounceMs=300, maxWaitMs=800})`: chokidar på intents/ med `ignoreInitial`; ignorerar allt under `.aidlc-engine/` utom `active-directive.json`. En ändring på toppnivå (intents.json, active-intent, ny/borttagen intentmapp) sätter `indexChanged`; djupare ändringar lägger intentens mappnamn i `dirNames`; punktmappar ignoreras. Ledgern bevakas via `aidlc/` (djup 1) eftersom chokidar v4 missar filer vars mapp saknas vid start. Returnerar `{ready, close}`.
- `watchForAidlc({root, onFound, onError})`: släpper bara igenom rot, `aidlc/`, `aidlc/spaces/` och dess barn (`depth: 2`); anropar `onFound` en gång när första space-mappen dyker upp (EPIC-05 US-0503).
- Ingen bevakare täcker `docs/` eller andra projektfiler.
Beror på: chokidar, node:path.

## App Settings

`src/main/settings.js`. `getSettings()` läser `userData/settings.json` och sanerar; saknad fil ger standard, annat läsfel loggas och ger standard. `setSettings(partial)` läser, slår ihop, sanerar och skriver om hela filen (formaterad JSON). `sanitize` behåller bara `openProjects` och `recentProjects` (stränglistor, max 50) och `activeProject` (sträng eller `null`); okända nycklar tas bort. Ingen serialisering av samtidiga skrivningar. Enda filskrivaren i appen, och aldrig en AI-DLC-fil.
Beror på: electron app, node:fs, node:path.

## External Commands

*(ytligt)* `src/main/exec.js`. `runFixed` m.m.: `execFile` utan skal, fasta argument, timeout (standard 10 s), inloggningsskalets PATH. Gemensam för git och setup.
Beror på: node:child_process.

## Git Service

*(ytligt)* `src/main/git.js`. Skrivskyddad git för "Uppdatera från GitHub" (US-0502): fetch, rev-parse, rev-list, diff, status, show; `isGitRepo` används av setup.
Beror på: exec, projectAccess.

## Setup Service

`src/main/setup.js`. Förkontroller och kommandokedja för "Initiera AI-DLC" (US-0503); själva installationen skrivs i skalfliken.
- `getSetupInfo(root, {exec})`: andra harnesses (`.kiro`, `.codex`, `.cursor`, `.aidlc` som mappar i roten), `git.isRepo`, `aidlc --version` (saknas → `{aidlc:{installed:false, error}}` och stopp), förhandsvisning via `aidlc --project-dir <root> config --harness claude --dry-run` (`parsePreview`), plugins via `aidlc config project --show --json` (fel → `warning`). Kastar inte för saknade verktyg.
- `parsePreview(raw)`: räknare `create update merge preserve remove conflict`, konfliktfiler, `Note:`-rader.
- `buildSetupCommand({needsGit, plugins, preset}, availablePlugins)`: validerar plugins (`^[a-z0-9-]+$` och i listan) och preset (`thorough|balanced|minimal`), returnerar en `&&`-kedja.
- `PRESETS` exporteras.
Beror på: exec (`runFixed`), git (`isGitRepo`), projectAccess (`listDir`).

## Audit Parser

*(ytligt i denna körning)* `src/main/parsers/audit.js`.
- `parseAudit(text, source)`: delar på rader som bara är `---`; varje block ger `{timestamp, event, title, fields, source}` eller kastas om det saknar både rubrik och fält. Okända händelsetyper och fält behålls. Sedan EPIC-03 får varje kvarvarande block `index` (filordning) och `key = <source>#<index>`.
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

Ingen parser för feature-dokument finns.
Beror på: inget (rena funktioner).

## Preload Bridge

`src/preload/index.js`. `window.bridge` med 24 namngivna anrop (`call(channel)` → `ipcRenderer.invoke`), 5 prenumerationer (`subscribe(channel)` returnerar avregistrering: `onProjectChanged`, `onProjectDetected`, `onWatchError`, `onPtyData`, `onPtyExit`) och `platform`. Ingen generisk invoke/send.
Beror på: electron contextBridge/ipcRenderer.

## App Shell

`src/renderer/App.jsx`. Projektflikar (`{projectId, root, name, detection}`), öppna/stäng projekt, felbanner, tomt läge. Vid start läses inställningarna och `openProjects` öppnas igen; `activeProject` väljs (FR1.5). Efter återställningen sparas `openProjects`, `recentProjects` (max 10 i minnet) och `activeProject` vid varje flik- eller valändring. Prenumererar på `project:detected` och byter `detection` i fliken (FR4.6). Alla flikar hålls monterade och döljs med `hidden` (FR8.4). Ingen inställningsvy och ingen projektmeny.
Beror på: ProjectView, Splash, AuctumMark, bridge.

## Project View

`src/renderer/ProjectView.jsx`. Omsluter projektet i `TerminalProvider`.
- `ProjectContent`: väljer `AidlcProject` när `detection.isAidlc`, annars `SetupAidlc`; visar alltid `TerminalPanel`. Ser bytet från icke-AI-DLC till AI-DLC (ref `wasAidlc`), startar då om claude och visar `SetupDone`.
- `AidlcProject`: sidopanel (space-val vid fler än en space, listvarning, CostPanel, RefreshPanel, IntentList) och innehåll (felbanner, `IntentDetail` med `newKeys`, eller "Välj en intent i listan.").
- `SetupDone` (FR4.7): knapparna "Kör /aidlc --doctor" och "Starta första arbetet" skriver i claude-fliken via `useTerminal().type`.
Beror på: useProject, IntentList, IntentDetail, CostPanel, RefreshPanel, SetupAidlc, TerminalPanel, TerminalContext.

## useProject Hook

*(ytligt i denna körning)* `src/renderer/useProject.js`. Per projektflik: `space`, intentlista med varning, vald intent (förvalt aktiv eller första), detalj, kostnad, modeller, fel och `lastIntentChangeAt` (för RefreshPanel).
- `loadDetail(dirName, {live})` kastar svar om valet hunnit ändras. Sedan EPIC-03 exponeras `newKeys` (en `Set` av händelsenycklar från de senaste liveuppdateringarna, FR2.2) i stället för `newSeqFrom`.
- `project:changed`: laddar om listan (alla vid `indexChanged`, annars `dirNames`), kostnaden vid `costChanged`/`indexChanged`, detaljen live om vald intent nämns eller indexet ändrats.
- Kostnadsfel sätter aldrig den delade felbannern.
Beror på: react, window.bridge.

## Intent List

`src/renderer/IntentList.jsx`. Sök, filter (status, scope), sortering; rad med aktiv-tagg, live-prick (`isInFlight`), kostnad, klara/körda stages, flaggor. Exporterar `sortIntents`, `filterIntents`.
Beror på: format.

## Intent Detail

`src/renderer/IntentDetail.jsx`. Rubrik med fakta (scope, depth, test strategy, stages, aktuell stage, direktiv) och flikarna Pipeline, Tidslinje, Units, Kostnad, Filer. Tidslinjen monteras bara när fliken är vald och får `newKeys`.
Beror på: Pipeline, Timeline, BoltDag, CostTab, ArtifactReader, format.

## Pipeline View

`src/renderer/Pipeline.jsx`. Faser och stages med status, aktuell, avvikelse, agent/modell, tider, kostnad och filer.

## Timeline View

*(ytligt i denna körning)* `src/renderer/Timeline.jsx`. Props `events`, `newKeys`. Sedan EPIC-03 fönstrad med `useVirtualizer` (`@tanstack/react-virtual`): inget radtak, rader mäts (`measureElement`), "hoppa till nyast" (`timeline-jump-newest`), hoppa till stagestart, tangentbordsnavigering i listan och markering av nya händelser på `key` i `newKeys`. Filter för brus, typ och stage som tidigare.
Beror på: react, @tanstack/react-virtual, format, Audit Parser (`NOISY_EVENTS`).

## Bolt DAG View

`src/renderer/BoltDag.jsx`. SVG-layout per batch med beroendepilar och unitstatus.

## Cost Views

`src/renderer/CostPanel.jsx` (projektöversikt: total, stapeldiagram, per modell/agent/scope, modelltabell) och `src/renderer/CostTab.jsx` (intentens kostnad; exporterar `CostLabel`, `CostTable`, `ModelTable`).
Beror på: format, parsers/ledger.

## Artifact Reader

`src/renderer/ArtifactReader.jsx`.
- Standardexport `ArtifactReader({projectId, groups, selected, onSelect})`: filträd per stagemapp (`groups[{dir, files[{rel, name}]}]`), valet styrs av föräldern; tomt läge "Inga artefakter i intentens fasmappar ännu."
- `FileContent({rel, content})` (exporterad): `.md` med react-markdown + remark-gfm och `skipHtml` (FR6.4); länkar blir `<span class="md-link">`, bilder blir text; `.json` snyggformaterad; annat i `<pre>`.
- `FileView` (intern): läser via `readFile` med avbrytbar effekt, knapparna "Visa i Finder"/"Visa i filhanteraren" (efter `platform`) och "Öppna i editor", felbanner och "Läser…".
Beror på: react, react-markdown, remark-gfm, bridge.

## Terminal Panel

`src/renderer/TerminalPanel.jsx`. Två `TermSession` (claude, shell) som hålls monterade, ändringsbar höjd, omstart vid avslut, snabbkommandon (`/aidlc --status`, `/aidlc --doctor`, `/aidlc continue`). Sedan EPIC-05 styrs inskrivning utifrån via Terminal Control *(ytligt, inte omverifierat)*.
Beror på: @xterm/xterm, @xterm/addon-fit, bridge.

## Terminal Control

*(ytligt)* `src/renderer/TerminalContext.jsx` (`TerminalProvider`, `useTerminal()` med bland annat `type(kind, text, {submit})`, `restart(kind)`, `state(kind)`, `exitCode(kind)`) och `src/renderer/terminalControl.js` (ren modul: aktivitetssignal `QUIET_MS = 1500`, `READY_TIMEOUT_MS = 20000`, `runSequence`, `waitFor`, `withEnter`).

## Setup View

`src/renderer/SetupAidlc.jsx` (US-0503, FR4). Skärmen "Inget AI-DLC-projekt" med `detection.reason` och roten.
- "Initiera AI-DLC" → `getSetupInfo`; visar förkontroller (AI-DLC, git, andra harnesses), förhandsvisning (räknare, `Note:`-rader, konfliktfiler, hela utdata), "Avancerade inställningar" (plugins som checkboxar, modellnivå som radioknappar med förklaring).
- "Initiera" (spärrad om verktyget saknas eller konflikter finns) → `buildSetupCommand` → `terminal.type('shell', cmd, {submit:false})`; personen trycker Enter själv.
- Saknas verktyget visas installationslänken `INSTALL_URL`. Avslutas shell-fliken med felkod efter start visas `FAILED_MESSAGE` (FR4.8).
- Allt tillstånd (val, info, startad) är lokalt och försvinner när komponenten avmonteras.
Beror på: react, TerminalContext, bridge.

## Workflow Control Views

*(ytligt)* `src/renderer/ResumeButton.jsx` (Fortsätt, US-0501) och `src/renderer/RefreshPanel.jsx` (Uppdatera från GitHub, US-0502; använder `FileContent`). Båda skriver kommandon i terminalen via `useTerminal()`.

## Branding

`src/renderer/Splash.jsx` (startskärm 0,9–4 s, `APP_NAME`), `src/renderer/AuctumMark.jsx` (SVG-logga), `src/renderer/theme.css` (LCARS-tema, CSS-variabler).

## Format Helpers

`src/renderer/format.js`. Statusetiketter, tid/varaktighet, USD/tokens, kostnadstexter, `isInFlight`, `CATEGORY_LABEL`, `formatTime`.

## Build Scripts

`scripts/check-glibc.mjs` (CI-kontroll av native-binärer mot Ubuntu 22.04), `scripts/make-icon.cjs` (SVG till PNG och Linux-storlekar via Electron), `scripts/fix-pty-perms.cjs` *(ytligt; körs i `postinstall`)*.

## Intent-relevans (EPIC-06)

| Story | Berörda komponenter |
|---|---|
| US-0601 Erbjud feature-dokument vid uppsättning | Setup View (nytt val, av som standard, med förklaring och exempel; "Feature-beskrivningar finns redan"), Project View (lyft valet till `ProjectContent` så att det överlever bytet till AI-DLC; `SetupDone` skriver förfrågan i claude-fliken), Setup Service (`getSetupInfo` kan svara om `docs/FEATURES.md` finns), Terminal Control (`type('claude', …)` utan Enter) |
| US-0602 Features-vy | Project View (`AidlcProject` behöver en vyväxling bredvid intents och en plats för "Sätt upp feature-beskrivningar"), App Shell (ingen inställningsvy eller projektmeny finns), App Settings (ny per-projekt-nyckel: läge Automatiskt/Visa/Dölj och sökväg; utöka `sanitize`), Artifact Reader (`FileContent` för rendering; "Visa i Finder"/"Öppna i editor" från `FileView` behöver exporteras eller återskapas), Project Access (`readText` läser `docs/FEATURES.md` och epic-filer rotinneslutet; ingen ändring krävs), IPC Router och Preload Bridge (ny bevakare för dokumenten, stängning i `closeWatcher`, ny push-kanal; ev. kanal för existens), File Watcher (ny bevakning utanför intents), Parsers (ny ren parser för översiktstabell, epics och stories med reserv till Markdown) |
| Länkar story ↔ intent (US-0602) | useProject Hook / Project Service (intentens records och projektbeskrivning innehåller story-ID; sökning behöver data som i dag bara finns per vald intent) |
| Ej berörda | Timeline View, Audit Parser, Cost Views, PTY Sessions |
