# Component Inventory

One heading per component; the heading text is the component's name in the Scope of Analysis block. Paths are repo-relative. The external packages are in `dependencies.md`.

This run (`39a3dbf`, US-0608) re-read these components: Planning Record, Planning Sync, File Editor Service, Releases Service, Releases Parser, FeaturesView, IPC Router (the planning, features, file and watcher parts), Preload Bridge, Release Workflow and Packaging Config (`package.json` only). The other entries are from earlier scans (`721e051`, `f46cb71`, `bbfb4c0`, `2b5d6a4`, `0ebb196`), or were only listed, which is marked.

## Main process (`src/main/`)

### Main Entry
- `src/main/index.js`: the app lifecycle, single instance, `windowOptions()` (sandbox, contextIsolation), the navigation block, the close guard, the update check and shutdown.

### IPC Router
- `src/main/ipc.js` (1300 lines at `39a3dbf`): the invoke handlers in one table, wrapped by `registerIpc` (log, then rethrow).
- Per-project state in `projects`: root, space, watchers, sender, `intentChangedAt`, `harnesses`, `models`, `modelOptions`, pending previews and `questions`.
- `watchSpace` starts `watchIntents`. Its `onChange` sets `intentChangedAt`, sends `project:changed` and calls `refreshQuestions` (with a `startedWith` baseline).
- `syncFeaturesWatch` (`:308`) watches the overview, the epic folders and the plans folder, and sends `features:changed` only. It restarts itself when the watched set changes.
- Planning (`:540-603`):
  - `planningCtx` takes the root, `userData`, `featuresPath` and `planningBranch` from main's settings, plus `runGh` and `net.isOnline`.
  - `appBusy` is true while a question waits or an AI-DLC write happened in the last 5 min.
  - `planning = createScheduler({run, idle, intervalMs})`. `run` returns `{}` when the docs are hidden or delivery is `continuous`, and sends `features:changed` only when the cycle re-applied or pushed.
  - `planningAction` runs `planAction`, sends `features:changed` and calls `planning.kick` without awaiting it.
  - `planningStatus` reads the record's `actions.length` and the last in-memory cycle result.
  - `registerIpc` starts a 60 s `tick` over every open project.
- `file:read` / `file:write` (`:1007-1009`) go straight to `readForEdit` / `writeFileSafe`; nothing is recorded.
- Agent progress (`0ebb196`): `agents:progress`, `agentActivity:list`, the `agent:activity` push.

### Project Service
- `src/main/projectService.js` (417 lines, not re-read): `detectProject`, `loadIntentList` (cached per root and space), `summarizeIntent`, `inProgress(intent)`, `loadAuditEvents`, `workingAgents`, `inflightCount`, `loadPendingQuestions`, `loadCost`, `loadCrossMachineCost`, the velocity loader; `LEDGER_PATH`, `INFLIGHT_PATH`, `intentsDir`, `assertName`.

### Project Access
- `src/main/projectAccess.js`: root-confined reads (`openRoot`, `resolveInRoot`, `readText` as UTF-8, `readJsonSafe`, `listDir`, `newestMtime`, `exists`). No write calls.

### Watcher
- `src/main/watcher.js`: `watchIntents` (the intents folder, the ledger, `.thadeus/usage`, the worktree Unit plans; 300 ms, max 800 ms), `watchFiles` (named files and the `.md` files directly in named folders; 300 ms, max 800 ms), `watchOpenFiles` and `watchForAidlc`.

### Audit Parser
- `src/main/parsers/audit.js`: the shards as events with stable keys; `mergeAudits`, `categoryOf`. Pure.

### State Parser
- `src/main/parsers/state.js`: the `aidlc-state.md` sections and stage checkboxes. Pure.

### Runtime Graph Parser
- `src/main/parsers/runtimeGraph.js`: the stages and the Bolt DAG. Pure. The source file is git-ignored.

### Pipeline Merger
- `src/main/parsers/pipeline.js`: state and graph merged per stage; the counts skip `[S]` stages.

### Intents Merger
- `src/main/parsers/intents.js`: `mergeIntents(index, diskDirs, activeDirName)`. Pure.

### Units Status
- `src/main/parsers/units.js`: `pending`/`running`/`done` per Unit.

### Ledger Parser
- `src/main/parsers/ledger.js`: `summarizeLedger`, `agentModels`, `compareModels`, `agentName`, `costOf`. Pure.

