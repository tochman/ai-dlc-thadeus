# API-dokumentation: aidlc-dash

Appen har inga HTTP-, GraphQL- eller nätverks-API:er. Dess API-yta är Electron-IPC mellan renderaren och huvudprocessen, exponerad som `window.bridge` i `src/preload/index.js`. Invoke-funktioner byggs med `call(channel)` och prenumerationer med `subscribe(channel)`. Varje projekt-handler i `src/main/ipc.js` slår upp `projectId` (okänt id ger fel) och går via `projectAccess` för sökvägar. Fel loggas med `[ipc] <kanal> misslyckades` och skickas tillbaka som avvisat promise; renderaren rensar meddelandet med en lokal `errorText()`.

## Invoke-anrop (renderare → main), 32 st

| `window.bridge` | Kanal | Argument | Svar |
|-----------------|-------|----------|------|
| `pickProject` | `project:pick` | – | mappsökväg eller `null` (dialog modal mot `BrowserWindow.fromWebContents(event.sender)`) |
| `openProject` | `project:open` | `dir` | `{projectId, root, name, detection}`; startar bevakning av aktiv space (eller väntan på AI-DLC) |
| `closeProject` | `project:close` | `projectId` | – (dödar pty och bevakning) |
| `getSpaces` | `project:spaces` | `projectId` | `string[]` |
| `getIntents` | `project:intents` | `projectId, space, onlyDirs?` | `{intents, warning}`; byter bevakad space om den skiljer sig. Varje intent: `uuid, slug, dirName, scope, status, missingOnDisk, missingInIndex, active` (från index/disk) plus `stateScope, request, currentStage, stateStatus, done, executed` (från `aidlc-state.md`), ev. `error`/`stale`. Inga audit-händelser |
| `getIntent` | `project:intent` | `projectId, space, dirName` | detalj: `dirName, base, request, state, graph, pipeline, events, units, directive, files, warnings, stale?` |
| `getCost` | `project:cost` | `projectId, space` | `{available, project, perIntent, byScope, timeline, ...}` eller `{available:false, reason}` |
| `getModels` | `project:models` | `projectId` | `{source, agents, error?}` (cachas per öppnat projekt) |
| `readFile` | `project:file` | `projectId, rel` | text |
| `revealInFinder` | `shell:reveal` | `projectId, rel` | – |
| `openInEditor` | `shell:openInEditor` | `projectId, rel` | – (endast `.md .json .txt .yaml .yml`) |
| `getSettings` / `setSettings` | `settings:get` / `settings:set` | `partial` | `{openProjects, recentProjects, activeProject, animations?, fullscreen?, projectSettings}` |
| `ptySpawn` | `pty:spawn` | `{projectId, kind: 'claude'|'shell', cols, rows}` | session-id |
| `ptyWrite` / `ptyResize` / `ptyKill` | `pty:write` / `pty:resize` / `pty:kill` | `id, data` / `id, cols, rows` / `id` | – |
| `getGitStatus` | `git:status` | `projectId` | `{isRepo, branch, upstream, tracking, ahead, behind, dirtyAidlc, dirtyOther}` |
| `gitFetch` | `git:fetch` | `projectId` | – |
| `getRemoteChanges` | `git:remoteChanges` | `projectId, ref, space` | `{ref, aidlcCommits, aidlcFiles, otherFiles, auditLines, newIntents}` |
| `showRemoteFile` | `git:showRemote` | `projectId, ref, rel` | text (bara under `aidlc/`) |
| `getConflicts` | `git:conflicts` | `projectId` | `string[]` |
| `getSetupInfo` | `setup:info` | `projectId` | förutsättningar, förhandsvisning, plugins, presets |
| `buildSetupCommand` | `setup:command` | `projectId, {needsGit, plugins, preset}` | kommandosträng (körs inte) |
| `loadFeatures` | `features:load` | `projectId` | översikt och epics |
| `getStoryLinks` | `features:storyLinks` | `projectId, space` | `{storyId: dirName[]}` |
| `getProjectSettings` / `setProjectSettings` | `projectSettings:get` / `projectSettings:set` | `projectId, partial` | `{featureDocs, featuresPath}` |
| `toggleFullscreen` | `window:toggleFullscreen` | – | – (växlar avsändarens fönster) |
| `isFullscreen` | `window:isFullscreen` | – | `boolean` |
| `sendMenuState` | `menu:state` | `{hasProject, isAidlc, showFeatures}` | – (bara tre booleans godtas, `parseMenuState`) |
| `openDocsUrl` | `app:openDocsUrl` | – | – (fast adress `AIDLC_DOCS_URL`) |

Utöver detta exponeras `platform` (`process.platform`).

## Push-händelser (main → renderare), 8 st

