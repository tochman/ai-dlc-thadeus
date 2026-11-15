# API Documentation

The app has no network API. Its API surfaces are the Electron IPC boundary between renderer and main, the external CLIs main runs, and the file formats it reads. All IPC handlers live in `src/main/ipc.js` (`handlers` object, registered by `registerIpc()`); each is wrapped so an error is logged and rethrown to the renderer as a rejected promise.

## 1. Preload bridge (`window.bridge`)

`src/preload/index.js` exposes 87 members: 71 request/response calls (`ipcRenderer.invoke`), 14 subscriptions (`ipcRenderer.on`, each returns an unsubscribe function), plus `platform` (`process.platform`) and `pathForFile(file)` (`webUtils.getPathForFile`, for dropped files). There is no generic `invoke` or `send`.

## 2. Invoke channels (renderer → main), 71

Every handler that takes a `projectId` looks it up in the `projects` map and throws `errors.unknownProject` for anything else; every root-relative path goes through `projectAccess.resolveInRoot` (absolute paths, `..` and symlinks out of the root are refused).

| Area | Channel → bridge member | Arguments → result | Notes |
|---|---|---|---|
| Projects | `project:pick` → `pickProject` | () → path or null | native folder dialog at the saved default folder |
| | `project:open` → `openProject` | (dir) → `{projectId, root, name, detection}` | starts watchers and harness detection |
| | `project:close` → `closeProject` | (projectId) | kills the project's ptys, closes watchers, re-sends questions |
| | `project:spaces` → `getSpaces` | (projectId) → string[] | |
| | `project:intents` → `getIntents` | (projectId, space, onlyDirs?) → `{intents, warning}` | (re)starts the space watcher |
| | `project:intent` → `getIntent` | (projectId, space, dirName) → intent detail | state, graph, pipeline, events, units, directive, files |
| | `project:cost` → `getCost` | (projectId, space) → ledger summary or `{available:false, reason}` | |
| | `project:models` → `getModels` | (projectId) → configured models | cached per opened project |
| | `project:file` → `readFile` | (projectId, rel) → text | |
| | `project:listTree` → `listTree` | (projectId) → `{files, truncated}` | `git ls-files`, else a walk, max 20000 |
| Questions | `questions:list` → `listQuestions` | () → question[] | all open projects, newest first, `early` flag |
| | `questions:activeProject` → `setActiveProject` | (projectId or null) | tells main which tab is shown (notification rule) |
| Harness | `harness:detect` → `detectHarnesses` | (projectId) → `{id,label,selectable,installed,cli}`[] | promise started at project open |
| Config (US-0901/0902) | `config:get` → `getAidlcConfig` | (projectId, harness) → sections + `activeDir` | harness must be installed |
| | `agents:working` → `getWorkingAgents` | (projectId) → working agents | from inflight file + audit |
| | `config:preview` / `config:apply` → `previewConfigChange` / `applyConfigChange` | (projectId, `{kind,key,value,where}`) | built from `configTables.js` only |
| | `config:guardLockPreview` / `config:guardLockApply` → `previewGuardLock` / `applyGuardLock` | (projectId, `{layer,mode}`) / (projectId) | apply writes exactly the previewed diff |
| Plans (US-0903) | `plans:list`, `plans:stages`, `plans:save`, `plans:previewEdit`, `plans:applyEdit`, `plans:delete` → `listPlans`, `getPlanStages`, `savePlan`, `previewPlanEdit`, `applyPlanEdit`, `deletePlan` | plan name + three editable fields only | |
| Models (US-0904) | `models:options`, `models:preview`, `models:apply`, `models:check` → `getModelOptions`, `previewModelChange`, `applyModelChange`, `checkModels` | `{harness, agent|preset|group, model?, effort?, where}` | |
| Updater (US-0407) | `update:check`, `update:download`, `update:install`, `update:relaunch`, `update:skip`, `update:reveal` → `checkUpdate`, `downloadUpdate`, `installUpdate`, `relaunchApp`, `skipUpdate`, `revealUpdate` | no URL or file crosses the bridge | |
| Editor (US-1001) | `file:read` → `readFileForEdit` | (projectId, rel) → `{content, mtimeMs, hash, size, readOnly}` | |
| | `file:write` → `writeFile` | (projectId, rel, content, `{mtimeMs, hash}`) → ok or `{conflict, disk}` | engine-owned paths refused |
| | `file:watch` → `watchOpenFiles` | (projectId, rels) | sends `file:changed` |
| | `app:closeConfirmed` → `confirmClose` | (ok) | answer to `app:confirmClose` |
| Shell | `shell:reveal` → `revealInFinder`, `shell:openInEditor` → `openInEditor` | (projectId, rel) | openInEditor only `.md .json .txt .yaml .yml` |
| Git (US-0502) | `git:status`, `git:fetch`, `git:remoteChanges`, `git:showRemote`, `git:conflicts` → `getGitStatus`, `gitFetch`, `getRemoteChanges`, `showRemoteFile`, `getConflicts` | ref must be the branch upstream or `origin/main` | read-only git |
| Setup (US-0503/0802) | `setup:info` → `getSetupInfo`, `setup:run` → `runSetup` | (projectId, `{harness}`) / (projectId, `{harness, mode, plugins, preset}`) | run only after a preview for the same harness |
| App settings | `settings:get`, `settings:set` → `getSettings`, `setSettings` | partial object, sanitised | `settings:set` may rebuild the menu on a language change |
| | `settings:pickDefaultFolder`, `settings:clearDefaultFolder` | | |
| Tools (US-0405) | `tools:info`, `tools:pick`, `tools:save`, `tools:reset` → `getTools`, `pickTool`, `saveTool`, `resetTool` | tool id from `aidlc|claude|shell` | a path is validated before it is stored |
| App | `app:info` → `getAppInfo`, `app:openExternal` → `openExternal`, `app:openDocsUrl` → `openDocsUrl` | external links by fixed key (`repo`, `features`, `docs`) | |
| i18n | `i18n:language` → `getLanguage` | () → `sv` or `en` | auto resolved |
| Feature docs | `features:load` → `loadFeatures`, `features:storyLinks` → `getStoryLinks` | | |
| Project settings | `projectSettings:get`, `projectSettings:set` → `getProjectSettings`, `setProjectSettings` | `{featureDocs, featuresPath, harness, harnessTabs}` | per project root, in the app's settings |
| Terminal | `pty:spawn` → `ptySpawn` | `{projectId, kind:'agent'|'shell', harness, cols, rows}` → session id | the agent CLI comes from the harness table by id |
| | `pty:write` → `ptyWrite` | (id, string) | any string to any live session id |
| | `pty:resize` → `ptyResize`, `pty:kill` → `ptyKill` | | |
| Window/menu | `window:toggleFullscreen`, `window:isFullscreen`, `menu:state` → `toggleFullscreen`, `isFullscreen`, `sendMenuState` | `menu:state` accepts exactly three booleans | |