### Audit Cost Parser
- `src/main/parsers/auditCost.js` (US-0209): `stageRollups`, `shardCosts`, `shardName`, `mergeIntentCosts`, `addTree`. Pure.

### Agent Progress Parser
- `src/main/parsers/agentProgress.js` (US-0507): `progressRows(events, {running, nowMs})`, `planSteps(text)`, `severityCounts(record)`. It imports `workingAgents` from `projectService.js`.

### Agent Progress Loader
- `src/main/agentProgress.js` (US-0507): `loadAgentProgress(root, space, dirName, {exec, nowMs})` reads the Unit's or the stage's plan and the last commit subject, and the review records.

### Velocity Parser
- `src/main/parsers/velocity.js` (US-0303, listed only): `intentMetrics`, `storyMetrics`, `projectMetrics`, `parseMarkerHistory`.

### Features Parser
- `src/main/parsers/features.js`: `parseOverview`, `parseEpic`, `statusOf`, `epicStatusOf`, `storyIdsIn`, `isValidFeaturesPath`. Pure; never throws.

### Releases Parser
- `src/main/parsers/releases.js` (253 lines). Pure; no Node imports, so the renderer uses it too.
  - `releaseOf(text)` gives `{planned, released}`.
  - `setReleaseMarker(text, storyId, version|null)` changes the head line and the segments that name that story alone; a bad version throws.
  - `buildReleases(epics, tags, plans)`, `releaseOptions`, `nextVersions`, `newReleaseError`, `canDelete`.
  - `planHeading`, `isHeadingOnly`, `addPlanRows`, `removePlanRows`.
  - `PLANNING_BRANCH_DEFAULT` (`docs/planning`), `isValidBranchName`.
  - `DELIVERY`, `lifecycleTag`, `ruleStatus`.

### Questions Parser
- `src/main/questions.js`: `pendingQuestions` from the audit events, `auditEvent`/`auditContext`.

### Notifications
- `src/main/notify.js`: system notifications for agent events and audit questions, decided once per event id through Alert Plan.

### PTY Manager
- `src/main/pty.js`: lazy `node-pty`; agent or shell sessions per project.

### Exec Runner
- `src/main/exec.js`: `runFixed(file, args, {cwd, timeout = 10 s, exec, env, maxBuffer})` uses execFile with no shell and the login shell's PATH. `exec` is injectable for tests.

### Tools Registry
- `src/main/tools.js`: `TOOL_IDS` (aidlc, claude, opencode, gh, shell), saved paths, PATH lookup, `toolPath`, `probeTool`.

### Harness Detection
- `src/main/harness.js`: `detectHarnesses()` from folder markers and `--version`.

### Settings Store
- `src/main/settings.js`: the app's `settings.json` in userData. `sanitize` keeps known keys only; per-root `projectSettings` go through `sanitizeProject` (capped at 200 projects). It also exports `PLANNING_BRANCH_DEFAULT`, `PLANNING_PUSH_DEFAULT` and `settingsNow()`. Writes are queued.

### Setup Helper
- `src/main/setup.js`: `getSetupInfo` (a dry-run preview), `runSetup`.

### AI-DLC Config Reader
- `src/main/aidlcConfig.js` (skimmed): read-only `aidlc config <section> --show --json --harness <h>`, `checkHarness`, `CONFIG_WATCH_PATHS`.

### AI-DLC Config Writer
- `src/main/aidlcWrite.js`: tier 1 `buildCommand` with `--yes`/`--dry-run`; tier 2 `guardLockDiff`, `previewGuardLock`, `applyGuardLock`.

### AI-DLC Update Check
- `src/main/aidlcUpdate.js`: `update --check` and the project `config --dry-run` plan.

### Plans Service
- `src/main/plans.js`: own and stock plans, stages, save, edit, delete, recompile.

### Cost Rules Service
- `src/main/costRules.js` (US-0212, listed only): the marked block in `project.md` and the phase files.

### Model Choice
- `src/main/modelChoice.js` (US-0904): `modelOptions`, `buildModelCommand`, `previewModelChange`, `applyModelChange`, `checkDrift`, `estimateCost`.

### Model Config Reader
- `src/main/models.js`: `getConfiguredModels(root)`, Claude-only, never throws.

