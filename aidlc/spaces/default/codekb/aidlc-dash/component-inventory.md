# Component Inventory

One heading per component; the heading text is the component's name in the Scope of Analysis block. Paths are repo-relative. The external packages are in `dependencies.md`.

This run (`0ebb196`, US-0030) re-read these components: Agent Event Store, Agent Progress Loader, Agent Progress Parser, Agent Activity Model, AgentProgress, TokenDetail, Dialog Hook Script, IPC Router (the progress handlers only) and Preload Bridge (the progress members only). The other entries are from earlier scans (`721e051`, `f46cb71`, `bbfb4c0`, `2b5d6a4`), or were only listed, which is marked.

## Main process (`src/main/`)

### Main Entry
- `src/main/index.js`: the app lifecycle, single instance, `windowOptions()` (sandbox, contextIsolation), the navigation block, the close guard, the update check and shutdown.

### IPC Router
- `src/main/ipc.js` (1070 lines at `2b5d6a4`): the invoke handlers in one table, wrapped by `registerIpc` (log, then rethrow).
- Per-project state in `projects`: root, space, watchers, sender, `harnesses` (a detection promise), `models`, `modelOptions`, pending previews and `questions`.
- `watchSpace` starts `watchIntents`. Its `onChange` sends `project:changed` and calls `refreshQuestions`, which keeps a `startedWith` baseline: ids from a project's first computation never alert.
- `harnessModelOptions` checks that the harness is installed (`checkHarness`) and caches the model list.
- `sendConfigChanged`.
- `projectSettings:set` passes through only `featureDocs`, `featuresPath`, `harness`, `harnessTabs` and `delivery` (as of `2b5d6a4`).
- Agent progress (re-read at `0ebb196`): `agents:progress(projectId, dirName)` → `loadAgentProgress(root, space, dirName)`; `agentActivity:list(projectId)` → `agentStore.activity(projectId)`; `store.onActivity` sends `agent:activity` to every window (lines 458-461, 816-824).

### Project Service
- `src/main/projectService.js` (417 lines):
  - `detectProject`;
  - `loadIntentList`, which caches per root and space, keeps the previous index when `intents.json` is half-written, and re-reads only `onlyDirs`;
  - `summarizeIntent` (`stateScope`, `plan`, `request`, `currentStage`, `stateStatus`, `done`, `executed`, `activityAt`);
  - `inProgress(intent)`: false for `complete` or `archived`, a `Complete…` state status, or all executed stages done;
  - `loadAuditEvents`, `workingAgents`, `inflightCount`, `loadPendingQuestions`, `loadCost`, `loadCrossMachineCost`, and the velocity loader.
- `workingAgents(events)` (skimmed at `0ebb196`): open `SUBAGENT_DISPATCHED` per agent type and stage, closed by `SUBAGENT_COMPLETED` or the stage's `STAGE_COMPLETED`.
- It defines `LEDGER_PATH`, `INFLIGHT_PATH`, `intentsDir` and `assertName`.

### Project Access
- `src/main/projectAccess.js`: root-confined reads (`openRoot`, `resolveInRoot`, `readText`, `readJsonSafe`, `listDir`, `newestMtime`, `exists`). No write calls.

### Watcher
- `src/main/watcher.js`:
  - `watchIntents` watches the intents folder (ignoring `.aidlc-engine/` except `active-directive.json`), the ledger, `.thadeus/usage` and the worktree Unit plans.
  - A top-level change (`intents.json`, `active-intent`, a new intent folder) sets `indexChanged`. A change inside an intent adds its `dirName`. An audit shard change sets `costChanged`.
  - Debounce 300 ms, max wait 800 ms.
  - Also `watchFiles` (the config watch), `watchOpenFiles` and `watchForAidlc`.

### Audit Parser
- `src/main/parsers/audit.js`: turns the shards into events (`## Title`, `**Key**: value`, `---`) with stable keys. `mergeAudits` sorts and adds `seq`; `categoryOf`. Pure.

