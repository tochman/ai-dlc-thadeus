# API-dokumentation: aidlc-dash

Appen har inga HTTP-API:er och gör inga nätverksanrop. Dess API-yta är Electron-IPC mellan renderer och main, exponerad via preload som `window.bridge`. Alla anrop är `ipcRenderer.invoke` och returnerar ett Promise; ett fel i main loggas och blir ett avvisat Promise (`ipc.js:96-107`).

## Anrop (renderer → main)

| `window.bridge` | Kanal | Argument | Returnerar |
|---|---|---|---|
| `pickProject()` | `project:pick` | – | vald mapp eller `null` |
| `openProject(dir)` | `project:open` | mappsökväg | `{projectId, root, name, detection}` där `detection = {isAidlc, activeSpace, spaces}` eller `{isAidlc:false, reason}` |
| `closeProject(id)` | `project:close` | projectId | – (stänger pty-sessioner och bevakning) |
| `getSpaces(id)` | `project:spaces` | projectId | `string[]` |
| `getIntents(id, space, onlyDirs?)` | `project:intents` | projectId, space, valfri lista intent-mappar att läsa om | `{intents[], warning}`; startar om bevakning om space byts |
| `getIntent(id, space, dirName)` | `project:intent` | projectId, space, intent-mapp | `{dirName, base, request, state, graph, pipeline, events, units, directive, files, warnings, stale?}` |
| `readFile(id, rel)` | `project:file` | projectId, rotrelativ sökväg | filens text |
| `revealInFinder(id, rel)` | `shell:reveal` | projectId, rotrelativ sökväg | – |
| `openInEditor(id, rel)` | `shell:openInEditor` | projectId, rotrelativ sökväg | – ; bara `.md .json .txt .yaml .yml` |
| `getSettings()` | `settings:get` | – | `{openProjects, recentProjects, activeProject}` |
| `setSettings(partial)` | `settings:set` | delobjekt | sanerade inställningar |
| `ptySpawn({projectId, kind, cols, rows})` | `pty:spawn` | `kind` = `claude` eller `shell` | sessions-id |
| `ptyWrite(id, data)` | `pty:write` | id, sträng | – |
| `ptyResize(id, cols, rows)` | `pty:resize` | id, heltal 1–999 | – |
| `ptyKill(id)` | `pty:kill` | id | – |

## Händelser (main → renderer)

| Prenumeration | Kanal | Payload |
|---|---|---|
| `onProjectChanged(cb)` | `project:changed` | `{projectId, space, dirNames: string[], indexChanged: boolean}` |
| `onWatchError(cb)` | `project:watchError` | `{projectId, message}` |
| `onPtyData(cb)` | `pty:data` | `{id, data}` |
| `onPtyExit(cb)` | `pty:exit` | `{id, exitCode, signal}` |

Varje prenumeration returnerar en avregistreringsfunktion. `window.bridge.platform` är `process.platform`.

## Validering och säkerhet

- `projectId` måste vara ett öppnat projekt (`Okänt projekt`-fel annars).
- `space` och `dirName` valideras av `assertName` (ingen `/`, `\`, inte punktprefix).
- Sökvägar går genom `resolveInRoot` (ingen absolut sökväg, ingen `..`, ingen symlänk ut ur roten).
- Renderer-CSP i `index.html`: `default-src 'self'`, ingen `object-src`, `connect-src 'self' ws:`.
- Fönstret blockerar navigering; externa `http(s)`-länkar öppnas i OS-webbläsaren.

## Externa datakontrakt (filer som läses)

`aidlc/spaces/<space>/intents/intents.json`, `active-intent`, `<dir>/aidlc-state.md`, `<dir>/runtime-graph.json`, `<dir>/project-description.json`, `<dir>/audit/*.md`, `<dir>/.aidlc-engine/active-directive.json`, `aidlc/active-space`. Parsningsreglerna finns i `component-inventory.md` (parsers).

**Läses inte i dag (EPIC-02):** `aidlc/.aidlc-sessions/usage-ledger.json` (`schemaVersion: 3`; `totals`, `byStage`, `byModel`, `byAgent`, `workflows["record:<space>/<dir>"]`), `aidlc config models --show --json` och `.claude/agents/aidlc-*-agent.md`-frontmatter.