### Git Reader
- `src/main/git.js` (skimmed at `39a3dbf`): fixed git with `safeArg`: status, fetch, remote changes, `show`, conflicts, `listReleaseTags`, `lastCommitSubject`, `originUrl`, `behindCount`, `changedFiles`, `predictConflicts`, `remoteStoryBranches`, the epic history. For planning it adds `currentBranch` (`symbolic-ref --short HEAD`, null when detached), `worktreeAdd` (on a branch, new with `-b … --no-track` at a base, or `--detach`), `worktreeRemove --force` and `pushRef`.

### Updater
- `src/main/updater.js`: the GitHub release check, asset pick and checksum, install, relaunch.

### File Editor Service
- `src/main/fileWrite.js` (138 lines, US-1001):
  - `readForEdit(root, rel)` gives `{content, mtimeMs, hash, size, readOnly: null|engine|binary|tooLarge}`.
  - `writeFileSafe(root, rel, content, {expectMtime, expectHash})`:
    - refuses a path that is engine-owned, out of the root or not a file;
    - skips the hash only when the mtime matches and a hash is given;
    - a mismatch returns `{conflict: true, disk}`;
    - the write is atomic, and it keeps the file mode.
  - `writeAtomic(abs, bytes, {mode, expect})` writes a temp file in the same folder, then renames it (no fsync). The planning record uses it too.
  - `isEngineOwned`, `listTree` (`git ls-files`, else a walk), `TREE_SKIP`, `MAX_EDIT_BYTES` (2 MiB).
  - It knows nothing of the feature docs: a save to them is not recorded or committed.

### Features Loader
- `src/main/features.js` (skimmed at `39a3dbf`): `loadFeatures(root, overviewRel)` gives `{available, overviewPath, overviewText, overviewHash, intro, epics[{…row, file, parsed, hash}], plans[{version, file, hash, headingOnly}], warnings}`, with sha256 hashes of the UTF-8 text. Also `plansDir` (`<overview dir>/releases`), `featureWatchPaths` (the overview, the epic folders, the plans folder) and `loadStoryLinks`.

### Releases Service
- `src/main/releases.js` (162 lines):
  - `setStoryRelease(root, overviewRel, {storyId, version, epicHash, overviewHash})`:
    - throws for a bad id, an unknown story or a released story;
    - writes the epic, then the overview, each only if its text changes, each hash-checked (`{conflict: rel}`);
    - then adds the story's row to the new release's plan file (created with `wx` when missing) and removes it from the old release's plan file, both hash-checked against their fresh read.
    - It is two or more writes, not one transaction (ponytail).
  - `createRelease(root, overviewRel, version, tags)` checks with `newReleaseError` and writes `# Release plan vX.Y.Z` with `wx`.
  - `deleteRelease(root, overviewRel, {version, hash}, tags)`: only when `canDelete`; a changed hash returns `{conflict}`; the hash is checked and the file unlinked in two steps.
  - `readRuleStatus(root, space, delivery)`.

### Planning Record
- `src/main/planningRecord.js` (69 lines, US-0607 FR1.1, FR1.2):
  - `KINDS = ['setRelease', 'createRelease', 'deleteRelease']`; `recordFile(userData, root)` = `<userData>/planning/<sha1(root)>.json`.
  - `readRecord` gives `{protectedMain?, actions}`; invalid actions are dropped, and a missing or unreadable file is empty.
  - `addAction` (validates, `state: 'pending'`), `markCommitted`, `removeActions`, `setProtectedMain`.
  - All go through `update()`, one promise queue for every project in the process, written with `writeAtomic`.

