# Component Inventory

One heading per component; the heading text is the component's name in the Scope of Analysis block. Paths are repo-relative. External packages are in `dependencies.md`.

## Main process (`src/main/`)

### Main Entry
- **Path**: `src/main/index.js`
- **Responsibility**: app lifecycle, single instance, `windowOptions()` (sandbox, contextIsolation), navigation block, close guard, update check, shutdown.

### IPC Router
- **Path**: `src/main/ipc.js` (891 lines)
- **Responsibility**: 76 invoke handlers. It holds per-project state (root, space, watchers, sender, caches), runs `watchSpace`, `watchConfig`, `watchGitHead` and the feature-docs watch, and wires in the agent dialogs. Depends on nearly every main module.

### Project Service
- **Path**: `src/main/projectService.js`
- **Responsibility**: `detectProject`, `loadIntentList` (cached summaries, `activityAt`), `loadIntentDetail`/`buildDetail`, `loadCost`, `workingAgents()`/`loadWorkingAgents`, `inProgress`, `loadPendingQuestions`. Defines `LEDGER_PATH` and `INFLIGHT_PATH`.

### Project Access
- **Path**: `src/main/projectAccess.js`
- **Responsibility**: root-confined reads (`openRoot`, `resolveInRoot` with realpath checks, `readText`, `readJsonSafe`, `listDir`, `newestMtime`, `exists`). No write calls.

### Watcher
- **Path**: `src/main/watcher.js`
- **Responsibility**: `watchIntents` (the intents folder, `.aidlc-engine/` ignored except `active-directive.json`, plus the ledger), `watchFiles`, `watchOpenFiles`, `watchForAidlc`. Debounce 300 ms, max wait 800 ms.

### Audit Parser
- **Path**: `src/main/parsers/audit.js`
- **Responsibility**: shards into events with stable keys, a merge by time, `categoryOf`, `NOISY_EVENTS`. Pure.

### State Parser
- **Path**: `src/main/parsers/state.js`
- **Responsibility**: `aidlc-state.md` sections and stage checkboxes.

### Runtime Graph Parser
- **Path**: `src/main/parsers/runtimeGraph.js`
- **Responsibility**: stages with times and unit counts, and the Bolt DAG. It drops the instance fields `bolt` and `worktree`.

### Pipeline Merger
- **Path**: `src/main/parsers/pipeline.js`
- **Responsibility**: state and graph merged per stage (mismatch, unit counts, failed), done/executed counts.

### Intents Merger
- **Path**: `src/main/parsers/intents.js`
- **Responsibility**: `intents.json` merged with the folders on disk; active, missing and date fields.

### Units Status
- **Path**: `src/main/parsers/units.js`
- **Responsibility**: `pending`/`running`/`done` per Unit from `UNIT_STARTED`/`UNIT_COMPLETED` only.

### Ledger Parser
- **Path**: `src/main/parsers/ledger.js`
- **Responsibility**: `summarizeLedger`, `agentModels`, `compareModels`, `agentName`. Pure.

### Features Parser
- **Path**: `src/main/parsers/features.js`
- **Responsibility**: the overview and epic parsing, status markers, `storyIdsIn`. Pure.

### Releases Parser
- **Path**: `src/main/parsers/releases.js`
- **Responsibility**: release markers, options, `buildReleases`, `ruleStatus`. Pure.

### Questions Parser
- **Path**: `src/main/questions.js`
- **Responsibility**: `parseOptions`, `pendingQuestions` from the audit events, `auditEvent`/`auditContext`.

### Notifications
- **Path**: `src/main/notify.js`
- **Responsibility**: system notifications for agent events and audit questions, decided once per event id through Alert Plan.

### PTY Manager
- **Path**: `src/main/pty.js`
- **Responsibility**: lazy `node-pty`; agent or shell sessions per project; data and exit; write, resize, kill.

