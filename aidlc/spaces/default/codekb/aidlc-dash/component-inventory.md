# Component Inventory

One heading per component; the heading text is the component's name in the Scope of Analysis block. Paths are repo-relative. External packages are in `dependencies.md`. Re-read at `bbfb4c0` (US-0303): the parsers, Project Service, Features Loader, Releases Service, Git Reader, IPC Router and the renderer. The other entries are from earlier scans (`721e051`, `f46cb71`) or were only listed in this run, which is marked.

## Main process (`src/main/`)

### Main Entry
- `src/main/index.js`: app lifecycle, single instance, `windowOptions()` (sandbox, contextIsolation), navigation block, close guard, update check, shutdown.

### IPC Router
- `src/main/ipc.js` (1038 lines): 87 invoke handlers in one table, wrapped by `registerIpc`. Per-project state (root, space, watchers, sender, caches); `watchSpace`, `watchConfig`, `watchGitHead`, `syncFeaturesWatch`; agent dialogs and team handlers. `project:cost` and `features:load` are the models for a velocity handler.

### Project Service
- `src/main/projectService.js`: `detectProject`, `loadIntentList` (cached summaries from the state file, `activityAt`), `loadIntentDetail`/`buildDetail`, `loadAuditEvents` (a missing audit folder gives `[]`), `workingAgents`, `inflightCount`, `inProgress`, `loadPendingQuestions`, `loadCost`, `loadCrossMachineCost` (the only loop over every intent's audit). Defines `LEDGER_PATH`, `INFLIGHT_PATH`, `intentsDir`, `assertName`.

### Project Access
- `src/main/projectAccess.js`: root-confined reads (`openRoot`, `resolveInRoot`, `readText`, `readJsonSafe`, `listDir`, `newestMtime`, `exists`). No write calls.

### Watcher
- `src/main/watcher.js`: `watchIntents` (the intents folder and the ledger), `watchFiles`, `watchOpenFiles`, `watchForAidlc`. Debounce 300 ms, max wait 800 ms.

### Audit Parser
- `src/main/parsers/audit.js`: shards into events (`## Title`, `**Key**: value`, `---`) with stable keys; `mergeAudits` sorts by `timeMs`, source, index and adds `seq`; a block without a valid timestamp inherits the previous one's time; `categoryOf`, `NOISY_EVENTS`. Pure.

### State Parser
- `src/main/parsers/state.js`: `aidlc-state.md` sections and stage checkboxes (`CHECKBOX_STATUS`), `startDate`, `currentStage`, `currentStatus`, `lastUpdated`. Pure.

### Runtime Graph Parser
- `src/main/parsers/runtimeGraph.js`: stages with `startedAt`, `completedAt`, `durationMs`, unit counts (times from `instances` for unit-built stages), and the Bolt DAG. Pure. The source file is git-ignored.

### Pipeline Merger
- `src/main/parsers/pipeline.js`: state and graph merged per stage (mismatch, units, failed, current); `done`/`executed` counts skip `[S]` stages.

### Intents Merger
- `src/main/parsers/intents.js`: `intents.json` merged with the folders on disk; `dateFromDirName` (`YYMMDD-` prefix), active, missing flags.

### Units Status
- `src/main/parsers/units.js`: `pending`/`running`/`done` per Unit from `UNIT_*` and `WORKTREE_CREATED`/`BOLT_*` by `Bolt slug`.

### Ledger Parser
- `src/main/parsers/ledger.js`: `summarizeLedger` (project, perIntent, byScope, timeline), `agentModels`, `compareModels`, `agentName`, `costOf`. Pure.

### Audit Cost Parser
- `src/main/parsers/auditCost.js` (US-0209): `stageRollups` (the last `STAGE_COMPLETED` cost row per shard, stage and Unit), `shardCosts`, `shardName` (host and clone from the shard name), `mergeIntentCosts`, `addTree`. Pure.

### Agent Progress Parser
- `src/main/parsers/agentProgress.js` (US-0507, US-0025): `progressRows` pairs `WORKTREE_CREATED`/`BOLT_STARTED` → `BOLT_COMPLETED`/`BOLT_FAILED` by `Bolt slug` and `REVIEW_REQUESTED` → `REVIEW_COMPLETED` by `Request Id`; `planSteps`, `severityCounts`. Imports `workingAgents` from `projectService.js`.

### Features Parser
- `src/main/parsers/features.js`: `parseOverview`, `parseEpic`, story head lines and criteria, `statusOf`, `epicStatusOf`, `storyIdsIn`, `STATUS_MARKER`, `isValidFeaturesPath`. Pure; never throws.

### Releases Parser
- `src/main/parsers/releases.js`: `releaseOf`, `setReleaseMarker`, `nextVersions`, `releaseOptions`, `buildReleases` (per version: released, tag date, plan, stories, stale), `newReleaseError`, `canDelete`, `ruleStatus`. Pure.

### Questions Parser
- `src/main/questions.js`: `parseOptions`, `pendingQuestions` from the audit events, `auditEvent`/`auditContext`.

### Notifications
- `src/main/notify.js`: system notifications for agent events and audit questions, decided once per event id through Alert Plan.

### PTY Manager
- `src/main/pty.js`: lazy `node-pty`; agent or shell sessions per project; data and exit; write, resize, kill.

### Exec Runner
- `src/main/exec.js`: `runFixed` (execFile, no shell, timeout, login PATH), `loginPath`.

### Tools Registry
- `src/main/tools.js`: `TOOL_IDS` (aidlc, claude, opencode, gh, shell), saved paths, PATH lookup, `probeTool`.

### Harness Detection
- `src/main/harness.js`: `detectHarnesses()` from folder markers and `--version`.

### Settings Store
- `src/main/settings.js`: the app's `settings.json` in userData; per-root project settings (`featureDocs`, `featuresPath`, `delivery`).

### Setup Helper
- `src/main/setup.js`: `getSetupInfo` (a dry-run preview), `runSetup`.

### AI-DLC Config Reader
- `src/main/aidlcConfig.js`: read-only `aidlc config … --show --json`, `checkHarness`, `CONFIG_WATCH_PATHS`.

### AI-DLC Config Writer
- `src/main/aidlcWrite.js`: tier-1 CLI changes from fixed tables; the tier-2 Guard Policy edit after a diff.

### AI-DLC Update Check
- `src/main/aidlcUpdate.js`: `update --check` and the project `config --dry-run` plan.

### Plans Service
- `src/main/plans.js`: own and stock plans, stages, save, edit, delete, recompile.

### Model Choice
- `src/main/modelChoice.js`: model and effort options per harness, preview/apply, drift, cost estimate.

### Model Config Reader
- `src/main/models.js`: the configured model per agent.

### Git Reader
- `src/main/git.js`: read-only fixed git with `safeArg`: status, fetch, remote changes, `show`, conflicts, `listReleaseTags` (`v*` with creator date), `lastCommitSubject`, `originUrl`, `behindCount`, `changedFiles`, `predictConflicts`, `remoteStoryBranches`. No history over a path.

### Updater
- `src/main/updater.js`: GitHub release check, asset pick and checksum, install, relaunch.

### File Editor Service
- `src/main/fileWrite.js`: editor reads and atomic hash-checked writes (`writeFileSafe`); refuses engine-owned paths; `listTree`.

### Features Loader
- `src/main/features.js`: `loadFeatures` (overview, epics with hashes, release plans, warnings), `plansDir`, `featureWatchPaths`, `loadStoryLinks` (story ids in each intent's description and requirements).

### Releases Service
- `src/main/releases.js`: `setStoryRelease`, `createRelease`, `deleteRelease` (hash-checked), `readRuleStatus`.

### Team Activity
- `src/main/teamActivity.js`, `src/main/platforms/` (listed only): machines per intent from the shard names, collisions, pull requests and comments (US-1201).

### Usage Snapshot
- `src/main/usageSnapshot.js` (listed only): this machine's cost snapshot in `.thadeus/usage/`, `localClone`, `readSnapshots` (US-0209).

### Token Readings
- `src/main/tokenReadings.js`: token readings per intent in `.thadeus/tokens/<dir>.json`.

### App Menu
- `src/main/menu.js`: the menu template, `menu:command`, menu state.

### Main i18n
- `src/main/i18n.js`: the main process language.

### Agent Channel
- `src/main/agentChannel.js`: per-session folders in userData; event files in, answer files out; validation.

### Agent Event Store
- `src/main/agentEvents.js`: open agent events per project, the state machine, answers.

### Agent Adapters
- `src/main/agentAdapters.js`: Claude Code and opencode hook payloads to events and back. Pure.

### Agent Permissions
- `src/main/agentPermissions.js`: permission prompts and Allow-always rules.

### Agent Replies
- `src/main/agentReplies.js`: the agent reply lifecycle.

### Agent IPC
- `src/main/agentIpc.js`: renderer-facing agent handlers and listeners.

### Agent Hooks Installer
- `src/main/agentHooks.js`: status, preview and apply for the app's hook files.

### Agent Timing Log
- `src/main/agentTiming.js`: the development timing log.

## Preload

### Preload Bridge
- `src/preload/index.js`: `window.bridge` with named members only (see `api-documentation.md` section 1).

## Shared (`src/shared/`)

### Harness Table
- `src/shared/harnesses.js`: six harnesses with markers, CLI, commands, `pickerKeys`.

### Shared i18n
- `src/shared/i18n.js`: one i18next instance per process with ICU, `sv`/`en`, `t`, `locale`.

### Config Tables
- `src/shared/configTables.js`: fixed tables for settings, guards, efforts, presets, models.

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
- `src/shared/locales/sv.json`, `en.json` (1334 lines each): every UI text, nested by view.

## Renderer (`src/renderer/`)

### Renderer Bootstrap
- `main.jsx`, `index.html`: fonts, theme, language before the first render, CSP.

### App Shell
- `App.jsx` (748 lines): project tabs, the left arm (`ArmBlock` per view: intents, features, config, plans, editor, cost, github; `ArmSubtabs` for sections), settings, menu commands, dialogs. Sets `data-motion` on `<html>`.

### ProjectView
- `ProjectView.jsx` (497 lines): one `TerminalProvider` per project; `useProject` and `useFeatures`; the `view === '<id>'` branches (cost → `CostPanel`, github → `RefreshPanel`/`MachinesView`, intents, features, config, plans, editor).

### TerminalContext
- `TerminalContext.jsx`: the tab registry, `type`, `sequence`, `restart`, `anyBusy`, `answer`.

### TerminalPanel
- `TerminalPanel.jsx`: xterm sessions bound to ptys, the tab bar, quick commands.

### Terminal Control
- `terminalControl.js`: activity signal, `waitFor`, `runSequence`, shell quoting. Pure.

### Picker Reader
- `picker.js`: reads Claude Code's picker from the screen rows. Pure.

### AgentDialog
- `AgentDialog.jsx`: modal pager for questions, permissions and replies.

### ReplyPage
- `ReplyPage.jsx`: the reply page, sanitised Markdown.

### LatestMessageStrip
- `LatestMessageStrip.jsx`: the newest agent reply line per project.

### AgentHooks UI
- `AgentHooksStrip.jsx`, `AgentHooksSection.jsx`, `AgentHooksPreview.jsx`: hook status, settings section, preview.

### ResumeButton
- `ResumeButton.jsx`: resumes an in-flight intent through the idle agent tab.

### IntentList
- `IntentList.jsx`: intents with search, filters, sort, cost and step dots.

### IntentDetail
- `IntentDetail.jsx`: header, progress, request text, `TABS` (pipeline, timeline, units, cost, comments, files), readout column. The place for a per-intent velocity tab.

### Pipeline
- `Pipeline.jsx`: phases and stage cards with the unit level bar and stage durations from the graph.

### Timeline
- `Timeline.jsx` (231 lines): the virtualised (`@tanstack/react-virtual`) audit timeline, filtered by type and stage, newest first.

### BoltDag
- `BoltDag.jsx`: the SVG Unit DAG.

### StoryComments
- `StoryComments.jsx` (US-1201): the intent's comments tab: pull request comments with AI-DLC questions, approvals and findings.

### ArtifactReader
- `ArtifactReader.jsx`: the artifact tree and `FileContent`.

### CostPanel
- `CostPanel.jsx` (152 lines): the project cost view: `CostChart` (plain SVG bars per intent by date), `ScopeTable` (per scope total and average), readouts, model table. The closest model for a project velocity view.

### CostTab
- `CostTab.jsx`: intent cost tables, `CostLabel`, `CostTable`, `ModelTable`, `MachinesLine`.

### TokenView
- `TokenView.jsx`: live token meters.

### TokenDetail
- `TokenDetail.jsx` (472 lines): `@visx` charts of tokens over time and by stage, agent and model, plus the agent progress rows.

### AgentProgress
- `AgentProgress.jsx`: US-0507 progress rows in the token detail view.

### Token Charts
- `tokenFlow.js`, `tokenChart.js`: token history and chart series. Pure.

### RefreshPanel
- `RefreshPanel.jsx`: Refresh from GitHub, with `CollisionPanel`.

### CollisionPanel
- `CollisionPanel.jsx` (US-1201): behind-main count, overlapping pull requests, predicted conflicts, the merge note.

### MachinesView
- `MachinesView.jsx` (US-1201): machines per intent from the shard names, their last stage and time; remote story branches.

### Workflow Busy Rule
- `workflowBusy.js`: `isWorkflowRunning`.

### AidlcUpdate
- `AidlcUpdate.jsx`: AI-DLC update rows in Settings › Tools.

### SetupAidlc
- `SetupAidlc.jsx`: AI-DLC setup and add harness.

### ProjectSettingsView
- `ProjectSettingsView.jsx`: project settings sections.

### SettingsView
- `SettingsView.jsx`: app settings tabs; exports `Section` and `RadioBlocks`.

### ConfigView
- `ConfigView.jsx`: AI-DLC configuration per harness, working agents.

### ConfigEdit
- `ConfigEdit.jsx`: `ChangePanel` and the editors for settings, guards, the lock and models.

### PlansView
- `PlansView.jsx`: plans, stages, save, edit, delete.

### FeaturesView
- `FeaturesView.jsx` (682 lines): epics, stories, filters, the release picker, `ReleasesView` (per version: date, stories, stale flags), `StatusBadge`.

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
- `Lcars.jsx`, `AuctumMark.jsx`: `Bar`, `Frame`, `Hairlines`, `Dots`, `Readout`, `progressStates`, `dotsLabel`; the mark. Uses `t` from `src/shared/i18n.js` and `Tooltip`.

### Tooltip
- `Tooltip.jsx`, `tooltipPlacement.js` (US-0414): the one LCARS tooltip, portalled to `document.body`, open on focus at once and on hover after 300 ms, closed on blur, leave, scroll and Esc; `placeTooltip` is pure. `tests/renderer/noNativeTitle.test.jsx` forbids native `title=`.

### Format Helpers
- `format.js`: status labels, `formatTime`, `formatDuration`, `stageTitle`, `stagePosition`, cost and token formats, `withSlots`.

### Theme Tokens
- `tokens.js`: CSS tokens for xterm.

### useProject
- `useProject.js`: the intent list, detail, cost and models per project tab; partial reload on `project:changed`; new-event highlight. Errors become translated banner texts; a cost failure stays in the cost view.

### useFeatures
- `useFeatures.js`: feature docs, project settings, story links and lifecycle rule; reload on `features:changed` and on index changes.

### Feature Docs Prompt
- `featureDocsPrompt.js`: the request typed into the agent tab to create feature docs.

### Theme Stylesheet
- `theme.css` (1429 lines): LCARS tokens on `:root` and component styles, including `.lcars-tip`.

## Build, CI and tests

### Release Workflow
- `.github/workflows/release.yml`: gitleaks, tag/version check, tests with coverage, ESLint, Prettier, mac and Linux builds, GitHub Release.

### Build Scripts
- `scripts/`, `electron.vite.config.mjs`, `vitest.config.mjs`, `eslint.config.mjs`.

### Packaging Config
- `electron-builder.yml`, `package.json`, `build/`.

### Dialog Hook Script
- `.thadeus/hooks/dialog.sh`: the POSIX sh hook bundled into main with `?raw`.

### Test Suite
- `tests/main` (82 files), `tests/renderer` (48 files), `tests/helpers`; see `code-quality-assessment.md`.

### Test Fixtures
- `tests/fixtures/`: agent events, hooks, audit, features, ledger, picker screens, a sample project.

### Project Docs
- `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `LICENSE`, `docs/`.
