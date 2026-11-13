# API Documentation — aidlc-dash

Appen har inga HTTP-endpoints och ingen databas. API-ytorna är Electron-IPC, preload-bryggan och de filer och kommandon appen läser.

## IPC request/response (`ipcMain.handle`, `src/main/ipc.js`)

Alla handlers loggar fel och kastar vidare (renderaren får ett avvisat promise). `projectId` slås upp i en in-memory-map; okänt id ger fel.

| Kanal | Bridge-funktion | Argument | Svar |
|---|---|---|---|
| `project:pick` | `pickProject()` | – | vald mappsökväg eller `null` |
| `project:open` | `openProject(dir)` | sökväg | `{projectId, root, name, detection}`; `detection = {isAidlc, activeSpace, spaces}` eller `{isAidlc:false, reason}` |
| `project:close` | `closeProject(id)` | projectId | – (dödar terminaler, stänger watcher) |
| `project:spaces` | `getSpaces(id)` | projectId | `string[]` |
| `project:intents` | `getIntents(id, space, onlyDirs?)` | | `{intents[], warning}` (se intent-fält nedan) |
| `project:intent` | `getIntent(id, space, dirName)` | | `{dirName, base, request, state, graph, pipeline, events, units, directive, files, warnings, stale?}` |
| `project:cost` | `getCost(id, space)` | | `{available:false, reason}` eller `{available:true, project, perIntent, byScope, timeline, stale?, warning?}` |
| `project:models` | `getModels(id)` | | `{source:'aidlc-config'|'agent-files'|'none', agents[{agent, model, effort}], error?}` (cachas per projectId, kastar aldrig) |
| `project:file` | `readFile(id, rel)` | rotrelativ sökväg | filtext |
| `shell:reveal` | `revealInFinder(id, rel)` | | – |
| `shell:openInEditor` | `openInEditor(id, rel)` | endast `.md .json .txt .yaml .yml` | – |
| `settings:get` | `getSettings()` | | `{openProjects[], recentProjects[], activeProject}` |
| `settings:set` | `setSettings(partial)` | | sanerade inställningar (listor max 50) |
| `pty:spawn` | `ptySpawn({projectId, kind, cols, rows})` | `kind: 'claude'|'shell'` | session-id |
| `pty:write` | `ptyWrite(id, data)` | sträng | – |
| `pty:resize` | `ptyResize(id, cols, rows)` | heltal 1–999 | – |
| `pty:kill` | `ptyKill(id)` | | – |
| `git:fetch`, `git:status`, `git:remoteChanges`, `git:showRemote`, `git:conflicts` | (EPIC-05 US-0502) | | ytligt skannat: bara kanalnamnen i `preload/index.js` är verifierade |
| `setup:info`, `setup:command` | (EPIC-05 US-0503) | | ytligt skannat |

**Intent i listan** (`mergeIntents` + `summarizeIntent`): `uuid, slug, dirName, scope, status, date, active, missingOnDisk, missingInIndex, request, currentStage, stateStatus, done, executed, error?, stale?`.

**Audit-händelse i `detail.events`** (`mergeAudits` + `categoryOf`, verifierat): `{timestamp, event, title, fields, source, seq, category}`.
- `timestamp` och `event` lyfts ur fälten `**Timestamp**` och `**Event**` (eller `null`); `fields` är övriga `**Nyckel**: värde`, flerradiga värden fortsätter på följande rader.
- `title` är blockets `## Rubrik` (eller `null`); `source` är shardens filnamn (t.ex. `machine-a.md`).
- `seq` är heltalsindex i den sammanslagna listan efter stabil sortering på `timestamp` som sträng (`null` räknas som `''`). Det är **inte** stabilt mellan laddningar om en händelse med äldre tidsstämpel tillkommer.
- `category` ∈ `error | gate | subagent | unit | guard | human | stage | other`.
- Listan är komplett och osorterad efter filter; renderaren filtrerar och vänder ordningen.

## IPC push-händelser (renderer-prenumerationer)

| Kanal | Bridge | Payload |
|---|---|---|
| `project:changed` | `onProjectChanged(cb)` | `{projectId, space, dirNames[], indexChanged, costChanged}` — säger vilken intent, aldrig vilken fil |
| `project:watchError` | `onWatchError(cb)` | `{projectId, message}` |
| `project:detected` | (EPIC-05) | ytligt: utlöses när `watchForAidlc` ser en första space |
| `pty:data` | `onPtyData(cb)` | `{id, data}` |
| `pty:exit` | `onPtyExit(cb)` | `{id, exitCode, signal}` |

`window.bridge.platform` exponerar `process.platform`.

## Renderer-internt kontrakt: Timeline

`<Timeline events newSeqFrom />` (`src/renderer/Timeline.jsx`), anropas från `IntentDetail.jsx:108` med `detail.events` och `newSeqFrom` från `useProject` (via `ProjectView.jsx:52`).
- `newSeqFrom`: `number | null`; rader med `seq >= newSeqFrom` får klassen `is-new` (CSS-animation `flash 4s`, `theme.css:267`).
- `data-testid`: `timeline`, `timeline-event`, `timeline-noise-toggle`, `timeline-type-filter`, `timeline-stage-filter`.

## Lästa filkontrakt (AI-DLC-format, rotrelativt)

| Fil | Tolkas av |
|---|---|
| `aidlc/active-space` | `detectProject` |
| `aidlc/spaces/<space>/intents/intents.json` | `parsers/intents.js` |
| `.../intents/active-intent` | `loadIntentList` |
| `.../<intent>/aidlc-state.md` | `parsers/state.js` (fält, `### <PHASE> PHASE`, checkboxar ` - ? R x S`) |
| `.../<intent>/runtime-graph.json` | `parsers/runtimeGraph.js` (stages, `bolt_dag`) |
| `.../<intent>/audit/*.md` | `parsers/audit.js`: block åtskilda av `---`-rader, `## Titel`, `**Nyckel**: värde`; varje block med titel eller fält behålls |
| `.../<intent>/.aidlc-engine/active-directive.json` | `buildDetail` (kind, stage, delivery) |
| `.../<intent>/project-description.json` | `loadDescription` |
| `.../<intent>/<phase>/**` (djup 3) | `listArtifacts` |
| `aidlc/.aidlc-sessions/usage-ledger.json` | `parsers/ledger.js` (schemaVersion 3) |
| `.claude/agents/aidlc-*-agent.md` (frontmatter `model`, `effort`) | `models.js` (reserv) |

## Externa kommandon

| Kommando | Var | Villkor |
|---|---|---|
| `$SHELL -l -i -c 'printf ...$PATH'` | `models.js` | en gång per process, 5 s timeout |
| `aidlc config models --show --json --harness claude` | `models.js` | `execFile`, cwd = rot, 10 s timeout, svaret ska ha `ok:true` och `data.effective[]` |
| `$SHELL -l -i -c claude` / `$SHELL -l` | `pty.js` | node-pty, cwd = rot, `TERM=xterm-256color` |
| `git fetch/rev-parse/rev-list/diff/status/show`, `aidlc …` | `exec.js` via `git.js`/`setup.js` (EPIC-05) | ytligt: `execFile` utan skal, fasta argument, timeout (enligt filkommentarer) |