### Exec Runner
- **Path**: `src/main/exec.js`
- **Responsibility**: `runFixed` (execFile, no shell, timeout, login PATH), `loginPath`.

### Tools Registry
- **Path**: `src/main/tools.js`
- **Responsibility**: `TOOL_IDS` (aidlc, claude, opencode, gh, shell), saved paths, PATH lookup, `probeTool`.

### Harness Detection
- **Path**: `src/main/harness.js`
- **Responsibility**: `detectHarnesses()` from folder markers and `--version`.

### Settings Store
- **Path**: `src/main/settings.js`
- **Responsibility**: the app's `settings.json` in userData, sanitised keys, per-root project settings.

### Setup Helper
- **Path**: `src/main/setup.js`
- **Responsibility**: `getSetupInfo` (a dry-run preview), `runSetup` (git init, `aidlc config --harness`, plugins, presets).

### AI-DLC Config Reader
- **Path**: `src/main/aidlcConfig.js`
- **Responsibility**: read-only `aidlc config … --show --json`, `checkHarness`, `CONFIG_WATCH_PATHS`.

### AI-DLC Config Writer
- **Path**: `src/main/aidlcWrite.js`
- **Responsibility**: tier-1 CLI changes from fixed tables; the tier-2 Guard Policy edit after a diff.

### AI-DLC Update Check
- **Path**: `src/main/aidlcUpdate.js`
- **Responsibility**: `update --check` and the project `config --dry-run` plan; update commands typed into the shell (US-0504).

### Plans Service
- **Path**: `src/main/plans.js`
- **Responsibility**: own and stock plans, stages, save, tier-2 edit and delete, recompile.

### Model Choice
- **Path**: `src/main/modelChoice.js`
- **Responsibility**: model and effort options per harness, preview/apply, drift, cost estimate.

### Model Config Reader
- **Path**: `src/main/models.js`
- **Responsibility**: the configured model per agent from `aidlc config models`, else the agent frontmatter.

### Git Reader
- **Path**: `src/main/git.js`
- **Responsibility**: read-only git (status, fetch, remote changes, `show`, conflicts, tags) with `safeArg`.

### Updater
- **Path**: `src/main/updater.js`
- **Responsibility**: GitHub release check, asset pick and checksum, install, relaunch.

### File Editor Service
- **Path**: `src/main/fileWrite.js`
- **Responsibility**: editor reads and atomic hash-checked writes; refuses engine-owned paths; `listTree`.

### Features Loader
- **Path**: `src/main/features.js`
- **Responsibility**: loads the feature docs with hashes, `featureWatchPaths`, story links.

### Releases Service
- **Path**: `src/main/releases.js`
- **Responsibility**: the story release marker and release plan writes, hash-checked; the lifecycle rule status.

### Token Readings
- **Path**: `src/main/tokenReadings.js`
- **Responsibility**: cumulative token readings per intent in `.thadeus/tokens/<dir>.json`, at most one per 30 s.

### App Menu
- **Path**: `src/main/menu.js`
- **Responsibility**: the menu template, `menu:command`, menu state.

### Main i18n
- **Path**: `src/main/i18n.js`
- **Responsibility**: the main process language from the settings and the OS locale.

### Agent Channel
- **Path**: `src/main/agentChannel.js`
- **Responsibility**: per-session folders under `<userData>/agent-channel/`; event files in, answer files out; validation; heartbeat.

### Agent Event Store
- **Path**: `src/main/agentEvents.js`
- **Responsibility**: open agent events per project, the state machine, answer checks and delivery.

### Agent Adapters
- **Path**: `src/main/agentAdapters.js`
- **Responsibility**: Claude Code and opencode hook payloads to events and back. Pure.

### Agent Permissions
- **Path**: `src/main/agentPermissions.js`
- **Responsibility**: permission prompts: choices, delivery through the waiting hook, time-out, Allow-always rules kept in main.