## 3. Push channels (main → renderer), 14

| Channel → bridge subscription | Payload | Sent by |
|---|---|---|
| `pty:data` → `onPtyData` | `{id, data}` | `pty.js` on pty output |
| `pty:exit` → `onPtyExit` | `{id, exitCode, signal}` | `pty.js` |
| `project:changed` → `onProjectChanged` | `{projectId, space, dirNames, indexChanged, costChanged}` | intents/ledger watcher |
| `project:detected` → `onProjectDetected` | `{projectId, detection}` | setup watcher once AI-DLC appears |
| `project:watchError` → `onWatchError` | `{projectId, message}` | watcher error |
| `questions:changed` → `onQuestions` | question[] (all open projects) | `ipc.js publishQuestions` |
| `questions:focus` → `onQuestionFocus` | question id | notification click (`notify.js`) |
| `config:changed` → `onConfigChanged` | `{projectId}` | config watcher, successful applies |
| `features:changed` → `onFeaturesChanged` | `{projectId}` | feature-docs watcher, project settings save |
| `file:changed` → `onFileChanged` | `{projectId, rel}` | open-file watcher (editor) |
| `update:state` → `onUpdateState` | update state, download progress | updater |
| `window:fullscreen` → `onFullscreen` | boolean | window events (`index.js`) |
| `menu:command` → `onMenuCommand` | `{command, ...args}` | app menu |
| `app:confirmClose` → `onConfirmClose` | none | window close guard |

## 4. The question contract (intent area)

`questions:changed` and `questions:list` carry objects built by `pendingQuestions()` (`src/main/questions.js`) and extended in `ipc.js`:

```text
{ id, projectId, projectName, intent, stage, unit,
  kind: 'question' | 'gate',
  text,                 // DECISION_RECORDED.Decision; '' for a gate or an engine ask
  options: string[],    // labels; [] for a gate
  batch: [{id:'Q1', options}] | null,
  ask: 'plan-approval' | 'scope-confirm' | <Question Type> | null,
  nextStage, timeMs,
  early: boolean }      // waited already when the project was opened (no popup, no notification)
```

Opening and closing rules (from audit events, in time order):

| Event | Effect |
|---|---|
| `DECISION_RECORDED` | opens a `question`; `Options` parsed by `parseOptions` (JSON, comma, pipe or semicolon lists, `Q<n>:` batch summaries; descriptions in parentheses stripped) |
| `STAGE_AWAITING_APPROVAL` | opens a `gate` with `Next Stage` |
| `QUESTION_ASKED` (not type `gate`, JSON `Options`) | opens an engine ask (`ask` = `Question Type`) |
| `QUESTION_REPLIED` | closes the engine ask whose option set equals the reply's `Options` |
| `QUESTION_ANSWERED` | closes the oldest same-stage (and same-unit) question whose options the `Person Reply`/`Details` names, else the newest |
| `PLAN_APPROVAL_RECORDED`, `PLAN_APPROVAL_SKIPPED`, `REQUEST_ROUTED` | close engine asks (of that stage, or all without a stage) |
| `GATE_APPROVED`, `GATE_REJECTED`, `STAGE_COMPLETED`, `STAGE_SKIPPED`, `STAGE_STARTED` | close everything of that stage (and unit) |