### Planning Sync
- `src/main/planningSync.js` (416 lines, US-0606, US-0607). Constants: `BRANCH = 'dash/planning'`, `MAIN = 'main'`, git timeout 30 s.
  - `applyAction(root, action, {featuresPath, tags, hashes})` runs one operation; it is idempotent and gives `{changed}` (by the docs' hash fingerprint) or `{conflict}`. For `setRelease` the first story uses the given hashes; later stories read fresh ones.
  - `commitActions`:
    - picks the target (`targetOf`) and checks whether the checkout is on it (`currentBranch === target`);
    - in place, it applies the actions with the renderer's hashes, then `commitIn` commits every changed file under the three doc paths;
    - otherwise it applies and commits in `withWorktree` (`<userData>/planning/wt-<sha1[:12]>`, removed in `finally`) on `planningSpec` (the existing `dash/planning`, else a new branch at `origin/<target>`, `origin/main`, the local target or `main`). With no actions and not in place, nothing happens.
  - `serial(root, fn)` keeps one operation at a time per root, in this process only.
  - `planAction(ctx, action, hashes)` records, then commits. A throw or a conflict removes the action; a refused commit keeps it as `pending`; success marks it `committed`.
  - `reapplyLost` / `reapplyStep` apply every recorded action again (skipping failures), then mark them all committed.
  - `runCycle(ctx)` re-applies, then runs `pushStep`:
    - no origin gives `noRemote`; nothing ahead gives `{}`; offline gives an error;
    - it fetches, and learns protection with `gh api` once;
    - `pushAll` rebases each source in a worktree and pushes `HEAD:<target>`, then fast-forwards a checked-out target;
    - a "protected branch" refusal retargets the docs branch and tries again;
    - after a push it removes the committed actions and deletes `dash/planning`, and on the docs branch runs `openPull` (`gh pr create`, `gh pr merge --squash`, else `prOffer`).
  - `createScheduler({run, idle, intervalMs, now})` gives `{status, pushNow, kick, tick}`. A throw becomes `{error: {kind: 'git'}}`, and only the last result per key is kept.

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
- `src/main/agentEvents.js` (569 lines at `6ec3546`; US-0506, US-0213, US-0214, US-0030): open agent events per project, the state machine, answers, the session signals and the activity rows (`KIND_ACTIVITY`, `feedActivity`, 250 ms push, 30 s idle push).
  - `move` (`:146-157`) is the one transition and deletes only on `ended` (3 s later for `KEPT` = `session`, `terminal`, `typed`); `list` (`:133-137`) returns every state, sorted by `byPager`. `OPEN` = `shown`, `timedOut`. `addHandoff` (`:493-520`) keeps one handoff per session. Settled pages in the list: see `code-quality-assessment.md`, US-0031 notes.

### Agent Adapters
- `src/main/agentAdapters.js`: Claude Code and opencode hook payloads to events and back. Pure. Activity keeps only `IDENT`-shaped values.

### Agent Permissions
- `src/main/agentPermissions.js`: permission prompts and Allow-always rules.

### Agent Replies
- `src/main/agentReplies.js`: the agent reply lifecycle.

### Agent IPC
- `src/main/agentIpc.js`: renderer-facing agent handlers and listeners.

### Agent Hooks Installer
- `src/main/agentHooks.js` (864 lines): status, preview and apply for the app's hook files. `KINDS` and `ACTIVITY_KINDS`.

### Agent Timing Log
- `src/main/agentTiming.js`: the development timing log.

## Preload

### Preload Bridge
- `src/preload/index.js` (185 lines): `window.bridge` with named members only (see `api-documentation.md` section 1).
  - Feature docs: `loadFeatures`, `getStoryLinks`, `setStoryRelease`, `createRelease`, `deleteRelease`, `getPlanningStatus`, `pushPlanning`, `getLifecycleRuleStatus` (lines 85-95) and `onFeaturesChanged` (line 138).
  - Editor: `readFileForEdit`, `writeFile`, `watchOpenFiles`, `onFileChanged` (lines 34-38).
  - There is no planning-status subscription.

## Shared (`src/shared/`)

### Agent Activity Model
- `src/shared/agentActivity.js` (US-0214): `reduceActivity`, `activityRows`. Pure; no agent text by construction.

### Harness Table
- `src/shared/harnesses.js`: six harnesses with markers, CLI, commands and `perAgentModels`.

### Shared i18n
- `src/shared/i18n.js`: one i18next instance per process with ICU, `sv`/`en`, `t`, `locale`.

### Config Tables
- `src/shared/configTables.js`: fixed tables for settings, guards, the lock and models.

### Cost Rules Table
- `src/shared/costRules.js` (US-0212, listed only).

### App Name Module
- `src/shared/appName.js`: the app name in every form.

### Plan Name Rule
- `src/shared/planName.js`: `validPlanName()`.

### Agent Text Sanitizer
- `src/shared/agentText.js`: the one sanitizer for agent text.

### Agent Order
- `src/shared/agentOrder.js`: `byPager`, rank question/permission 0, reply 1, handoff 2, then `arrivedAtMs`, `tabId`, `seq` (`:6-10`).

### Alert Plan
- `src/shared/alertPlan.js`: one alert decision per kind and setting.

### Locale Files
- `src/shared/locales/sv.json`, `en.json`: every UI text, nested by view. Planning keys are under `features.planning.*` (`title`, `pending`, `reapplied`, `noRemote`, `prOffer`, `pushNow`, `error.{offline,conflict,push,commit,git}`) and `features.release.*`.

## Renderer (`src/renderer/`)

### Renderer Bootstrap
- `main.jsx`, `index.html`: fonts, theme, the language before the first render, the CSP.

### App Shell
- `App.jsx`: project tabs, the left arm, settings, menu commands, dialogs. Agent dialog wiring (`:222-298`): `receiveAgentEvents` opens the dialog on a fresh open event, `dialogEvents`/`popupEvents` feed it, `hasNewQuestion` closes it.

### ProjectView
- `ProjectView.jsx`: one `TerminalProvider` per project, with `useProject` and `useFeatures`; the `view === '<id>'` branches.

### TerminalContext
- `TerminalContext.jsx`: the tab registry, `type`, `sequence`, `restart`, `anyBusy`, `answer`, `state`.

### TerminalPanel
- `TerminalPanel.jsx`: xterm sessions bound to ptys, the tab bar, quick commands.

### Terminal Control
- `terminalControl.js`: the activity signal, `waitFor`, `runSequence`, shell quoting. Pure.

### Picker Reader
- `picker.js`: reads Claude Code's picker from the screen rows. Pure.

### AgentDialog
- `AgentDialog.jsx` (775 lines): the LCARS modal pager for questions, permissions, replies and the handoff page. Stays mounted while closed; the shown page is `pageId`, else `lastIndex` (`:559-565`); "+n nya" counts ids not seen when the page first showed (`:593-595`); `settled` (`:646`) marks a hook page that is no longer open.

### ReplyPage
- `ReplyPage.jsx`: the reply page, sanitised Markdown.

### LatestMessageStrip
- `LatestMessageStrip.jsx`: the newest agent reply line per project.

### AgentHooks UI
- `AgentHooksStrip.jsx`, `AgentHooksSection.jsx`, `AgentHooksPreview.jsx`; `useAgentHooks`.

### ResumeButton
- `ResumeButton.jsx`: resumes an in-flight intent through the idle agent tab.

### IntentList
- `IntentList.jsx`: intents with search, filters, sort, cost and step dots.

### IntentDetail
- `IntentDetail.jsx`: the header, progress, request text, `TABS` and the readout column.

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
- `CostPanel.jsx`: the project cost view.

### CostTab
- `CostTab.jsx`: intent cost tables.

### VelocityView
- `VelocityView.jsx` (US-0303, listed only).

### TokenView
- `TokenView.jsx`: live token meters.

### TokenDetail
- `TokenDetail.jsx` (US-0208, US-0507, US-0215): `@visx` charts plus Agent progress.

### AgentProgress
- `AgentProgress.jsx` (US-0507, US-0214): hook rows or audit rows (`fromHooks`, line 183).

### Token Charts
- `tokenFlow.js`, `tokenChart.js`. Pure.

### RefreshPanel
- `RefreshPanel.jsx`: Refresh from GitHub, with `CollisionPanel`.

### CollisionPanel
- `CollisionPanel.jsx` (US-1201).

### MachinesView
- `MachinesView.jsx` (US-1201).

### Workflow Busy Rule
- `workflowBusy.js`: `isWorkflowRunning`.

### AidlcUpdate
- `AidlcUpdate.jsx`: the AI-DLC update rows in Settings › Tools.

### SetupAidlc
- `SetupAidlc.jsx`: AI-DLC setup and add harness.

### ProjectSettingsView
- `ProjectSettingsView.jsx` (282 lines at `2b5d6a4`): `PROJECT_SECTIONS`, `DocsSection`, `AgentSection`, `useSectionSave`; `confirmHarnessSwitch` uses `window.confirm`.

### SettingsView
- `SettingsView.jsx`: the app settings tabs; exports `Section` and `RadioBlocks`.

### ConfigView
- `ConfigView.jsx`: AI-DLC configuration per installed harness, working agents, models. It reloads on `config:changed`.

### ConfigEdit
- `ConfigEdit.jsx` (skimmed): `ChangePanel`, `ActiveEditor`, `DefaultsEditor`, `GuardSwitches`, `GuardLock`, `ModelPicker`.

### CostRulesSection
- `CostRulesSection.jsx` (US-0212, listed only).

### PlansView
- `PlansView.jsx`: plans, stages, save, edit, delete.

### FeaturesView
- `FeaturesView.jsx` (758 lines): epics, stories, filters, `StatusBadge`, `StoryDetail` and the Releases tab.
  - `ReleasePicker` (`:110-165`, in a story's detail) sends `{storyId, version, epicHash, overviewHash}` from the current `features`. It has only its own `busy` flag: once it answers, a second pick can go out with the same, now old, hashes.
  - `ReleasesView` (`:294-421`):
    - New release, Add story, Remove and Delete;
    - `write()` locks while `sentWith === features`, so the lock lifts on any new `features` object;
    - a refusal or failure unlocks at once and shows one sentence (`planningErrorText`, `features.release.conflict`);
    - success stays locked until the next reload (ponytail `:300`).
  - `PlanningSync` (`:215-275`):
    - it calls `getPlanningStatus(projectId, first)` on mount (with `opened` true, so lost actions are re-applied) and on each `features` change;
    - it renders nothing unless `pending > 0`, `reapplied`, `prOffer` or `error`;
    - Push now calls `pushPlanning`.

### Story Filter
- `storyFilter.js`: the shared story filter. Pure.

### Editor
- `editor/`: Monaco editor tabs, the conflict dialog, the file tree. Saves go through `bridge.writeFile` with `{mtimeMs, hash}`.

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
- `Tooltip.jsx`, `tooltipPlacement.js` (US-0414). `tests/renderer/noNativeTitle.test.jsx` forbids native `title=`.

### Format Helpers
- `format.js`: status labels, `formatTime`, `formatDuration`, `stageTitle`, cost and token formats.

### Theme Tokens
- `tokens.js`: CSS tokens for xterm.

### useProject
- `useProject.js`: per project tab, the intent list, the selected detail, cost, models and `lastIntentChangeAt`.

### useFeatures
- `useFeatures.js` (skimmed at `39a3dbf`): settings, features, story links and the lifecycle rule. On `features:changed` it calls `loadDocs()`, which runs `getProjectSettings` and `loadFeatures` and sets both. There is no request id: two reloads in flight can land out of order.

### Feature Docs Prompt
- `featureDocsPrompt.js`: the request typed into the agent tab to create feature docs.

### Theme Stylesheet
- `theme.css`: the LCARS tokens on `:root` and the component styles.

## Build, CI and tests

### Release Workflow
- `.github/workflows/release.yml` (115 lines): on a `v*.*.*` tag and on pull requests into `main`.
  - `verify` (ubuntu-latest): checkout with full history, gitleaks, a tag-equals-`package.json` check (tags only), `npm ci`, `npx vitest run tests/ --coverage` (with `THADEUS_REQUIRE_DASH=1`), `npx eslint .`, `npx prettier --check .`.
  - `build-mac` (`npm run build:mac`, the dmg) and `build-linux` (ubuntu-22.04, `build:linux`, `check-glibc.mjs`) need `verify`.
  - `release` (tags only) writes `SHA256SUMS.txt` and runs `gh release create --generate-notes`.
  - There is no end-to-end job, no built app in `verify`, and no display server (xvfb).

### Build Scripts
- `scripts/`, `electron.vite.config.mjs`, `vitest.config.mjs`, `eslint.config.mjs`.

### Packaging Config
- `electron-builder.yml`, `package.json`, `build/`.
- `package.json` (re-read at `39a3dbf`): `thadeus` 0.2.9, `main: out/main/index.js`. Scripts: `dev`, `build`, `build:mac`, `build:linux`, `test`, `coverage`, `lint`, `format`, `format:check`, `screenshots`, and `postinstall` (`install-app-deps`, `fix-pty-perms`). No Playwright or other end-to-end dependency.

### Dialog Hook Script
- `.thadeus/hooks/dialog.sh` (78 lines): the POSIX sh hook bundled into main with `?raw`. It never parses the payload.

### Test Suite
- `tests/main`, `tests/renderer`, plus `tests/helpers`; see `code-quality-assessment.md`.

### Test Fixtures
- `tests/fixtures/`: agent events, hooks, audit, features, ledger, picker screens, a sample project.

### Project Docs
- `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `LICENSE`, `docs/`.
