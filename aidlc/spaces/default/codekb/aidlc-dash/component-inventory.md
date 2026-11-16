# Component Inventory

One heading per component; the heading text is the component's name in the Scope of Analysis block. Paths are repo-relative. Dependencies list internal modules; external packages are in `dependencies.md`.

## Main process (`src/main/`)

### Main Entry
- **Path**: `src/main/index.js`
- **Responsibility**: app lifecycle; userData kept at `aidlc-dash`; `windowOptions()` (sandboxed, contextIsolation, fullscreen from settings); blocks navigation and new windows; close guard; daily update check; shutdown kills ptys and watchers.
- **Depends on**: IPC Router, App Menu, Settings Store, Tools Registry, Main i18n, App Name Module.

### IPC Router
- **Path**: `src/main/ipc.js` (709 lines at `2d111d6`, 837 at `4867a36`)
- **Responsibility**: the 71 invoke handlers; per-project state (`projects` map: root, space, watchers, sender, cached models/harnesses/setup info/previews); question baseline (`startedWith`), `allQuestions()`, `publishQuestions()`, `refreshQuestions()`; space, feature-docs, config and open-file watchers; window close confirmation; fixed external URL table.
- **Depends on**: nearly every main module.

### Project Service
- **Path**: `src/main/projectService.js`
- **Responsibility**: detect AI-DLC (`aidlc/spaces/`), list spaces, cached intent list with per-intent summaries (`activityAt` from the audit folder mtime), intent detail, cost from the ledger, `workingAgents()`, `inProgress()`, `loadPendingQuestions()` with a per-intent cache.
- **Depends on**: Project Access, all parsers, Questions Parser.

### Project Access
- **Path**: `src/main/projectAccess.js`
- **Responsibility**: root-confined, read-only file access (`openRoot`, `resolveInRoot` with realpath checks, `readText`, `readJsonSafe`, `listDir`, `newestMtime`, `exists`). Contains no write calls.

### Questions Parser
- **Path**: `src/main/questions.js`
- **Responsibility**: `parseOptions()` (JSON, comma, pipe, semicolon lists; `Q<n>:` batch summaries; strips descriptions in parentheses) and `pendingQuestions()` (open/close rules from audit events; see `api-documentation.md` section 4). Pure.

### Notifications
- **Path**: `src/main/notify.js`
- **Responsibility**: system notification per new question id, once per app run, unless the window is focused on that project; honours `questionAlerts` and `notificationSound`; a click restores the window and sends `questions:focus`. Holds `gateText`/`askText` (duplicated in QuestionPopup).
- **Depends on**: Shared i18n, electron `Notification`.

### PTY Manager
- **Path**: `src/main/pty.js`
- **Responsibility**: lazy `node-pty` load; spawn agent (`$SHELL -l -i -c <cli>`, CLI from Harness Table by validated id) or shell (`$SHELL -l`); stream `pty:data`/`pty:exit`; write (string only), resize (clamped), kill per session, per project, all.
- **Depends on**: Harness Table, Tools Registry, Shared i18n.

### Exec Runner
- **Path**: `src/main/exec.js`
- **Responsibility**: `runFixed()` (execFile, no shell, string args, timeout, login-shell PATH) and `loginPath()` (probed once with a marker).

### Tools Registry
- **Path**: `src/main/tools.js`
- **Responsibility**: the five tools (`TOOL_IDS`: `aidlc`, `claude`, `opencode`, `gh`, `shell`): saved paths, `toolPath(name)` (saved path else the bare name), login-shell PATH lookup, `probeTool` (`--version`, first line, max 80 chars, never throws), validation before saving.
- **Depends on**: Exec Runner.

### Harness Detection
- **Path**: `src/main/harness.js`
- **Responsibility**: `detectHarnesses()` per project: folder/file markers (and `opencode.json(c)` mentioning aidlc) plus `<cli> --version`; never rejects. Re-exports the table helpers.
- **Depends on**: Harness Table, Exec Runner, Tools Registry.

### Settings Store
- **Path**: `src/main/settings.js`
- **Responsibility**: the app's `settings.json` in userData; sanitising of every key (`questionAlerts`, `notificationSound`, `language`, `animations`, `fullscreen`, `toolPaths`, `defaultProjectFolder`, `updates`, per-root `projectSettings` with `harness`/`harnessTabs`); serialised writes.
- **Depends on**: Harness Table, Features Parser, Tools Registry.