### Agent Replies
- **Path**: `src/main/agentReplies.js`
- **Responsibility**: the agent reply lifecycle and the terminal input classifier.

### Agent IPC
- **Path**: `src/main/agentIpc.js`
- **Responsibility**: the renderer-facing agent handlers and listeners, and the spawn/exit wiring.

### Agent Hooks Installer
- **Path**: `src/main/agentHooks.js` (864 lines)
- **Responsibility**: status, preview and apply for the app's hook files (`.claude/settings.json` spans, `.thadeus/hooks/dialog.sh`, `.opencode/plugins/thadeus-dialog.js`).

### Agent Timing Log
- **Path**: `src/main/agentTiming.js`
- **Responsibility**: the development timing log with `THADEUS_TIMING=1`; a no-op otherwise.

## Preload

### Preload Bridge
- **Path**: `src/preload/index.js`
- **Responsibility**: `window.bridge` with named members only (see `api-documentation.md` section 1).

## Shared (`src/shared/`)

### Harness Table
- **Path**: `src/shared/harnesses.js`
- **Responsibility**: six harnesses (claude and opencode selectable) with markers, CLI, commands, `pickerKeys`.

### Shared i18n
- **Path**: `src/shared/i18n.js`
- **Responsibility**: one i18next instance per process with ICU, `sv`/`en`, `t`, `locale`.

### Config Tables
- **Path**: `src/shared/configTables.js`
- **Responsibility**: the fixed tables for settings, guards, efforts, presets, models.

### App Name Module
- **Path**: `src/shared/appName.js`
- **Responsibility**: the app name in every form.

### Plan Name Rule
- **Path**: `src/shared/planName.js`
- **Responsibility**: `validPlanName()`.

### Agent Text Sanitizer
- **Path**: `src/shared/agentText.js`
- **Responsibility**: the one sanitizer for agent text (control, bidi and zero-width characters), cuts, `firstLine`.

### Agent Order
- **Path**: `src/shared/agentOrder.js`
- **Responsibility**: `byPager`, the pager sort order.

### Alert Plan
- **Path**: `src/shared/alertPlan.js`
- **Responsibility**: one alert decision per kind and setting.

### Locale Files
- **Path**: `src/shared/locales/sv.json`, `src/shared/locales/en.json`
- **Responsibility**: every UI text, nested by view. `intents.units.*` holds the DAG texts.

## Renderer (`src/renderer/`)

### Renderer Bootstrap
- **Path**: `src/renderer/main.jsx`, `src/renderer/index.html`
- **Responsibility**: fonts, theme, language before the first render, CSP.

### App Shell
- **Path**: `src/renderer/App.jsx` (732 lines)
- **Responsibility**: project tabs, left arm, views, settings, menu commands, dialogs, questions and agent dialog state.

### ProjectView
- **Path**: `src/renderer/ProjectView.jsx`
- **Responsibility**: one `TerminalProvider` per project, harness resolution, view switching, editor tabs, hooks strip.

### TerminalContext
- **Path**: `src/renderer/TerminalContext.jsx`
- **Responsibility**: the tab registry, `type`, `sequence`, `restart`, `anyBusy`, `answer` per project.

### TerminalPanel
- **Path**: `src/renderer/TerminalPanel.jsx`
- **Responsibility**: xterm sessions bound to ptys, the tab bar, quick commands, `screenLines()`.

### Terminal Control
- **Path**: `src/renderer/terminalControl.js`
- **Responsibility**: the activity signal, `waitFor`, `runSequence`, shell quoting. Pure.

### Picker Reader
- **Path**: `src/renderer/picker.js`
- **Responsibility**: reads Claude Code's picker from the screen rows; `resolveAnswer`. Pure.

### AgentDialog
- **Path**: `src/renderer/AgentDialog.jsx`
- **Responsibility**: a modal pager for questions, permissions and replies (replaced the US-0505 popup).

