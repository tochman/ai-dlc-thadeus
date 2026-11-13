# API-dokumentation: aidlc-dash

Appen har inga HTTP-, GraphQL- eller nätverks-API:er. Dess API-yta är Electron-IPC mellan renderaren och huvudprocessen, exponerad som `window.bridge` i `src/preload/index.js`. Invoke-funktioner byggs med `call(channel)` och prenumerationer med `subscribe(channel)`. Varje handler i `src/main/ipc.js` slår upp `projectId` (okänt id ger fel) och går via `projectAccess` för sökvägar. Fel loggas med `[ipc] <kanal> misslyckades` och skickas tillbaka som avvisat promise; renderaren rensar meddelandet med en lokal `errorText()`.

## Invoke-anrop (renderare → main), 28 st

| `window.bridge` | Kanal | Argument | Svar |
|-----------------|-------|----------|------|
| `pickProject` | `project:pick` | – | mappsökväg eller `null` (dialog modal mot `BrowserWindow.fromWebContents(event.sender)`) |
| `openProject` | `project:open` | `dir` | `{projectId, root, name, detection}` |
| `closeProject` | `project:close` | `projectId` | – (dödar pty och bevakning) |
| `getSpaces` | `project:spaces` | `projectId` | `string[]` |
| `getIntents` | `project:intents` | `projectId, space, onlyDirs?` | `{intents, warning}` |
| `getIntent` | `project:intent` | `projectId, space, dirName` | detalj: `state, graph, pipeline, events, units, directive, files, warnings, stale?` |
| `getCost` | `project:cost` | `projectId, space` | `{available, project, perIntent, byScope, timeline, ...}` eller `{available:false, reason}` |
| `getModels` | `project:models` | `projectId` | `{source, agents, error?}` (cachas per öppnat projekt) |
| `readFile` | `project:file` | `projectId, rel` | text |
| `revealInFinder` | `shell:reveal` | `projectId, rel` | – |
| `openInEditor` | `shell:openInEditor` | `projectId, rel` | – (endast `.md .json .txt .yaml .yml`) |
| `getSettings` / `setSettings` | `settings:get` / `settings:set` | `partial` | `{openProjects, recentProjects, activeProject, animations?, projectSettings}` |
| `ptySpawn` | `pty:spawn` | `{projectId, kind: 'claude'|'shell', cols, rows}` | session-id |
| `ptyWrite` / `ptyResize` / `ptyKill` | `pty:write` / `pty:resize` / `pty:kill` | `id, data` / `id, cols, rows` / `id` | – |
| `getGitStatus` | `git:status` | `projectId` | `{isRepo, branch, upstream, tracking, ahead, behind, dirtyAidlc, dirtyOther}` (App visar `branch` i sidhuvudet) |
| `gitFetch` | `git:fetch` | `projectId` | – |
| `getRemoteChanges` | `git:remoteChanges` | `projectId, ref, space` | `{ref, aidlcCommits, aidlcFiles, otherFiles, auditLines, newIntents}` |
| `showRemoteFile` | `git:showRemote` | `projectId, ref, rel` | text (bara under `aidlc/`) |
| `getConflicts` | `git:conflicts` | `projectId` | `string[]` |
| `getSetupInfo` | `setup:info` | `projectId` | förutsättningar, förhandsvisning, plugins, presets |
| `buildSetupCommand` | `setup:command` | `projectId, {needsGit, plugins, preset}` | kommandosträng (körs inte) |
| `loadFeatures` | `features:load` | `projectId` | översikt och epics |
| `getStoryLinks` | `features:storyLinks` | `projectId, space` | `{storyId: dirName[]}` |
| `getProjectSettings` / `setProjectSettings` | `projectSettings:get` / `projectSettings:set` | `projectId, partial` | `{featureDocs, featuresPath}` |

Utöver detta exponeras `platform` (`process.platform`).

## Push-händelser (main → renderare), 6 st

| `window.bridge` | Kanal | Payload |
|-----------------|-------|---------|
| `onProjectChanged` | `project:changed` | `{projectId, space, dirNames, indexChanged, costChanged}` |
| `onProjectDetected` | `project:detected` | `{projectId, detection}` |
| `onWatchError` | `project:watchError` | `{projectId, message}` |
| `onFeaturesChanged` | `features:changed` | `{projectId}` |
| `onPtyData` | `pty:data` | `{id, data}` |
| `onPtyExit` | `pty:exit` | `{id, exitCode, signal}` |

Varje `on*` returnerar en avregistreringsfunktion. Main skickar med `sender.send(...)` efter en `isDestroyed()`-kontroll. Det finns ingen meny- eller fönsterkanal i dag; en sådan (t.ex. `menu:command`) läggs till som en `subscribe`-rad i preload och ett `webContents.send` i main.

## Inställningar (`settings.json`)

`settings.js` sparar `settings.json` i userData (mappen `aidlc-dash`) och kör `sanitize()` på allt som läses och skrivs:

| Nyckel | Typ | Regel |
|--------|-----|-------|
| `openProjects`, `recentProjects` | `string[]` | bara strängar, högst 50 |
| `activeProject` | `string | null` | annars `null` |
| `animations` | `'full' | 'reduced' | 'off'` | utelämnas när den saknas eller är ogiltig, så renderarens standard gäller (FR4.2) |
| `projectSettings` | `{[root]: {featureDocs, featuresPath}}` | högst 200 projekt; ogiltiga värden faller tillbaka på standard |

Alla andra nycklar tas bort tyst. En ny global inställning (t.ex. helskärm i US-0404) måste läggas till i `sanitize()` på samma sätt som `animations`. Skrivningar köas seriellt och slår ihop över senast skrivna värde, så main och renderaren kan skriva olika nycklar utan att tappa varandras ändringar. `setSettings` rör aldrig `projectSettings`; de ändras bara via `setProjectSettings`.

## Interna renderar-API:er

- `useTerminal()` (`TerminalContext.jsx`): `view`, `setView`, `error`, `register`, `show`, `state(tab)`, `exitCode(tab)`, `type(tab, text, {submit})`, `sequence(tab, steps)`, `restart(tab)`. Returnerar `null` utanför `TerminalProvider`. Providern ligger per projekt i `ProjectView.jsx`, inte i App.
- `motionMode(saved)` (`App.jsx`): sparat val, annars `reduced` under `prefers-reduced-motion`, annars `full`.
- `useProject(projectId, space)` och `useFeatures(projectId, space)`: se `component-inventory.md`.