The answer is not an IPC call: the popup's `onSend` resolves through `TerminalContext.answer()` in the renderer, which writes keys with `pty:write` (see `architecture.md`, "Question popup" sequence). `resolveAnswer()` returns `{tab, keys}` or `{error: 'noPicker' | 'several' | 'mismatch'}`; the three errors map to `app.question.noPicker`, `app.question.several`, `app.question.mismatch` in the locales.

## 5. External commands main runs

All through `runFixed()` (`src/main/exec.js`): `execFile` without a shell, every argument a string, a timeout (default 10 s), `PATH` from the login shell (probed once with `$SHELL -l -i -c`).

| Command | Used by | Timeout |
|---|---|---|
| `aidlc --version`, `aidlc --project-dir <root> config --harness <id> --dry-run|--yes`, `aidlc config project --show --json [--harness]`, `aidlc config project --plugins … --harness … --yes`, `aidlc config models --preset … --project --harness … --yes` | `setup.js` | 10 s / 120 s per step |
| `aidlc config <models|flags|providers|project> --show --json --harness <h>`, `aidlc config list --json` | `aidlcConfig.js` | 10 s |
| `aidlc config <section> <flag> <value> [--project|--local|--global] --yes|--dry-run`, `aidlc engine config set <key> <value>`, `aidlc config flags --bypass|--clear-bypass <switch> …` | `aidlcWrite.js` | 20 s / 120 s |
| `aidlc engine scope save --name <n>`, `aidlc engine graph compile` | `plans.js` | 120 s |
| `aidlc config models … --harness <claude|opencode> --project|--local`, `aidlc config models --check --harness …`, `opencode models` | `modelChoice.js`, `models.js` | 20 s / 10 s |
| `git rev-parse`, `rev-list`, `diff`, `status --porcelain`, `show`, `fetch --quiet`, `ls-files` | `git.js`, `fileWrite.js` | 10 s, fetch 30 s |
| `<harness cli> --version` | `harness.js`, `tools.js` | 10 s |
| `gh release view|download --repo tochman/aidlc-dash …`, `hdiutil`, `ditto`, `xattr`, `osascript`, `pkexec dpkg -i` | `updater.js` | 20 s to 30 min |

The agent and shell terminals are not `runFixed` calls: `pty.js` spawns `$SHELL -l -i -c <cli>` (agent, `cli` from `HARNESSES` or the saved tool path, single-quoted when it is not a bare word) or `$SHELL -l` (shell) with `TERM=xterm-256color`.

## 6. Files read (contracts with AI-DLC)

| File | Reader | Shape relied on |
|---|---|---|
| `aidlc/spaces/<space>/intents/intents.json` | `parsers/intents.js` | array of `{dirName, uuid, slug, scope, status}` |
| `<record>/aidlc-state.md` | `parsers/state.js` | `## Section` of `- **Key**: value`; `### <NAME> PHASE` checkbox lists `- [x] slug — EXECUTE|SKIP` |
| `<record>/audit/*.md` | `parsers/audit.js` | `## Title` blocks of `**Key**: value` separated by `---`; `Timestamp`, `Event`, `Stage`, `Unit`, `Options`, `Question Id`, `Question Type`, `Decision`, `Person Reply`, `Details`, `Next Stage`, `Agent Type` |
| `<record>/runtime-graph.json` | `parsers/runtimeGraph.js` | `stages[].stage_slug/started_at/completed_at/outcome`, `bolt_dag.units/batches` |
| `<record>/.aidlc-engine/active-directive.json` | `projectService.js` | `kind`, `stage`, `delivery` |
| `aidlc/.aidlc-sessions/usage-ledger.json` | `parsers/ledger.js` | schemaVersion 3, `workflows["intent:<uuid>"]`, `byStage/byAgent/byModel`, `totals.tokens`, `usd` |
| `aidlc/.aidlc-subagent-inflight` | `projectService.js` | `{entries: [...]}` |
| `aidlc/active-space`, `<intents>/active-intent` | `projectService.js` | one line |
| `docs/FEATURES.md`, `docs/features/epic-*.md` | `parsers/features.js` | epic table; `**US-XXYY: title** status`, `- [x]` criteria |
| `<harness dir>/scopes/*.md`, `aidlc/scopes/*.md`, `<harness dir>/tools/data/scope-grid.json` | `plans.js` | frontmatter, composed-grid JSON block |