### ReplyPage
- **Path**: `src/renderer/ReplyPage.jsx`
- **Responsibility**: the reply page and the message body, sanitised and rendered as Markdown.

### LatestMessageStrip
- **Path**: `src/renderer/LatestMessageStrip.jsx`
- **Responsibility**: the newest agent reply line per project, with Answer and Show.

### AgentHooks UI
- **Path**: `src/renderer/AgentHooksStrip.jsx`, `AgentHooksSection.jsx`, `AgentHooksPreview.jsx`
- **Responsibility**: the hook status notice, the settings section, and the install/update/remove preview.

### ResumeButton
- **Path**: `src/renderer/ResumeButton.jsx`
- **Responsibility**: resumes an in-flight intent through the agent tab when it is idle.

### IntentList
- **Path**: `src/renderer/IntentList.jsx`
- **Responsibility**: intents with search, filters, sort, cost and step dots.

### IntentDetail
- **Path**: `src/renderer/IntentDetail.jsx`
- **Responsibility**: header, progress, request text, five tabs (the `units` tab renders BoltDag with `dag` and `statuses`), readout column.

### Pipeline
- **Path**: `src/renderer/Pipeline.jsx`
- **Responsibility**: phases and stage cards with the unit level bar.

### Timeline
- **Path**: `src/renderer/Timeline.jsx`
- **Responsibility**: a virtualised, filtered audit timeline.

### BoltDag
- **Path**: `src/renderer/BoltDag.jsx` (83 lines)
- **Responsibility**: an SVG Unit DAG. Batches become columns, edges come from `dependsOn`, each node is a 200x64 block with `kind · status` and the name, and the status sets the class `unit-<status>`. It has no test of its own.

### ArtifactReader
- **Path**: `src/renderer/ArtifactReader.jsx`
- **Responsibility**: the artifact tree and `FileContent` (Markdown, JSON).

### CostPanel
- **Path**: `src/renderer/CostPanel.jsx`
- **Responsibility**: the project cost overview.

### CostTab
- **Path**: `src/renderer/CostTab.jsx`
- **Responsibility**: intent cost tables.

### TokenView
- **Path**: `src/renderer/TokenView.jsx`
- **Responsibility**: live token meters and the waveform.

### TokenDetail
- **Path**: `src/renderer/TokenDetail.jsx`
- **Responsibility**: visx charts of tokens over time and by stage, agent and model.

### Token Charts
- **Path**: `src/renderer/tokenFlow.js`, `src/renderer/tokenChart.js`
- **Responsibility**: the token history, rate and chart series. Pure.

### RefreshPanel
- **Path**: `src/renderer/RefreshPanel.jsx`
- **Responsibility**: Refresh from GitHub: status, fetch, remote changes, pull commands typed into the shell.

### Workflow Busy Rule
- **Path**: `src/renderer/workflowBusy.js`
- **Responsibility**: `isWorkflowRunning` (a busy terminal, or an intents write within 5 minutes).

### AidlcUpdate
- **Path**: `src/renderer/AidlcUpdate.jsx`
- **Responsibility**: the AI-DLC program and project update rows in Settings › Tools.

### SetupAidlc
- **Path**: `src/renderer/SetupAidlc.jsx`
- **Responsibility**: AI-DLC setup and add harness, with a preview before Apply.

### ProjectSettingsView
- **Path**: `src/renderer/ProjectSettingsView.jsx`
- **Responsibility**: project settings sections, including Agent dialogs.

### SettingsView
- **Path**: `src/renderer/SettingsView.jsx`
- **Responsibility**: the app settings tabs.

### ConfigView
- **Path**: `src/renderer/ConfigView.jsx`
- **Responsibility**: AI-DLC configuration per harness, "Arbetar nu" (working agents).

### ConfigEdit
- **Path**: `src/renderer/ConfigEdit.jsx`
- **Responsibility**: `ChangePanel` and the editors for settings, guards, the lock and models.

