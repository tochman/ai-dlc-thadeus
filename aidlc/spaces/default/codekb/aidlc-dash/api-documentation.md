# API Documentation — aidlc-dash

Appen har inga HTTP-endpoints och ingen databas. API-ytorna är Electron-IPC, preload-bryggan och de filer och kommandon appen läser.

## IPC request/response (`ipcMain.handle`, `src/main/ipc.js`)

Alla handlers ligger i tabellen `handlers` (`ipc.js:84-162`), registreras i en loop och loggar fel och kastar vidare (renderaren får ett avvisat promise, med prefixet "Error invoking remote method" som vyerna tar bort). `projectId` slås upp i en in-memory-map `projects` (`{root, space, watcher, setupWatcher, sender, models, setupInfo}`); okänt id ger fel.

| Kanal | Bridge-funktion | Argument | Svar |
|---|---|---|---|
| `project:pick` | `pickProject()` | – | vald mappsökväg eller `null` |
| `project:open` | `openProject(dir)` | sökväg | `{projectId, root, name, detection}`; `root` är realpath; `detection = {isAidlc, activeSpace, spaces}` eller `{isAidlc:false, reason}`. Startar `watchSpace` (AI-DLC) eller `watchForSetup` (annars) |
| `project:close` | `closeProject(id)` | projectId | – (dödar terminaler, stänger båda bevakarna) |
| `project:spaces` | `getSpaces(id)` | projectId | `string[]` |
| `project:intents` | `getIntents(id, space, onlyDirs?)` | | `{intents[], warning}` (se intent-fält nedan); startar om bevakaren vid spacebyte |
| `project:intent` | `getIntent(id, space, dirName)` | | `{dirName, base, request, state, graph, pipeline, events, units, directive, files, warnings, stale?}` |
| `project:cost` | `getCost(id, space)` | | `{available:false, reason}` eller `{available:true, project, perIntent, byScope, timeline, stale?, warning?}` |
| `project:models` | `getModels(id)` | | `{source:'aidlc-config'|'agent-files'|'none', agents[{agent, model, effort}], error?}` (cachas per projectId, kastar aldrig) |
| `project:file` | `readFile(id, rel)` | valfri rotrelativ sökväg | filtext (UTF-8). Inte begränsad till `aidlc/`: `docs/FEATURES.md` och `FEATURES.md` i roten går att läsa |
| `shell:reveal` | `revealInFinder(id, rel)` | | – |
| `shell:openInEditor` | `openInEditor(id, rel)` | endast `.md .json .txt .yaml .yml` | – |
| `settings:get` | `getSettings()` | | `{openProjects[], recentProjects[], activeProject}` |
| `settings:set` | `setSettings(partial)` | | sanerade inställningar; okända nycklar tas bort, listor max 50 |
| `pty:spawn` | `ptySpawn({projectId, kind, cols, rows})` | `kind: 'claude'|'shell'` | session-id |
| `pty:write` | `ptyWrite(id, data)` | sträng | – |
| `pty:resize` | `ptyResize(id, cols, rows)` | heltal 1–999 | – |
| `pty:kill` | `ptyKill(id)` | | – |
| `git:status` | `getGitStatus(id)` | | git.js (svarsform ytligt skannad) |
| `git:fetch` | `gitFetch(id)` | | git.js |
| `git:remoteChanges` | `getRemoteChanges(id, ref, space)` | `ref` och `space` (standard `default`) som strängar | git.js |
| `git:showRemote` | `showRemoteFile(id, ref, rel)` | | git.js; ref och sökväg kontrolleras mot grenens upstream |
| `git:conflicts` | `getConflicts(id)` | | git.js |
| `setup:info` | `getSetupInfo(id)` | | `{git:{isRepo}, harnesses[], presets[], plugins[], preview, aidlc:{installed, version} | {installed:false, error}, warning?}`; sparas som `setupInfo` i projektregistret |
| `setup:command` | `buildSetupCommand(id, options)` | `{needsGit, plugins[], preset}` | kommandokedja (sträng, `&&`-sammanfogad); plugins måste finnas i senaste `setupInfo.plugins`, annars fel |

**Ingen** kanal listar en katalog eller frågar om en fil finns; `listDir` och `exists` i `projectAccess.js` används bara i huvudprocessen.

**Intent i listan** (`mergeIntents` + `summarizeIntent`): `uuid, slug, dirName, scope, status, date, active, missingOnDisk, missingInIndex, request, currentStage, stateStatus, done, executed, error?, stale?`.