### State Parser
- `src/main/parsers/state.js`: the `aidlc-state.md` sections and stage checkboxes, `scope`, `plan` (a custom plan's name), `startDate`, `currentStage`, `currentStatus`, `lastUpdated`. Pure.

### Runtime Graph Parser
- `src/main/parsers/runtimeGraph.js`: the stages with their times and unit counts, and the Bolt DAG. Pure. The source file is git-ignored.

### Pipeline Merger
- `src/main/parsers/pipeline.js`: state and graph merged per stage; the `done`/`executed` counts skip `[S]` stages.

### Intents Merger
- `src/main/parsers/intents.js`: `mergeIntents(index, diskDirs, activeDirName)` merges `intents.json` entries (`uuid`, `slug`, `dirName`, `scope`, `status`) with the folders on disk. It flags `missingOnDisk` and `missingInIndex`, sets `date` from the `YYMMDD-` prefix and `active`, and sorts newest first. Pure.

### Units Status
- `src/main/parsers/units.js`: `pending`/`running`/`done` per Unit.

### Ledger Parser
- `src/main/parsers/ledger.js`: `summarizeLedger`, `agentModels`, `compareModels`, `agentName`, `costOf`. Pure.

### Audit Cost Parser
- `src/main/parsers/auditCost.js` (US-0209): `stageRollups`, `shardCosts`, `shardName`, `mergeIntentCosts`, `addTree`. Pure.

### Agent Progress Parser
- `src/main/parsers/agentProgress.js` (US-0507, 107 lines). Pure, but imports `workingAgents` from `projectService.js`.
- `progressRows(events, {running, nowMs})`:
  - Unit builds are keyed by `Bolt slug` (`WORKTREE_CREATED`/`BOLT_STARTED` open them, `BOLT_COMPLETED`/`BOLT_FAILED` close them); reviews are keyed by `Request Id`.
  - Then the other agents from `workingAgents`, minus those a build or review row already shows. A Code Generation agent with no Unit becomes `kind: 'build', unit: null` (line 80).
  - A finished row stays `FINISHED_KEEP_MS` (60 s). An open build or review shows only while the inflight file has entries.
- `planSteps(text)` counts `- [x]`/`- [ ]` lines: `{done, total}`. `severityCounts(record)`.

### Agent Progress Loader
- `src/main/agentProgress.js` (US-0507, 71 lines): `loadAgentProgress(root, space, dirName, {exec, nowMs})`.
- For each build row, `withBuildProgress` reads the plan:
  - with a Unit: `<tree>/<record>/construction/<unit>/code-generation/code-generation-plan.md`, then the record's copy;
  - with no Unit: `<record>/construction/code-generation/code-generation-plan.md`.
- The first readable plan gives `steps`, or `unreadable` names the path. The last commit subject comes from the worktree, or from the root for a build with no Unit.
- For each review row, `withFindings` reads the `Review Record` JSON under `.aidlc-engine/`.

### Velocity Parser
- `src/main/parsers/velocity.js` (US-0303, listed only): `intentMetrics`, `storyMetrics`, `projectMetrics`, `parseMarkerHistory`.

### Features Parser
- `src/main/parsers/features.js`: `parseOverview`, `parseEpic`, `statusOf`, `epicStatusOf`, `storyIdsIn`, `isValidFeaturesPath`. Pure; never throws.

### Releases Parser
- `src/main/parsers/releases.js`: `releaseOf`, `setReleaseMarker`, `buildReleases`, `DELIVERY`, `DELIVERY_DEFAULT` and others. Pure.

### Questions Parser
- `src/main/questions.js`: `pendingQuestions` from the audit events, `auditEvent`/`auditContext`.

### Notifications
- `src/main/notify.js`: system notifications for agent events and audit questions, decided once per event id through Alert Plan.

### PTY Manager
- `src/main/pty.js`: lazy `node-pty`; agent or shell sessions per project.

### Exec Runner
- `src/main/exec.js`: `runFixed(file, args, {cwd, timeout = 10 s, exec, env, maxBuffer})` uses execFile with no shell and refuses non-string arguments. It runs with the login shell's PATH (`loginPath`, probed once with a marker). `defaultExec` keeps stdout on a non-zero exit (`err.stdout`). `exec` is injectable for tests.

### Tools Registry
- `src/main/tools.js`: `TOOL_IDS` (aidlc, claude, opencode, gh, shell), saved paths, PATH lookup, `toolPath`, `probeTool`.

### Harness Detection
- `src/main/harness.js`: `detectHarnesses()` from folder markers and `--version`.

### Settings Store
- `src/main/settings.js`: the app's `settings.json` in userData.
- `sanitize` keeps known keys only.
- Per-root `projectSettings` go through `sanitizeProject`: `featureDocs`, `featuresPath`, and optionally `harness`, `harnessTabs` and `delivery` (as of `2b5d6a4`). It is capped at 200 projects.
- `setProjectSettings(root, partial)` validates each known field and merges it.
- Writes run one at a time through a queue; `settingsNow()` is the synchronous copy.

### Setup Helper
- `src/main/setup.js`: `getSetupInfo` (a dry-run preview), `runSetup`.

### AI-DLC Config Reader
- `src/main/aidlcConfig.js` (skimmed): read-only `aidlc config <section> --show --json --harness <h>` for each section, `checkHarness`, `CONFIG_WATCH_PATHS`. `parse.models` keeps `data.effective` rows (`agent`, `model`, `effort`, `modelSource`, `effortSource`, `env`) only.

### AI-DLC Config Writer
- `src/main/aidlcWrite.js`:
  - Tier 1: `buildCommand({kind: project|active|guard, key, value, where})` from the tables, with `--yes` and `--dry-run` forms; `preview` and `apply` return values (apply timeout 120 s).
  - Tier 2: `guardLockDiff`, `previewGuardLock`, `applyGuardLock` edit only `## Guard Policy`, and only if the file is unchanged since the preview.

### AI-DLC Update Check
- `src/main/aidlcUpdate.js`: `update --check` and the project `config --dry-run` plan.

### Plans Service
- `src/main/plans.js`: own and stock plans, stages, save, edit, delete, recompile (`compileEveryHarness`).

### Cost Rules Service
- `src/main/costRules.js` (US-0212, listed only): the marked block in `project.md` and the phase files; status, preview and apply with a diff, recompile and roll back.

### Model Choice
- `src/main/modelChoice.js` (US-0904):
  - `modelOptions(root, harness)` never throws. It reads `config models --show --json`; for opencode it also reads `opencode models`. It returns `editable: false` with a reason for a harness without a rule table (only `claude` and `opencode` have one).
  - `buildModelCommand(change, models)` accepts the fields `harness`, `agent`, `preset`, `group`, `model`, `effort` and `where`, with exactly one of `agent`, `preset` and `group` (as of `2b5d6a4`).
  - `previewModelChange` and `applyModelChange` run through `run()`, which returns `{ok, command, output}` or `{ok: false, command, error}` with a 20 s timeout.
  - Also `checkDrift`, `estimateCost`, `pricesFromLedger` and `ledgerRows`.

### Model Config Reader
- `src/main/models.js`: `getConfiguredModels(root)` reads `config models --show --json --harness claude`. It falls back to the `model:`/`effort:` frontmatter of `.claude/agents/aidlc-*-agent.md`, never throws, and gives `source: aidlc-config | agent-files | none`. It is Claude-only.

### Git Reader
- `src/main/git.js`: read-only fixed git with `safeArg`: status, fetch, remote changes, `show`, conflicts, `listReleaseTags`, `lastCommitSubject`, `originUrl`, `behindCount`, `changedFiles`, `predictConflicts`, `remoteStoryBranches`, and the epic history for US-0303.

### Updater
- `src/main/updater.js`: the GitHub release check, asset pick and checksum, install, relaunch.

### File Editor Service
- `src/main/fileWrite.js`: editor reads and atomic hash-checked writes; refuses engine-owned paths; `listTree`, `writeAtomic`.

### Features Loader
- `src/main/features.js`: `loadFeatures`, `plansDir`, `featureWatchPaths`, `loadStoryLinks`.

### Releases Service
- `src/main/releases.js`: `setStoryRelease`, `createRelease`, `deleteRelease` (hash-checked), `readRuleStatus`.

### Team Activity
- `src/main/teamActivity.js` and `src/main/platforms/` (listed only): machines per intent, collisions, pull requests and comments (US-1201).

### Usage Snapshot
- `src/main/usageSnapshot.js` (listed only): this machine's cost snapshot in `.thadeus/usage/` (US-0209).

### Token Readings
- `src/main/tokenReadings.js`: token readings per intent in `.thadeus/tokens/<dir>.json`.

### App Menu
- `src/main/menu.js`: the menu template, `menu:command`, menu state.

### Main i18n
- `src/main/i18n.js`: the main process language.

### Agent Channel
- `src/main/agentChannel.js`: per-session folders in userData; event files in, answer files out.

### Agent Event Store
- `src/main/agentEvents.js` (557 lines; US-0506, US-0213, US-0214): open agent events per project, the state machine (`move`), answers via the hook or as keys, the session signals for the handoff, and the activity rows.
- `onRaw(raw)` parses with the session's adapter. Then:
  - every accepted event is fed to activity (`feedActivity`);
  - the activity kind stops there;
  - the signal kinds are recorded;
  - the dialog kinds become pages.
- `KIND_ACTIVITY` (lines 26-34) maps the dialog kinds to activity: `reply`/`session` → stop, `question` → waiting question, `permission` → waiting permission, `answered` → answered, and `notify` (not `idle_prompt`) → waiting notification. These carry no agent id, so they always change the main row.
- `feedActivity` reduces with `atMs = raw.arrivedAtMs`, pushes within `ACTIVITY_PUSH_MS` (250 ms), and re-arms one idle push per project at `IDLE_MS` (30 s) after the last event.
- Answers given in the app (`answer`, `permissions.answer`, `close`) change pages only, never activity.
- `endSession` drops the session's activity (`dropSession`).

### Agent Adapters
- `src/main/agentAdapters.js` (skimmed at `0ebb196`): Claude Code and opencode hook payloads to events and back. Pure.
- Activity (lines 266-340) keeps only `IDENT`-shaped values (`^[\w.:@/-]{1,128}$`): the tool name and `tool_use_id`, `agent_id`, `agent_type`, an error type and opencode's session ids. `SubagentStart` → `agentStart`, `SubagentStop` → `agentEnd`, `PermissionRequest` → waiting permission (kind `asking`). No prompt, tool input or description passes.

### Agent Permissions
- `src/main/agentPermissions.js`: permission prompts and Allow-always rules.

### Agent Replies
- `src/main/agentReplies.js`: the agent reply lifecycle.

### Agent IPC
- `src/main/agentIpc.js`: renderer-facing agent handlers and listeners.

### Agent Hooks Installer
- `src/main/agentHooks.js` (864 lines): status, preview and apply for the app's hook files. `KINDS` and `ACTIVITY_KINDS` (lines 24-25). `PermissionRequest` runs two kinds: `permission` (waits) and `asking` (activity) (lines 57, 82).

### Agent Timing Log
- `src/main/agentTiming.js`: the development timing log.

## Preload

### Preload Bridge
- `src/preload/index.js` (165 lines): `window.bridge` with named members only (see `api-documentation.md` section 1). Agent progress: `getAgentProgress` (`agents:progress`) and `agentActivity.list` / `agentActivity.onChanged` (`agentActivity:list`, `agent:activity`) (lines 100-102).

## Shared (`src/shared/`)

### Agent Activity Model
- `src/shared/agentActivity.js` (US-0214, 139 lines). Pure; no agent text by construction.
- State: `{sessions: {[id]: {tabId, harness, main, agents, children}}}`. A row is `{agentId, agentType, startedMs, lastMs, tools[], waiting, writing, thinking, error, idle, stateKey, sinceMs}`.
- `reduceActivity(state, ev)`:
  - `agentStart` makes an agent row;
  - an event with an agent id (or an opencode child ref) changes that row and sets only `main.lastMs`;
  - `agentEnd` deletes the row;
  - any other event changes the main row.
- `apply`: any event other than `waiting`/`error` clears `waiting` (line 46). `derive` gives one state by precedence (error > waiting > tool > writing/thinking > idle, else working). `sinceMs` moves only when the state key changes.
- `activityRows(state, nowMs)`: the main row first, then its agents, oldest first. `view` turns only working, writing and thinking into idle after `IDLE_MS` (30 s). `lastMs` is not in the row.

### Harness Table
- `src/shared/harnesses.js`: six harnesses with markers, CLI, commands and `perAgentModels`; `selectableHarness`, `setupHarness`, `resolveHarness(setting, detected)`.

### Shared i18n
- `src/shared/i18n.js`: one i18next instance per process with ICU, `sv`/`en`, `t`, `locale`.

### Config Tables
- `src/shared/configTables.js`: fixed tables for settings, guards, the lock and models: `EFFORTS`, `PRESETS` (`thorough`, `balanced`, `minimal`), `GROUPS` (`deciding`, `reviewing`, `writing-up`), `MODEL_WHERE` (`project`, `local`), `CLAUDE_MODELS`, `APPLIED_EFFORT`.

### Cost Rules Table
- `src/shared/costRules.js` (US-0212, listed only): the markers, target files, the first pack and the clash rules.

### App Name Module
- `src/shared/appName.js`: the app name in every form.

### Plan Name Rule
- `src/shared/planName.js`: `validPlanName()`.

### Agent Text Sanitizer
- `src/shared/agentText.js`: the one sanitizer for agent text.

### Agent Order
- `src/shared/agentOrder.js`: `byPager`.

### Alert Plan
- `src/shared/alertPlan.js`: one alert decision per kind and setting.

### Locale Files
- `src/shared/locales/sv.json`, `en.json`: every UI text, nested by view. Agent progress keys are under `tokenDetail.progress` (`steps`, `state.tool` "running {tool}", `state.waiting.permission` and others).

## Renderer (`src/renderer/`)

### Renderer Bootstrap
- `main.jsx`, `index.html`: fonts, theme, the language before the first render, the CSP.

### App Shell
- `App.jsx`: project tabs, the left arm (`ArmBlock` per view; for `config`, the sections from `PROJECT_SECTIONS`, with the AI-DLC ones hidden in other projects), settings, menu commands, dialogs.

### ProjectView
- `ProjectView.jsx`:
  - one `TerminalProvider` per project, with `useProject` and `useFeatures`;
  - the `view === '<id>'` branches;
  - for `config`: `CostRulesSection`, `ProjectSettingsView` (`docs`, `agent`) and `ConfigView` (`aidlc`);
  - it resolves the agent harness from `settings.harnessTabs` and `settings.harness`.

### TerminalContext
- `TerminalContext.jsx`: the tab registry, `type`, `sequence`, `restart`, `anyBusy`, `answer`, `state`.

### TerminalPanel
- `TerminalPanel.jsx`: xterm sessions bound to ptys, the tab bar, quick commands.

### Terminal Control
- `terminalControl.js`: the activity signal, `waitFor`, `runSequence`, shell quoting. Pure.

### Picker Reader
- `picker.js`: reads Claude Code's picker from the screen rows. Pure.

### AgentDialog
- `AgentDialog.jsx`: the LCARS modal pager for questions, permissions and replies.

### ReplyPage
- `ReplyPage.jsx`: the reply page, sanitised Markdown.

### LatestMessageStrip
- `LatestMessageStrip.jsx`: the newest agent reply line per project.

### AgentHooks UI
- `AgentHooksStrip.jsx`, `AgentHooksSection.jsx`, `AgentHooksPreview.jsx`: the hook status, the settings section and the preview. `useAgentHooks` gives the per-harness `used` and `status`.

### ResumeButton
- `ResumeButton.jsx`: resumes an in-flight intent through the idle agent tab.

### IntentList
- `IntentList.jsx`: intents with search, filters, sort, cost and step dots.

### IntentDetail
- `IntentDetail.jsx`: the header, progress, request text, `TABS` (pipeline, timeline, units, cost, velocity, comments, files) and the readout column.

### Pipeline
- `Pipeline.jsx`: phases and stage cards.

### Timeline
- `Timeline.jsx`: the virtualised audit timeline.

### BoltDag
- `BoltDag.jsx`: the SVG Unit DAG.

### StoryComments
- `StoryComments.jsx` (US-1201): the intent's comments tab.

### ArtifactReader
- `ArtifactReader.jsx`: the artifact tree and `FileContent`.

### CostPanel
- `CostPanel.jsx`: the project cost view (`CostChart`, `ScopeTable`, readouts, model table).

### CostTab
- `CostTab.jsx`: intent cost tables, `CostLabel`, `CostTable`, `ModelTable`, `MachinesLine`.

### VelocityView
- `VelocityView.jsx` (US-0303, listed only): the project Velocity view and the intent's Velocity tab.

### TokenView
- `TokenView.jsx`: live token meters.

### TokenDetail
- `TokenDetail.jsx` (US-0208, US-0507, US-0215): `@visx` charts of tokens, figures and splits, plus Agent progress.
- It fetches `getAgentProgress(projectId, dirName)` on open, on `refreshKey` and on a recheck timer while a finished row shows (lines 465-480). It mounts `<AgentProgress projectId rows live />` (line 522).

### AgentProgress
- `AgentProgress.jsx` (US-0507, US-0214, 211 lines).
- `fromHooks = live && used.length > 0 && stale.length === 0` (line 183). If true, the hook rows replace the audit rows; otherwise the audit rows show, with a hooks notice when hooks are stale.
- `ActivityRows`: the name (`Main · <harness>`, or `agentName(agentType)`), then `stateText` (the tool name only, the waiting reason, the error type), then `sinceText(sinceMs)` on a 1 s clock.
- `AuditRows`: the summary sentence, then per row the name, the stage and agent, `statusText` ("n of m steps", the verdict, failed, working) and the commit.

### Token Charts
- `tokenFlow.js`, `tokenChart.js`: token history and chart series. Pure.

### RefreshPanel
- `RefreshPanel.jsx`: Refresh from GitHub, with `CollisionPanel`.

### CollisionPanel
- `CollisionPanel.jsx` (US-1201): the behind-main count, overlapping pull requests, predicted conflicts.

### MachinesView
- `MachinesView.jsx` (US-1201): machines per intent.

### Workflow Busy Rule
- `workflowBusy.js`: `isWorkflowRunning`.

### AidlcUpdate
- `AidlcUpdate.jsx`: the AI-DLC update rows in Settings › Tools.

### SetupAidlc
- `SetupAidlc.jsx`: AI-DLC setup and add harness.

### ProjectSettingsView
- `ProjectSettingsView.jsx` (282 lines at `2b5d6a4`):
  - `PROJECT_SECTIONS = ['docs', 'agent', 'aidlc', 'costRules']` and `AIDLC_SECTIONS`;
  - `DocsSection` (feature docs mode, delivery, path) and `AgentSection` (harness, tabs side by side, agent hooks);
  - each section is a `<form>` built from `Section` and `RadioBlocks` with `useSectionSave(projectId)`, which calls `setProjectSettings` and shows saved or the error;
  - `confirmHarnessSwitch` uses `window.confirm`.

### SettingsView
- `SettingsView.jsx`: the app settings tabs; exports `Section` and `RadioBlocks`.

### ConfigView
- `ConfigView.jsx`: AI-DLC configuration per installed harness (`getAidlcConfig`), working agents, and the models section with `ModelPicker`. It reloads on `config:changed`.

### ConfigEdit
- `ConfigEdit.jsx` (skimmed):
  - `ChangePanel` shows the command, the dry run, then Apply with the output or the error;
  - `ActiveEditor`, `DefaultsEditor`, `GuardSwitches`, `GuardLock`;
  - `ModelPicker` handles the agent, preset or group change, the cost estimate and the drift check.

### CostRulesSection
- `CostRulesSection.jsx` (US-0212, listed only): the cost rule pack in Configuration, saved through `ChangePanel`.

### PlansView
- `PlansView.jsx`: plans, stages, save, edit, delete.

### FeaturesView
- `FeaturesView.jsx`: epics, stories, filters, the release picker, `ReleasesView`, `StatusBadge`.

### Story Filter
- `storyFilter.js`: the shared story filter. Pure.

### Editor
- `editor/`: Monaco editor tabs, the conflict dialog, the file tree.

### UpdateNotice
- `UpdateNotice.jsx`: the app update offer and progress.

### AboutDialog
- `AboutDialog.jsx`: the About panel.

### DocsDialog
- `DocsDialog.jsx`: the project's `docs/README.md`.

### Splash
- `Splash.jsx`: the start-up splash.

### LCARS Primitives
- `Lcars.jsx`, `AuctumMark.jsx`: `Bar`, `Frame`, `Hairlines`, `Dots`, `Readout`; the mark.

### Tooltip
- `Tooltip.jsx`, `tooltipPlacement.js` (US-0414): the one LCARS tooltip. `tests/renderer/noNativeTitle.test.jsx` forbids native `title=`.

### Format Helpers
- `format.js`: status labels, `formatTime`, `formatDuration`, `stageTitle`, cost and token formats.

### Theme Tokens
- `tokens.js`: CSS tokens for xterm.

### useProject
- `useProject.js` (137 lines at `2b5d6a4`): per project tab, the intent list, the selected detail, cost, models (`getModels`, Claude-only) and `lastIntentChangeAt`.
- On `project:changed` it reloads the list (all of it when `indexChanged`, else `dirNames`), the cost when `costChanged || indexChanged`, and the detail when it is named; new audit keys are highlighted for 4 s.
- Errors become translated banner texts; a cost failure stays in the cost view.

### useFeatures
- `useFeatures.js`: feature docs, project settings, story links and the lifecycle rule; reloads on `features:changed`.

### Feature Docs Prompt
- `featureDocsPrompt.js`: the request typed into the agent tab to create feature docs.

### Theme Stylesheet
- `theme.css`: the LCARS tokens on `:root` and the component styles.

## Build, CI and tests

### Release Workflow
- `.github/workflows/release.yml`: gitleaks, the tag/version check, tests with coverage, ESLint, Prettier, the mac and Linux builds, the GitHub Release.

### Build Scripts
- `scripts/`, `electron.vite.config.mjs`, `vitest.config.mjs`, `eslint.config.mjs`.

### Packaging Config
- `electron-builder.yml`, `package.json`, `build/`.

### Dialog Hook Script
- `.thadeus/hooks/dialog.sh` (78 lines): the POSIX sh hook bundled into main with `?raw`. It never parses the payload.
- `question` and `permission` write a `.wait` marker and the event, then poll for an answer within `THADEUS_WAIT_SECONDS`.
- `reply`, `session`, `notify`, `precompact`, `postcompact`, and the nine activity kinds (`pretool`, `posttool`, `toolfail`, `agentstart`, `agentstop`, `prompt`, `message`, `stopfail`, `asking`, all written as kind `activity`) copy stdin with a 2 s watchdog and a 1 048 577-byte cap, then exit 0.
- `answered` copies stdin and exits.

### Test Suite
- `tests/main` (85 entries), `tests/renderer` (50 entries) at `2b5d6a4`, plus `tests/helpers`; see `code-quality-assessment.md`.

### Test Fixtures
- `tests/fixtures/`: agent events, hooks, audit, features, ledger, picker screens, a sample project.

### Project Docs
- `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `LICENSE`, `docs/`.