| `window.bridge` | Kanal | Payload |
|-----------------|-------|---------|
| `onProjectChanged` | `project:changed` | `{projectId, space, dirNames, indexChanged, costChanged}` – bara vilka intents som ändrats, inget innehåll |
| `onProjectDetected` | `project:detected` | `{projectId, detection}` |
| `onWatchError` | `project:watchError` | `{projectId, message}` |
| `onFeaturesChanged` | `features:changed` | `{projectId}` |
| `onPtyData` | `pty:data` | `{id, data}` |
| `onPtyExit` | `pty:exit` | `{id, exitCode, signal}` |
| `onFullscreen` | `window:fullscreen` | `boolean` (skickas från `index.js` vid `enter-/leave-full-screen`) |
| `onMenuCommand` | `menu:command` | `{command, ...args}`; kommandon: `openProject`, `closeProject`, `projectSettings`, `appSettings`, `view {view}`, `panel {panel}`, `terminal {action: 'claude'|'shell'|'restart'}`, `docs`. Skickas till `getFocusedWindow() ?? getAllWindows()[0]` |

Varje `on*` returnerar en avregistreringsfunktion. Projektens push går till det `webContents` som öppnade projektet (`p.sender.send(...)` efter `isDestroyed()`-kontroll). En ny push (t.ex. öppna frågor eller notisklick i US-0505) läggs till som en `subscribe`-rad i preload och ett `webContents.send` i main.

## Audit-händelser som renderaren får (`detail.events`)

Från `projectService.loadAuditEvents` + `parsers/audit.js`, en post per block i varje `<intent>/audit/*.md`:

| Fält | Innehåll |
|------|----------|
| `timestamp` | `**Timestamp**`-värdet (sträng) eller `null` |
| `event` | `**Event**`-värdet, t.ex. `DECISION_RECORDED`, `STAGE_AWAITING_APPROVAL`, `QUESTION_ANSWERED`, `GATE_APPROVED`, `GATE_REJECTED` |
| `title` | `## Rubrik` i blocket eller `null` |
| `fields` | alla övriga `**Nyckel**: värde` ordagrant som strängar (flerradiga värden sammanfogade med `\n`), t.ex. `Stage`, `Decision`, `Options`, `Details`, `Question Id`, `Question Type`, `Unit` |
| `source` | shardens filnamn |
| `index` | blockets ordning i sharden |
| `key` | `<source>#<index>` (stabil, shards växer bara i slutet) |
| `timeMs` | tolkad tid; utan giltig tidsstämpel ärvs föregående blocks tid i samma shard (`-Infinity` först) |
| `seq` | position efter sammanslagning (tid, sedan källa, sedan index) |
| `category` | `categoryOf(event)`: `DECISION_*`/`QUESTION_*`/`HUMAN_*` → `human`, `GATE_*` och allt med `APPROV` → `gate` |

Fältnamnen kommer från AI-DLC:s auditformat: `DECISION_RECORDED` och `STAGE_AWAITING_APPROVAL` bär `Question Id`; `QUESTION_ANSWERED`, `GATE_APPROVED` och `GATE_REJECTED` bär `Stage` (och ev. `Unit`) men inget `Question Id`.

## Inställningar (`settings.json`)

`settings.js` sparar `settings.json` i userData (mappen `aidlc-dash`) och kör `sanitize()` på allt som läses och skrivs:

| Nyckel | Typ | Regel |
|--------|-----|-------|
| `openProjects`, `recentProjects` | `string[]` | bara strängar, högst 50 |
| `activeProject` | `string | null` | annars `null` |
| `animations` | `'full' | 'reduced' | 'off'` | vitlista (`Set`); utelämnas när den saknas eller är ogiltig, så renderarens standard gäller (FR4.2) |
| `fullscreen` | `boolean` | sparas av main vid helskärmsbyte; utelämnas om inte boolean (US-0404 FR1.3) |
| `projectSettings` | `{[root]: {featureDocs, featuresPath}}` | högst 200 projekt; ogiltiga värden faller tillbaka på standard |

Alla andra nycklar tas bort tyst. En ny global inställning (t.ex. notisläget i US-0505) måste läggas till i `sanitize()` på samma sätt som `animations`. Skrivningar köas seriellt och slår ihop över senast skrivna värde, så main och renderaren kan skriva olika nycklar utan att tappa varandras ändringar. `setSettings` rör aldrig `projectSettings`; de ändras bara via `setProjectSettings`.

## Interna renderar-API:er

- `useTerminal()` (`TerminalContext.jsx`): `view`, `setView`, `error`, `register`, `show(tab)`, `state(tab)`, `exitCode(tab)`, `pending(tab)`, `input(tab)`, `type(tab, text, {submit})`, `sequence(tab, steps)`, `restart(tab)`. Returnerar `null` utanför `TerminalProvider`. Providern ligger per projekt i `ProjectView.jsx`, inte i App; App når den via propen `terminalCommand {seq, action, projectId}`.
- `motionMode(saved)` (`App.jsx`): sparat val, annars `reduced` under `prefers-reduced-motion`, annars `full`.
- `windowOptions(settings, platform)` (`src/main/index.js`): ren funktion för fönstrets options; testas i `windowOptions.test.js`.
- `useProject(projectId, space)` och `useFeatures(projectId, space)`: se `component-inventory.md`.