**Audit-händelse i `detail.events`** (`mergeAudits` + `categoryOf`): `{timestamp, event, title, fields, source, index, key, seq, category}`.
- `timestamp` och `event` lyfts ur fälten `**Timestamp**` och `**Event**` (eller `null`); `fields` är övriga `**Nyckel**: värde`, flerradiga värden fortsätter på följande rader.
- `title` är blockets `## Rubrik` (eller `null`); `source` är shardens filnamn (t.ex. `machine-a.md`).
- Sedan EPIC-03 *(ytligt)*: `index` är blockets position i sin shard och `key` = `<source>#<index>`, stabil så länge shards bara växer i slutet. `seq` är fortfarande index i den sammanslagna, tidssorterade listan.
- `category` ∈ `error | gate | subagent | unit | guard | human | stage | other`.
- Listan är komplett och osorterad efter filter; renderaren filtrerar och vänder ordningen.

## IPC push-händelser (renderer-prenumerationer)

| Kanal | Bridge | Payload |
|---|---|---|
| `project:changed` | `onProjectChanged(cb)` | `{projectId, space, dirNames[], indexChanged, costChanged}` — säger vilken intent, aldrig vilken fil; gäller bara intents-mappen och ledgern |
| `project:watchError` | `onWatchError(cb)` | `{projectId, message}` |
| `project:detected` | `onProjectDetected(cb)` | `{projectId, detection}`; skickas när `watchForAidlc` ser en första space och omdetekteringen ger `isAidlc` |
| `pty:data` | `onPtyData(cb)` | `{id, data}` |
| `pty:exit` | `onPtyExit(cb)` | `{id, exitCode, signal}` |

`window.bridge.platform` exponerar `process.platform`. Bryggan har 24 anrop och 5 prenumerationer (`src/preload/index.js`); en ny kanal kräver ändring i både `ipc.js` och preload.

## Renderer-internt kontrakt: Timeline *(ytligt, efter EPIC-03)*

`<Timeline events newKeys />` (`src/renderer/Timeline.jsx`), anropas från `IntentDetail.jsx:108` med `detail.events` och `newKeys` från `useProject` (via `ProjectView.jsx:52`).
- `newKeys`: `Set` av händelsenycklar (`key`) som tillkommit vid de senaste liveuppdateringarna, eller `null`; raderna markeras på identitet, inte på antal.
- Fönstring med `useVirtualizer` (`@tanstack/react-virtual`); radnyckel och mätning via virtualiseraren.
- `data-testid` sedda: `timeline-jump-newest` (övriga från förra skanningen, inte omverifierade).

## Renderer-internt kontrakt: FileContent

`<FileContent rel content />` (exporterad från `src/renderer/ArtifactReader.jsx:24-34`): `.md` → react-markdown + remark-gfm med `skipHtml`, länkar som `<span class="md-link" title=href>` och bilder som `[bild: alt]`; `.json` → snyggformaterad, ogiltig JSON visas som den är; annat → `<pre>`. Används av ArtifactReader och RefreshPanel. Den interna `FileView` (läsning via `readFile`, knapparna "Visa i Finder"/"Visa i filhanteraren" och "Öppna i editor") är inte exporterad.

## Lästa filkontrakt (rotrelativt)

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
| `.kiro/`, `.codex/`, `.cursor/`, `.aidlc/` (finns/finns inte) | `getSetupInfo` (`listDir(root, '.')`) |

Feature-dokumenten (`docs/FEATURES.md`, `docs/features/epic-XX-<slug>.md`) läses inte av appen i dag. Formatet beskrivs i [business-overview.md](business-overview.md) § Aktiv intent.

## Externa kommandon

| Kommando | Var | Villkor |
|---|---|---|
| `$SHELL -l -i -c 'printf ...$PATH'` | `models.js` | en gång per process, 5 s timeout |
| `aidlc config models --show --json --harness claude` | `models.js` | `execFile`, cwd = rot, 10 s timeout, svaret ska ha `ok:true` och `data.effective[]` |
| `$SHELL -l -i -c claude` / `$SHELL -l` | `pty.js` | node-pty, cwd = rot, `TERM=xterm-256color` |
| `aidlc --version` | `setup.js` via `runFixed` | saknas verktyget stannar `getSetupInfo` med `aidlc.installed:false` |
| `aidlc --project-dir <root> config --harness claude --dry-run` | `setup.js` | förhandsvisning; `parsePreview` läser `create=N … conflict=N`, konfliktrader och `Note:`-rader |
| `aidlc config project --show --json` | `setup.js` | `data.installedPlugins`, filtrerat mot `^[a-z0-9-]+$` |
| `git fetch/rev-parse/rev-list/diff/status/show` | `exec.js` via `git.js` (EPIC-05) | ytligt: `execFile` utan skal, fasta argument, timeout |

**Byggs men körs aldrig av appen** (`buildSetupCommand`, skrivs i shell-fliken utan Enter): `git init -b main` (om inget repo) `&& aidlc --project-dir . config --harness claude --yes` `[&& aidlc config project --plugins a,b --yes]` `[&& aidlc config models --preset <thorough|balanced|minimal> --project --yes]`.
