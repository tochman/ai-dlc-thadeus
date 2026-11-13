# API-dokumentation: aidlc-dash

Appen har inga HTTP-, GraphQL- eller nätverks-API:er. Dess API-yta är Electron-IPC mellan renderaren och huvudprocessen, exponerad som `window.bridge` i `src/preload/index.js`. Varje handler i `src/main/ipc.js` slår upp `projectId` (okänt id ger fel) och går via `projectAccess` för sökvägar. Fel loggas och skickas tillbaka som avvisat promise.

## Invoke-anrop (renderare → main), 28 st

| `window.bridge` | Kanal | Argument | Svar |
|-----------------|-------|----------|------|
| `pickProject` | `project:pick` | – | mappsökväg eller `null` |
| `openProject` | `project:open` | `dir` | `{projectId, root, name, detection}` |
| `closeProject` | `project:close` | `projectId` | – (dödar pty och bevakning) |
| `getSpaces` | `project:spaces` | `projectId` | `string[]` |
| `getIntents` | `project:intents` | `projectId, space, onlyDirs?` | `{intents, warning}` |
| `getIntent` | `project:intent` | `projectId, space, dirName` | detalj: `state, graph, pipeline, events, units, directive, files, warnings, stale?` |
| `getCost` | `project:cost` | `projectId, space` | `{available, project, perIntent, byScope, timeline, ...}` eller `{available:false, reason}` |
| `getModels` | `project:models` | `projectId` | `{source, agents, error?}` |
| `readFile` | `project:file` | `projectId, rel` | text |
| `revealInFinder` | `shell:reveal` | `projectId, rel` | – |
| `openInEditor` | `shell:openInEditor` | `projectId, rel` | – (endast `.md .json .txt .yaml .yml`) |
| `getSettings` / `setSettings` | `settings:get` / `settings:set` | `partial` | `{openProjects, recentProjects, activeProject, projectSettings}` |
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

Varje `on*` returnerar en avregistreringsfunktion.

## Inställningar (relevant för US-0402)

`settings.js` sparar `settings.json` i userData och kör `sanitize()` på allt som läses och skrivs. Endast nycklarna `openProjects`, `recentProjects`, `activeProject` och `projectSettings` behålls. En ny global inställning som "Animationer: Full / Dämpad / Av" måste läggas till i `DEFAULTS` och `sanitize()`, annars tas den bort tyst vid nästa skrivning.

## Interna renderar-API:er

- `useTerminal()` (`TerminalContext.jsx`): `view`, `setView`, `error`, `register`, `show`, `state(tab)`, `exitCode(tab)`, `type(tab, text, {submit})`, `sequence(tab, steps)`, `restart(tab)`. Returnerar `null` utanför `TerminalProvider`.
- `useProject(projectId, space)` och `useFeatures(projectId, space)`: se `component-inventory.md`.
