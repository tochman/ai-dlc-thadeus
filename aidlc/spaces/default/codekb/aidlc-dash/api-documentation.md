# API-dokumentation: aidlc-dash

Appen har inga HTTP-, GraphQL- eller nätverks-API:er. Dess API-yta är Electron-IPC mellan renderaren och huvudprocessen, exponerad som `window.bridge` i `src/preload/index.js`. Invoke-funktioner byggs med `call(channel)` och prenumerationer med `subscribe(channel)`. Varje projekt-handler i `src/main/ipc.js` slår upp `projectId` (okänt id ger fel) och går via `projectAccess` för sökvägar. Fel loggas med `[ipc] <kanal> misslyckades` och skickas tillbaka som avvisat promise; renderaren rensar meddelandet med en lokal `errorText()`.

Preload och `ipc.js` är inte omlästa i denna skanning. Kanalerna från US-0505 (`questions:*`) är bekräftade med grep i `src/preload/index.js:58-61` och `src/main/ipc.js`; deras payloads beskrivs från `App.jsx`, som lästes på djupet. Ingen kanal bär appens namn, så US-0406 ändrar inget här.

## Invoke-anrop (renderare → main), 34 st

| `window.bridge` | Kanal | Argument | Svar |
|-----------------|-------|----------|------|
| `pickProject` | `project:pick` | – | mappsökväg eller `null` (dialog modal mot `BrowserWindow.fromWebContents(event.sender)`) |
| `openProject` | `project:open` | `dir` | `{projectId, root, name, detection}`; startar bevakning av aktiv space (eller väntan på AI-DLC) |
| `closeProject` | `project:close` | `projectId` | – (dödar pty och bevakning; projektets frågor lämnar popupen) |
| `getSpaces` | `project:spaces` | `projectId` | `string[]` |
| `getIntents` | `project:intents` | `projectId, space, onlyDirs?` | `{intents, warning}`; byter bevakad space om den skiljer sig. Varje intent: `uuid, slug, dirName, scope, status, missingOnDisk, missingInIndex, active` (från index/disk) plus `stateScope, request, currentStage, stateStatus, done, executed` (från `aidlc-state.md`), ev. `error`/`stale`. Inga audit-händelser |
| `getIntent` | `project:intent` | `projectId, space, dirName` | detalj: `dirName, base, request, state, graph, pipeline, events, units, directive, files, warnings, stale?` |
| `getCost` | `project:cost` | `projectId, space` | `{available, project, perIntent, byScope, timeline, ...}` eller `{available:false, reason}` |
| `getModels` | `project:models` | `projectId` | `{source, agents, error?}` (cachas per öppnat projekt) |
| `readFile` | `project:file` | `projectId, rel` | text |
| `revealInFinder` | `shell:reveal` | `projectId, rel` | – |
| `openInEditor` | `shell:openInEditor` | `projectId, rel` | – (endast `.md .json .txt .yaml .yml`) |
| `getSettings` / `setSettings` | `settings:get` / `settings:set` | `partial` | `{openProjects, recentProjects, activeProject, animations?, fullscreen?, questionAlerts?, notificationSound?, projectSettings}` |
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
| `listQuestions` | `questions:list` | – | lista med väntande frågor från alla öppna projekt (US-0505); varje post har bl.a. `id`, `projectId`, `projectName`, `kind`, `early` |
| `setActiveProject` | `questions:activeProject` | `projectId | null` | – (main använder det för att avgöra om en notis ska visas) |

Utöver detta exponeras `platform` (`process.platform`). App anropar `listQuestions`, `onQuestions`, `onQuestionFocus` och `setActiveProject` valfritt (`?.`), så en äldre preload utan dem fungerar.

## Push-händelser (main → renderare), 10 st

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
| `onQuestions` | `questions:changed` | samma lista som `questions:list`, skickad när frågorna ändras |
| `onQuestionFocus` | `questions:focus` | frågans `id` (sträng) när personen klickar på en systemnotis; App öppnar popupen på den frågan |

Varje `on*` returnerar en avregistreringsfunktion. Projektens push går till det `webContents` som öppnade projektet (`p.sender.send(...)` efter `isDestroyed()`-kontroll).

## Electron-API:er som bär appens namn (US-0406)

Ingen IPC, men det är här main ger operativsystemet namnet:

| Anrop | Plats | Värde i dag | Verkan |
|-------|-------|-------------|--------|
| `app.setPath('userData', join(app.getPath('appData'), 'aidlc-dash'))` | `src/main/index.js:8` | `aidlc-dash` | inställningsmappen, oberoende av `productName` |
| `new BrowserWindow({title})` | `src/main/index.js:26` | `'Auctum AIDLC Control'` | fönstertitel tills sidan laddats; därefter vinner `<title>` i `src/renderer/index.html:9` |
| `app.setAboutPanelOptions({applicationName, applicationVersion})` | `src/main/menu.js:156` | `APP_NAME`, `app.getVersion()` | macOS About-panel (Om …); inga `credits`, `copyright` eller `website` satta |
| `{ role: 'about' | 'hide' | 'quit', label }` | `src/main/menu.js:44`, `:48`, `:52` | `Om/Göm/Avsluta Auctum AIDLC Control` | macOS-appmenyns poster |
| appmenyns `label` | `src/main/menu.js:42` | `APP_NAME` | etikett i mallen; i paketerad app visar macOS menyradens fetstilta appnamn från bundlens namn (`productName`), inte denna etikett |

## Audit-händelser som renderaren får (`detail.events`)

Från `projectService.loadAuditEvents` + `parsers/audit.js` (tidigare skanning), en post per block i varje `<intent>/audit/*.md`:

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

## Inställningar (`settings.json`)

`settings.js` sparar `settings.json` i userData (mappen `aidlc-dash`, `~/Library/Application Support/aidlc-dash/` på macOS och `~/.config/aidlc-dash/` på Linux enligt `README.md:53`) och kör `sanitize()` på allt som läses och skrivs:

| Nyckel | Typ | Regel |
|--------|-----|-------|
| `openProjects`, `recentProjects` | `string[]` | bara strängar, högst 50 |
| `activeProject` | `string | null` | annars `null` |
| `animations` | `'full' | 'reduced' | 'off'` | vitlista; utelämnas när den saknas eller är ogiltig, så renderarens standard gäller (FR4.2) |
| `fullscreen` | `boolean` | sparas av main vid helskärmsbyte; utelämnas om inte boolean (US-0404 FR1.3) |
| `questionAlerts` | `'popup-notify' | 'popup' | 'off'` | vitlista `QUESTION_ALERTS` (`settings.js:13`, US-0505); renderarens standard är `popup-notify` |
| `notificationSound` | `boolean` | utelämnas om inte boolean; renderaren tolkar saknat som på |
| `projectSettings` | `{[root]: {featureDocs, featuresPath}}` | högst 200 projekt; ogiltiga värden faller tillbaka på standard |

Alla andra nycklar tas bort tyst. Skrivningar köas seriellt och slår ihop över senast skrivna värde. `setSettings` rör aldrig `projectSettings`; de ändras bara via `setProjectSettings`. Ett namnbyte flyttar inte filen så länge `index.js:8` står kvar.

## Interna API:er

- `useTerminal()` (`TerminalContext.jsx`): `view`, `setView`, `error`, `register`, `show(tab)`, `state(tab)`, `exitCode(tab)`, `pending(tab)`, `input(tab)`, `type(tab, text, {submit})`, `sequence(tab, steps)`, `restart(tab)`. Returnerar `null` utanför `TerminalProvider`. Providern ligger per projekt i `ProjectView.jsx`; App når den via propen `terminalCommand {seq, action, projectId}`.
- `motionMode(saved)` (`App.jsx:18`): sparat val, annars `reduced` under `prefers-reduced-motion`, annars `full`.
- `windowOptions(settings, platform)` (`src/main/index.js:14`): ren funktion för fönstrets options inklusive `title`; testas i `windowOptions.test.js`.
- `buildMenuTemplate({isMac, isPackaged, state, fullscreen, send, actions})` och `parseMenuState(raw)` (`src/main/menu.js:32`, `:14`): ren menymall respektive validering; testas i `tests/main/menu.test.js`.
- `APP_NAME` (`src/renderer/Splash.jsx:5`, exporterad) och `APP_NAME` (`src/main/menu.js:5`, inte exporterad): två separata konstanter med samma namn.
- `useProject(projectId, space)` och `useFeatures(projectId, space)`: se `component-inventory.md`.