### Watcher
- **Path**: `src/main/watcher.js`
- **Responsibility**: chokidar watchers: `watchIntents` (intents folder, ignoring `.aidlc-engine/` except `active-directive.json`, plus the ledger), `watchFiles` (named files/folders, appear-later safe), `watchOpenFiles` (editor), `watchForAidlc` (first space appears). Debounce 300 ms, max wait 800 ms.

### Setup Helper
- **Path**: `src/main/setup.js`
- **Responsibility**: `getSetupInfo` (other harness folders, git, `aidlc --version`, `config --harness <id> --dry-run` preview via `parsePreview`, installed plugins); `runSetup` runs `git init`, `aidlc --project-dir <root> config --harness <id> --yes`, plugins and preset steps itself in main (US-0802) after a matching, conflict-free preview; one run per root at a time; 120 s per step.
- **Depends on**: Exec Runner, Tools Registry, Git Reader, Project Access, Harness Table, Shared i18n.

### AI-DLC Config Reader
- **Path**: `src/main/aidlcConfig.js`
- **Responsibility**: read-only configuration per harness (`aidlc config <section> --show --json --harness`, `config list --json`, plans); `checkHarness()`; `CONFIG_WATCH_PATHS`.

### AI-DLC Config Writer
- **Path**: `src/main/aidlcWrite.js`
- **Responsibility**: tier 1 `aidlc config`/`engine config set`/`config flags` commands from fixed tables, with dry runs; tier 2 Guard Policy lock in a memory file after a diff, only if unchanged since preview.
- **Depends on**: Config Tables, Exec Runner, Project Access.

### Plans Service
- **Path**: `src/main/plans.js`
- **Responsibility**: own (`aidlc/scopes/`) and stock plans, stages from grid blocks or the compiled scope grid, save (`engine scope save`), tier-2 edit/delete of own plans then `engine graph compile`.

### Model Choice
- **Path**: `src/main/modelChoice.js`
- **Responsibility**: model/effort options per harness (claude, opencode), command building and validation, preview/apply/check, cost estimate from the ledger's own prices.

### Model Config Reader
- **Path**: `src/main/models.js`
- **Responsibility**: configured model per agent from `aidlc config models --show --json --harness claude`, else `.claude/agents/aidlc-*-agent.md` frontmatter; `frontmatterField()`.

### Git Reader
- **Path**: `src/main/git.js`
- **Responsibility**: read-only git for Refresh: status split into `aidlc/` and other, fetch, remote changes under `aidlc/`, read a remote file from git objects, conflicts, `isGitRepo`, `listReleaseTags`; `safeArg` refuses values that look like options.
- **Depends on**: Exec Runner, Project Access, Shared i18n.

### Updater
- **Path**: `src/main/updater.js`
- **Responsibility**: once-a-day check of `tochman/aidlc-dash` releases via `gh`, asset pick per platform, own-asset check, SHA256SUMS verification, install (mac: hdiutil/ditto/xattr, admin via osascript; Linux: pkexec dpkg), relaunch.

### File Editor Service
- **Path**: `src/main/fileWrite.js`
- **Responsibility**: editor reads with mtime/hash/readOnly reason; atomic write only if the hash still matches (else conflict); engine-owned paths (harness folders, `.opencode`, AI-DLC state, audit, intents.json, `.aidlc-*`) refused; file tree via `git ls-files`.

### Features Loader
- **Path**: `src/main/features.js`
- **Responsibility**: loads `FEATURES.md` and linked epic files (root-confined, read-only), with a sha256 `hash` per epic and `overviewHash` for the release write's conflict check; `featureWatchPaths()` (the overview and the epic folders only); story ids mentioned by each intent.
- **Depends on**: Project Access, Features Parser.

### Releases Service
- **Path**: `src/main/releases.js`
- **Responsibility**: `setStoryRelease()` (US-0603 FR2.2–FR2.4): validates the story id, reloads the docs, refuses an unknown or released story, writes the marker into the epic file then the overview through `writeFileSafe` with `expectHash`; returns `{ok}` or `{conflict}`. `readRuleStatus()` reads the lifecycle rule from the space's `project.md`.
- **Depends on**: Features Loader, Releases Parser, File Editor Service, Project Access, Shared i18n.