### PlansView
- **Path**: `src/renderer/PlansView.jsx`
- **Responsibility**: plans, stages, save, edit, delete.

### FeaturesView
- **Path**: `src/renderer/FeaturesView.jsx`
- **Responsibility**: epics, stories, the release picker, the Releases tab.

### Story Filter
- **Path**: `src/renderer/storyFilter.js`
- **Responsibility**: the shared story filter. Pure.

### Editor
- **Path**: `src/renderer/editor/`
- **Responsibility**: Monaco editor tabs, the conflict dialog, the file tree.

### UpdateNotice
- **Path**: `src/renderer/UpdateNotice.jsx`
- **Responsibility**: the app update offer and progress.

### AboutDialog
- **Path**: `src/renderer/AboutDialog.jsx`
- **Responsibility**: the About panel.

### DocsDialog
- **Path**: `src/renderer/DocsDialog.jsx`
- **Responsibility**: the project's `docs/README.md`.

### Splash
- **Path**: `src/renderer/Splash.jsx`
- **Responsibility**: the start-up splash.

### LCARS Primitives
- **Path**: `src/renderer/Lcars.jsx`, `src/renderer/AuctumMark.jsx`
- **Responsibility**: bars, frame, dots, readouts, hairlines; the mark.

### Format Helpers
- **Path**: `src/renderer/format.js`
- **Responsibility**: status labels (`unitStatusLabel` reads `common.unitStatus.*`), time, duration, cost and token formats.

### Theme Tokens
- **Path**: `src/renderer/tokens.js`
- **Responsibility**: CSS tokens for xterm.

### useProject
- **Path**: `src/renderer/useProject.js`
- **Responsibility**: the intent list, detail, cost and models; partial reload on `project:changed`; new-event highlight.

### useFeatures
- **Path**: `src/renderer/useFeatures.js`
- **Responsibility**: the feature docs and story links; reload on `features:changed`.

### Feature Docs Prompt
- **Path**: `src/renderer/featureDocsPrompt.js`
- **Responsibility**: the request typed into the agent tab to create feature docs.

### Theme Stylesheet
- **Path**: `src/renderer/theme.css` (1409 lines)
- **Responsibility**: the LCARS tokens and component styles. The `.dag-*` rules (l.879-888) style `unit-done` and `unit-running`.

## Build, CI and tests

### Release Workflow
- **Path**: `.github/workflows/release.yml`
- **Responsibility**: on PRs and tags: gitleaks, the tag/version check, tests with coverage, ESLint, Prettier, the mac and Linux builds, a GitHub Release with `SHA256SUMS.txt`.

### Build Scripts
- **Path**: `scripts/`, `electron.vite.config.mjs`, `vitest.config.mjs`, `eslint.config.mjs`
- **Responsibility**: the glibc check, pty permissions, icon, third-party licences, screenshots, bundling, test projects, lint rules.

### Packaging Config
- **Path**: `electron-builder.yml`, `package.json`, `build/`
- **Responsibility**: app id `se.auctum.thadeus`, the unsigned universal dmg, the Linux deb, unpacked `node-pty`, `publish: null`.

### Dialog Hook Script
- **Path**: `.thadeus/hooks/dialog.sh`
- **Responsibility**: the POSIX sh hook that writes event files and waits for answers. It is bundled into main with `?raw`.

### Test Suite
- **Path**: `tests/main`, `tests/renderer`, `tests/helpers`
- **Responsibility**: 111 test files, 1071 `it`/`test` call sites; see `code-quality-assessment.md`.

### Test Fixtures
- **Path**: `tests/fixtures/` (95 files)
- **Responsibility**: agent events, agent hooks, audit, features, ledger, picker screens, a sample project.

### Project Docs
- **Path**: `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `LICENSE`, `docs/`
- **Responsibility**: the outside-facing description, the roadmap and story status (checked in CI), release notes, screenshots.