### App Menu
- **Path**: `src/main/menu.js`
- **Responsibility**: menu template (pure `buildMenuTemplate`), commands sent as `menu:command`, `menu:state` parsing, docs and issues URLs.

### Main i18n
- **Path**: `src/main/i18n.js`
- **Responsibility**: sets main's language from the setting and OS locale.

### Audit Parser
- **Path**: `src/main/parsers/audit.js`
- **Responsibility**: parses shards into events with stable keys, merges shards by time, `categoryOf()`, `NOISY_EVENTS`. Pure (also bundled into the renderer by `Timeline.jsx`).

### State Parser
- **Path**: `src/main/parsers/state.js`
- **Responsibility**: `aidlc-state.md` sections and stage checkboxes, plan/scope/depth/test strategy/current stage.

### Runtime Graph Parser
- **Path**: `src/main/parsers/runtimeGraph.js`
- **Responsibility**: normalises `runtime-graph.json` stages and Bolt DAG.

### Pipeline Merger
- **Path**: `src/main/parsers/pipeline.js`
- **Responsibility**: merges state checkboxes with graph timings, flags mismatches, counts done/executed.

### Intents Merger
- **Path**: `src/main/parsers/intents.js`
- **Responsibility**: merges `intents.json` with folders on disk, marks missing ones and the active intent.

### Units Status
- **Path**: `src/main/parsers/units.js`
- **Responsibility**: unit status from `UNIT_STARTED`/`UNIT_COMPLETED`.

### Ledger Parser
- **Path**: `src/main/parsers/ledger.js`
- **Responsibility**: `summarizeLedger()` per project/intent/stage/agent/model/scope, `agentModels()` attribution, `compareModels()`, `agentName()`. Pure (also used by the renderer).

### Features Parser
- **Path**: `src/main/parsers/features.js`
- **Responsibility**: `parseOverview`, `parseEpic` (stories with `status` and `statusText`, the head line's text without markers), status markers including 🚀 Deployed, `isValidFeaturesPath`, `storyIdsIn`. Pure (also used by the renderer).

### Releases Parser
- **Path**: `src/main/parsers/releases.js`
- **Responsibility**: `DELIVERY` (`releases`, `continuous`), `releaseOf`, `setReleaseMarker`, `releaseOptions`, `buildReleases`, `lifecycleTag`, `ruleStatus` (see `architecture.md`, "Releases: derived, not stored"). The `vX.Y.Z` regex and the newest-first sort are module-private. Pure (also used by the renderer).
- **Depends on**: Features Parser (`storyIdsIn`).

## Preload

### Preload Bridge
- **Path**: `src/preload/index.js`
- **Responsibility**: `window.bridge` with named members only (see `api-documentation.md` section 1). The question members are read-only: answering goes through `ptyWrite`. Release members: `loadFeatures`, `setStoryRelease` (story id, version and hashes, never a path), `getLifecycleRuleStatus`, `onFeaturesChanged`.

## Shared (`src/shared/`)

### Harness Table
- **Path**: `src/shared/harnesses.js`
- **Responsibility**: the six harnesses (claude, opencode selectable; codex, kiro, cursor, copilot setup-only) with markers, CLI, `commands.aidlc`, `quietMs` (opencode 4000), `pickerKeys` (Claude Code only), `perAgentModels`; helpers `selectableHarness`, `setupHarness`, `defaultSetupHarness`, `resolveHarness`, `scopesDir`, `harnessCommand`. Adding a harness starts here.

### Shared i18n
- **Path**: `src/shared/i18n.js`
- **Responsibility**: one i18next instance per process with ICU, `sv`/`en`, English fallback, `resolveLanguage`, `t`, `locale`.

### Config Tables
- **Path**: `src/shared/configTables.js`
- **Responsibility**: fixed tables for project settings, active-work settings, guard switches, guard lock layers/modes, efforts, presets, groups, Claude models, applied effort.

### App Name Module
- **Path**: `src/shared/appName.js`
- **Responsibility**: the app name in every form.

### Plan Name Rule
- **Path**: `src/shared/planName.js`
- **Responsibility**: `validPlanName()` shared by the Plans view and main.

### Locale Files
- **Path**: `src/shared/locales/sv.json`, `src/shared/locales/en.json` (749 texts each, same keys)
- **Responsibility**: every UI text, grouped by view; `app.question.*` holds the popup texts.

## Renderer (`src/renderer/`)

### Renderer Bootstrap
- **Path**: `src/renderer/main.jsx`, `src/renderer/index.html`
- **Responsibility**: fonts and theme, language from main before the first render, `<html lang>`; CSP.

### App Shell
- **Path**: `src/renderer/App.jsx` (603 lines)
- **Responsibility**: project tabs and restore, left arm and header, view per project, settings view, menu commands, docs/about/update dialogs; question state (`questions`, `seenQuestionsRef`, popup open/focus), `sendAnswer()` and `answerInAgent()` as `terminalCommand`s; `askingIntents` per project.
- **Depends on**: ProjectView, QuestionPopup, SettingsView, dialogs, Harness Table.

### ProjectView
- **Path**: `src/renderer/ProjectView.jsx`
- **Responsibility**: one `TerminalProvider` per project; harness resolution (saved choice, tabs, detection, `harnessProblem`); reports `harness`, `busy`, `showFeatures`, `intentCount` to App; runs `terminalCommand` (`answer`, `restart`, show tab); setup done offer; view switching; editor tabs.

### TerminalContext
- **Path**: `src/renderer/TerminalContext.jsx`
- **Responsibility**: shared terminal control per project: tab registry (`agent:<id>`, `shell`, alias `agent` = last agent tab used), states, `type`, `sequence`, `restart`, `anyBusy`, `asking`, `running`, `busyAgents`, pending-Enter marks, and `answer(q, answer)` (waits for the picker, writes the picker's keys, or own text into the last agent tab when no picker shows).
- **Depends on**: Terminal Control, Picker Reader.

### TerminalPanel
- **Path**: `src/renderer/TerminalPanel.jsx`
- **Responsibility**: `TermSession` (one xterm bound to one pty: spawn, data, exit, resize, drop files, `screen()` via `screenLines()` with 40 rows of scrollback and wrapped rows joined); tab bar with states; quick commands select; resize handle; two-busy warning; pending-Enter and error footer.
- **Depends on**: TerminalContext, Terminal Control, Harness Table, Theme Tokens.

### Terminal Control
- **Path**: `src/renderer/terminalControl.js`
- **Responsibility**: `createActivity` (`exited`/`busy`/`idle` from output timing, quiet 1.5 s), `waitFor`, `runSequence`, shell quoting for dropped paths. Pure.

### Picker Reader
- **Path**: `src/renderer/picker.js`
- **Responsibility**: `readPicker()` reads Claude Code's numbered picker from screen rows (cursor `❯`, indented descriptions, rule, `□` header chips for batches); `resolveAnswer()` maps a logged option to the picker's key only when every logged option is shown; `waitForAnswer()` retries for 3 s. Pure.

### QuestionPopup
- **Path**: `src/renderer/QuestionPopup.jsx`
- **Responsibility**: modal `<dialog>` with the question as plain text, numbered choices (gate: Approve / Request changes) when the harness has `pickerKeys`, an own-answer field, batch note, pager, Open the terminal, Close; calm then red after 20 s (`OVERDUE_MS`); "may not have arrived" after 10 s (`ARRIVAL_MS`).

### ResumeButton
- **Path**: `src/renderer/ResumeButton.jsx`
- **Responsibility**: Resume an in-flight intent with the harness's AI-DLC command; waits while an agent works, asks, runs the work, or an outside agent wrote the audit log in the last 10 minutes.

### IntentList
- **Path**: `src/renderer/IntentList.jsx`
- **Responsibility**: intents with search, status and plan filters, sort by date/cost/name, row cost and step dots, Resume on the selected row.

### IntentDetail
- **Path**: `src/renderer/IntentDetail.jsx`
- **Responsibility**: intent header, progress dots, request text, tabs (pipeline, timeline, units, cost, files), readout column with live tokens.

### Pipeline
- **Path**: `src/renderer/Pipeline.jsx`
- **Responsibility**: phases and stage blocks with status, cost, model and files; skipped stages behind Show.

### Timeline
- **Path**: `src/renderer/Timeline.jsx`
- **Responsibility**: virtualised audit events, filters, noise toggle, new-event counter, keyboard navigation.

### BoltDag
- **Path**: `src/renderer/BoltDag.jsx`
- **Responsibility**: SVG unit DAG by batches with status.

### ArtifactReader
- **Path**: `src/renderer/ArtifactReader.jsx`
- **Responsibility**: artifact tree and `FileContent` (Markdown with `skipHtml`, links only http(s), pretty JSON); reused by Features, Refresh, Docs, Update and the editor preview.

### CostPanel
- **Path**: `src/renderer/CostPanel.jsx`
- **Responsibility**: project cost total, readout, chart, per-model/agent/scope tables, configured vs actual models.

### CostTab
- **Path**: `src/renderer/CostTab.jsx`
- **Responsibility**: one intent's cost by stage/agent/model and participant models; `CostTable`, `ModelTable`, `CostLabel`.

### TokenView
- **Path**: `src/renderer/TokenView.jsx`
- **Responsibility**: live token meters and rate waveform while an intent is in flight.

### Token Flow
- **Path**: `src/renderer/tokenFlow.js`
- **Responsibility**: token history, rate, meter levels. Pure.

### RefreshPanel
- **Path**: `src/renderer/RefreshPanel.jsx`
- **Responsibility**: the sidebar "Uppdatera från GitHub" panel (opened by the left arm's Github block via `open`/`onToggle`): git status, fetch, remote changes under `aidlc/`, pull/rebase choices typed into the shell tab without Enter (`typeInShell`), conflicts. Holds the running-workflow gate: `working` = `terminal.anyBusy()` or an intents write within `WORKING_MS` (5 min, `useRecent`), which disables the actions and shows `github.wait`.
- **Depends on**: TerminalContext, ArtifactReader, Preload Bridge.

### SetupAidlc
- **Path**: `src/renderer/SetupAidlc.jsx`
- **Responsibility**: set up AI-DLC (the "not an AI-DLC project" screen) or add a harness (Projektinställningar): prerequisites (aidlc version, git, other harnesses), harness choice, `Preview` of the dry-run counts and conflicts, advanced options, Apply through `runSetup`, switch offer. Apply is blocked by a missing preview, a conflict, or a harness changed since the preview.
- **Depends on**: TerminalContext, Harness Table, Format Helpers, Preload Bridge.

### ProjectSettingsDialog
- **Path**: `src/renderer/ProjectSettingsDialog.jsx`
- **Responsibility**: feature-docs mode and path, agent-terminal harness, side-by-side tabs, add harness, open Configuration; `confirmHarnessSwitch()`.

### SettingsView
- **Path**: `src/renderer/SettingsView.jsx`
- **Responsibility**: app settings: tools, appearance (animations, fullscreen, language, question alerts, notification sound), projects, about and update cleanup.

### ConfigView
- **Path**: `src/renderer/ConfigView.jsx`
- **Responsibility**: AI-DLC configuration per installed harness, working agents, live reload on `config:changed`.

### ConfigEdit
- **Path**: `src/renderer/ConfigEdit.jsx`
- **Responsibility**: `ChangePanel` (command, dry run, apply), active-work editor, defaults editor, guard switches, guard lock, model picker.

### PlansView
- **Path**: `src/renderer/PlansView.jsx`
- **Responsibility**: own and stock plans with stages; compose/start/steps requests typed into the agent tab; save, edit, delete through main.

### FeaturesView
- **Path**: `src/renderer/FeaturesView.jsx`
- **Responsibility**: epics and stories from the feature docs with filters, story detail and intent links. With `delivery` `releases`: `ReleasePicker` in the story detail (options from `releaseOptions`, plus a stale planned version; None removes; no picker for a released story) and `ReleasesView` (the Releases tab chosen in the left arm: `buildReleases` rows with version, planned/released date, story count, stories that open their detail, stale flags). `ReleasesView` receives no `projectId`. With `continuous` both are hidden.
- **Depends on**: Features Parser, Releases Parser, ArtifactReader, Editor, LCARS Primitives, Format Helpers, Preload Bridge.

### Editor
- **Path**: `src/renderer/editor/` (`EditorPanel.jsx`, `EditorContext.jsx`, `ConflictDialog.jsx`, `FileTree.jsx`, `MonacoPane.jsx`, `monacoSetup.js`)
- **Responsibility**: editor tabs per project with dirty tracking, hash-checked saves and conflicts, open-file watching, Markdown preview, lazy Monaco with an LCARS theme, file tree.

### UpdateNotice
- **Path**: `src/renderer/UpdateNotice.jsx`
- **Responsibility**: update offer, progress, install outcome; asks first while an agent is busy.

### AboutDialog
- **Path**: `src/renderer/AboutDialog.jsx`
- **Responsibility**: About window in the LCARS panel design with version and platform codes.

### DocsDialog
- **Path**: `src/renderer/DocsDialog.jsx`
- **Responsibility**: the project's `docs/README.md` as Markdown, with Edit.

### Splash
- **Path**: `src/renderer/Splash.jsx`
- **Responsibility**: start-up splash between 0.9 and 4 s.

### LCARS Primitives
- **Path**: `src/renderer/Lcars.jsx`, `src/renderer/AuctumMark.jsx`
- **Responsibility**: bars, frame, hairlines, dots, readout; the Auctum mark SVG.

### Format Helpers
- **Path**: `src/renderer/format.js`
- **Responsibility**: translated status labels, time/duration/cost/token formatting, `stagePosition`, `withSlots`.

### Theme Tokens
- **Path**: `src/renderer/tokens.js`
- **Responsibility**: reads CSS tokens from `:root` for xterm's theme.

### useProject
- **Path**: `src/renderer/useProject.js`
- **Responsibility**: intent list, detail, cost and models for one project; partial reload on `project:changed`; new-event highlight.

### useFeatures
- **Path**: `src/renderer/useFeatures.js`
- **Responsibility**: feature docs, project settings and story links; reload on `features:changed`.

### Feature Docs Prompt
- **Path**: `src/renderer/featureDocsPrompt.js`
- **Responsibility**: the one-line request typed into the agent tab to create feature docs.

### Theme Stylesheet
- **Path**: `src/renderer/theme.css`
- **Responsibility**: LCARS tokens on `:root`, component styles, question-popup calm/overdue styles, `data-motion` rules (skimmed in this run).

## Build, CI and tests

### Release Workflow
- **Path**: `.github/workflows/release.yml`
- **Responsibility**: on PR to `main` and `v*.*.*` tags: tag/version check, `npm ci`, tests with coverage (80% floor), ESLint, Prettier (separate steps), mac universal .dmg, Linux .deb on ubuntu-22.04 with the glibc check; on tags a GitHub Release (`gh release create --generate-notes`) with `SHA256SUMS.txt`. Token scope `contents: read`, write only in the release job. The header comment still calls the repo private and the builds internal.
- **Depends on**: Build Scripts, Packaging Config.

### Build Scripts
- **Path**: `scripts/check-glibc.mjs`, `scripts/fix-pty-perms.cjs`, `scripts/make-icon.cjs`, `electron.vite.config.mjs`, `vitest.config.mjs`
- **Responsibility**: bundling, glibc and foreign-prebuild check (CI), spawn-helper permissions (postinstall), icon rendering from `build/icon.svg` (the Auctum mark), test projects. Script messages are in Swedish.

### Packaging Config
- **Path**: `electron-builder.yml`, `package.json` (metadata), `build/`
- **Responsibility**: app id `se.auctum.thadeus`; ships `out/**` and `package.json`, unpacks `node-pty`; unsigned mac dmg, Linux deb (maintainer `info@auctum.se`, replaces `aidlc-dash`); `publish: null`. Package metadata: `private: true`, `license: MIT`, author Auctum Solutions AB, homepage `github.com/tochman/aidlc-dash`. No third-party licence notice is packaged (see `dependencies.md` "Licences").
- **Depends on**: Build Scripts (icon).

### Test Fixtures
- **Path**: `tests/fixtures/` (95 tracked files)
- **Responsibility**: sample inputs for the main and renderer tests; layout in `code-structure.md`, privacy findings in `code-quality-assessment.md` ("Public-readiness review").

### Project Docs
- **Path**: `README.md`, `LICENSE`, `docs/FEATURES.md`, `docs/features/epic-*.md` (13), `docs/releases/` (0.2.3, 0.2.4), `docs/screenshots/` (5 PNG)
- **Responsibility**: outside-facing description, install and development guide, MIT licence, roadmap and story status (read by Features Parser and checked in CI), README images.

### Test Suite
- **Path**: `tests/` (32 main and 27 renderer test files, fixtures)
- **Responsibility**: unit and component tests; see `code-quality-assessment.md` for coverage of the intent area.
