# Component Inventory: aidlc-dash

Every `###` heading below is a component name, used verbatim in `reverse-engineering-timestamp.md`. Renderer entries list what they render, their `data-testid`s and the tests tied to their markup. Keep every `data-testid`.

This scan (intent `261113-harness-choice`, US-0801, commit `4b5b8c6`) read in depth: the agent terminal (PTY Manager, Exec Runner, TerminalPanel, TerminalContext, Terminal Control, ResumeButton), setup (Setup Helper, SetupAidlc), project detection and settings (Project Service, Project Access, Settings Store, IPC Router, Preload Bridge, ProjectSettingsDialog, ProjectView, App Shell), cost (Ledger Parser, CostPanel, CostTab, Model Config Reader), i18n (Shared i18n, Main i18n, Locale Files, Renderer Bootstrap, App Name Module), Feature Docs Prompt, and the matching tests (Test Suite). Sections marked *earlier scan* come from the scans at commits `22bd721` and `8623af4` and were not re-verified. US-0701 has since moved their visible texts into the locale files.

## Renderer: shell and brand

### App Shell
- **File**: `src/renderer/App.jsx` (519 lines; line map in `code-structure.md`). Depends on Splash, AuctumMark, Lcars Primitives, AppSettingsDialog (`saveLanguage`), DocsDialog, QuestionPopup, ProjectView, `withSlots`, `APP_NAME`, `window.bridge`.
- **Renders**: `div.app` > `Splash`; `header.app-header` (`div.app-brand` with `AuctumMark` 46 px and `span.app-brand-text` = `APP_NAME`; `Bar`, branch, `h1.app-title` "<project> • <view>" or `app.noProject`, fullscreen button); `nav.app-arm[aria-label=app.armLabel]`; error banner; `main.app-main` (empty state with `withSlots('app.emptyText')`, one `div.project-pane` per project); `AppSettingsDialog` (now with `language`, `onLanguage`), `DocsDialog`, `QuestionPopup`.
- **State**: `tabs`, `activeId`, `error`, `restored`, `settingsFor`, `appSettingsOpen`, `animations`, `language` (new), `ui[projectId] = {view, cost, github}`, `meta[projectId] = {showFeatures, intentCount}`, `branch`, `fullscreen`, `terminalCommand`, `docs`, `alertSettings`, `questions`, `popupOpen`, `popupFocus`.
- **Terminal hooks into projects**: `runTerminal(action)` (293-295) and `answerInClaude(q)` (220-224) set `terminalCommand {seq, action, projectId}`; the menu's `terminal` command accepts only `claude | shell | restart` (316). This whitelist and the action name `claude` are agent-tab specific.
- **Named actions shared by the arm and the menu** (`menuCommands`, 309-318): `openProject`, `closeProject`, `projectSettings`, `appSettings`, `view`, `panel`, `terminal`, `docs`.
- **Language**: `useTranslation()` at the top re-renders the whole app on a language switch with state kept (EPIC-07 NFR3). `changeLanguage(next)` sets state and calls `saveLanguage`.
- **data-testid**: `project-tabs`, `project-tabs-tab`, `project-settings-open`, `project-tabs-close`, `project-tabs-add`, `project-view-switch-intents`, `project-view-switch-features`, `arm-cost`, `arm-github`, `app-settings-open`, `fullscreen-toggle`, `app-error-dismiss`, `empty-state-open`.
- **Accessibility**: `aria-current`, `aria-expanded` on Cost/Github, `aria-pressed` on fullscreen, `aria-label` and `title` on the settings and close tools, `role="alert"` on the banner.
- **Tests**: `tests/renderer/AppShell.test.jsx` (176 lines; grep only in this scan).

### AppSettingsDialog
- *Earlier scan, plus exports seen in this scan.* `src/renderer/AppSettingsDialog.jsx` (156 lines). Exports `saveLanguage(language)` (line 17) and the default dialog. Props from `App.jsx:504-514`: `open`, `onClose`, `value`, `onChange`, `questionAlerts`, `notificationSound`, `onSave`, `language`, `onLanguage` (default `saveLanguage`). Groups: Animations, Questions from Claude (`settings.alertsLegend`), Notification sound, Language / Språk.
- **data-testid** (known): `app-settings-dialog`, `app-settings-animations-full|reduced|off`, `app-settings-close`.

### DocsDialog
- *Earlier scan.* `src/renderer/DocsDialog.jsx`. Native modal `dialog` showing `docs/README.md` through `FileContent`. **data-testid**: `docs-dialog`.

### QuestionPopup
- *Earlier scan.* `src/renderer/QuestionPopup.jsx` (117 lines). Props `open`, `questions`, `focus`, `onAnswer(q)`, `onClose`. Its answer button "Answer in Claude" opens the `claude` tab through `answerInClaude`. **Tests**: `QuestionPopup.test.jsx`.

### Lcars Primitives
- *Earlier scan.* `src/renderer/Lcars.jsx`: `Bar`, `Frame`, `Hairlines`, `progressStates`, `dotsLabel`, `Dots`, `Readout`.

### Splash
- *Earlier scan, before US-0406 was built; the name now comes from `src/shared/appName.js`.* `src/renderer/Splash.jsx` (65 lines). Timing `SPLASH_MIN_MS` 900, `SPLASH_MAX_MS` 4000, `SPLASH_FADE_MS` 300. `AuctumMark` 300 px with `role="img"` "Auctum", decorative visible name, `sr-only` full name. **Tests**: `Splash.test.jsx`.

### AuctumMark
- *Earlier scan.* `src/renderer/AuctumMark.jsx` (19 lines). Inline SVG; `role="img" aria-label="Auctum"`, or `aria-hidden` when `decorative`. Used in the splash, header, empty state, arm foot (decorative) and terminal elbow (decorative).

### Theme Stylesheet
- *Earlier scan.* `src/renderer/theme.css` (889 lines). Tokens on `:root` (`--bg #05060a`, slate, steel, coral, amber `#ff9e40`, `--alert`, frame anatomy `--arm 150px`), LCARS primitives, app shell, terminal arm (`.terminal-arm`, `.term-tab`, `.term-tab--<kind>`, `.terminal-elbow`), dialogs, keyframes, `data-motion` rules. `.term-tab--claude` (line 687: height 64 px, rounded top-left) styles the agent tab by its kind name; `.term-tab--shell` has no rule. **Tests**: `theme.test.js`.

## Renderer: project view

### ProjectView
- **File**: `src/renderer/ProjectView.jsx` (253 lines). Internal parts `AidlcProject`, `SetupDone`, `ProjectContent`; default `ProjectView` wraps `ProjectContent` in `TerminalProvider`, so each project has its own terminals.
- **Props**: `project`, `visible`, `settingsOpen`, `onCloseSettings`, `view`, `onView`, `costOpen`, `onToggleCost`, `githubOpen`, `onToggleGithub`, `onMeta`, `terminalCommand`.
- **`terminalCommand` effect** (132-136): only for a matching `projectId`; `restart` restarts the active tab, otherwise `terminal.show(action)` (so `action` is a tab id).
- **After setup** (141-147): on the switch from not-AI-DLC to AI-DLC it sets `justSetUp` and calls `terminal.restart('claude')`, so the agent loads the new hooks.
- **SetupDone** (99-122): types `/aidlc --doctor` and `/aidlc ` into `claude`; optional "Create feature docs".
- **Feature docs**: `setupDocs` types `featureDocsPrompt(...)` into `claude` without Enter (158-160); `offerSetup` passes it to FeaturesView and ProjectSettingsDialog.
- **Mounts** `TerminalPanel projectId visible` and `ProjectSettingsDialog` with `settings` from `useFeatures` (only `{featureDocs, featuresPath}`).
- **data-testid**: `project-space-select`, `setup-aidlc-done`, `setup-aidlc-doctor`, `setup-aidlc-first-work`, `setup-aidlc-feature-docs-run`.

### IntentList
- *Earlier scan.* `src/renderer/IntentList.jsx`: `sortIntents`, `filterIntents`; rows with ResumeButton. **data-testid**: `intent-list`, `intent-list-search`, `intent-list-status-filter`, `intent-list-scope-filter`, `intent-list-sort`, `intent-list-row`, `intent-list-row-cost`, `intent-list-row-status`.

### IntentDetail
- *Earlier scan.* `src/renderer/IntentDetail.jsx`: header, five tabs (Pipeline, Timeline, Units, Cost, Files). **data-testid**: `intent-detail`, `intent-detail-tab-pipeline|timeline|units|cost|files`, `intent-detail-story-link`.

### Pipeline
- *Earlier scan.* `src/renderer/Pipeline.jsx`; statuses `not-started`, `in-progress`, `awaiting-approval`, `revising`, `done`, `skipped`, `unknown`. **data-testid**: `pipeline`, `pipeline-stage`, `pipeline-stage-cost`, `pipeline-stage-file`.

### Timeline
- *Earlier scan.* `src/renderer/Timeline.jsx`, virtualised with `@tanstack/react-virtual`. **data-testid**: `timeline`, `timeline-noise-toggle`, `timeline-type-filter`, `timeline-stage-filter`, `timeline-jump-newest`, `timeline-jump-stage`, `timeline-new-counter`, `timeline-scroll`, `timeline-event`.

### BoltDag
- *Earlier scan.* `src/renderer/BoltDag.jsx`; SVG `role="img"`. **data-testid**: `bolt-dag`, `bolt-dag-empty`.

### ArtifactReader
- *Earlier scan.* `src/renderer/ArtifactReader.jsx`; exports `FileContent`. **data-testid**: `artifact-reader`, `artifact-reader-file`, `artifact-reader-reveal`, `artifact-reader-open-editor`.

### CostPanel
- **File**: `src/renderer/CostPanel.jsx` (138 lines). Internal `CostChart` (plain SVG bars), `ScopeTable`, `readoutRows`. Props `cost`, `models`, `open`, `onToggle`.
- **Renders**: `section.cost-panel` > toggle (`cost.title`, `cost.estimateMeta`); `cost.reason` when unavailable; total with `*` when incomplete, token count, `Readout` of the top two models and agents; when open: stale banner, `CostLabel`, legacy row, chart, per-model and per-agent `CostTable`, `ScopeTable`, `ModelTable`.
- **Harness note**: nothing in the panel says which harness the ledger covers; model names are shown via `shortModel` (strips `claude-`).
- **data-testid**: `cost-panel`, `cost-panel-toggle`, `cost-panel-legacy`, `cost-panel-models`, `cost-panel-agents`, `cost-panel-scopes`.
- **Tests**: `tests/renderer/CostPanel.test.jsx` (Swedish texts "Uppskattad kostnad (API-pris)", "Ofullständig", "pris saknas", a `claude-haiku-5-5` row, mismatch title, legacy row, missing ledger).

### CostTab
- **File**: `src/renderer/CostTab.jsx` (155 lines). Exports `CostLabel({complete})`, `CostTable({title, rows, totalUsd, testId})`, `ModelTable({models, agentModels, onlyParticipants})`, default `CostTab({cost, intentCost, pipeline, models})`.
- **ModelTable**: "configured from" with `cost.source.<source>` (or the raw source), configured vs actual per agent via `compareModels`, mismatch tag, `main` shown as the session.
- **data-testid**: `cost-tab`, `cost-tab-unavailable`, `cost-tab-stages`, `cost-tab-agents`, `cost-tab-models`, `model-table`, `model-mismatch`.

### RefreshPanel
- *Earlier scan, one line re-read.* `src/renderer/RefreshPanel.jsx` (267 lines). Exports `WAIT_MESSAGE`, `PULL`, `FROM_MAIN`. "Working" = `terminal.state('claude') === 'busy'` or a recent intent write (line 97). Types git chains into `shell`. **data-testid**: `refresh-panel`, `refresh-panel-toggle`, `refresh-panel-status`, `refresh-panel-update`, `refresh-panel-badge`, `refresh-panel-details`, `refresh-panel-detail-list`, `refresh-panel-remote-file`, `refresh-panel-pull`, `refresh-panel-from-main`, `refresh-panel-choice`, `refresh-panel-choice-rebase`, `refresh-panel-choice-merge`, `refresh-panel-conflicts`, `refresh-panel-conflict-list`.

### ResumeButton
- **File**: `src/renderer/ResumeButton.jsx` (55 lines). Exports `resumeLabel(position)` and the default button. (The older `BUSY_MESSAGE` export is gone; the text is `intents.resume.busy`.)
- **Behaviour**: renders nothing outside a `TerminalProvider` or for an intent that is not `in-flight`. Busy `claude` → status text `intents.resume.busy` ("Claude is working — wait or interrupt it first"). Active intent → `type('claude', '/aidlc', {submit: false})`. Other intent → refuses names failing `SAFE_DIR_NAME`, else `sequence('claude', [{text: '/aidlc intent <dirName>', submit: true}, {text: '/aidlc', submit: false}])`.
- **Renders**: `span.resume` > `button.resume-button` (`span.resume-main`, `span.resume-step`), `span.resume-message[role=status]`.
- **data-testid**: `intent-resume`.
- **Tests**: `tests/renderer/ResumeButton.test.jsx` asserts the `'claude'` tab id and both command strings.

### SetupAidlc
- **File**: `src/renderer/SetupAidlc.jsx` (217 lines). Exports `INSTALL_URL` (`https://github.com/awslabs/aidlc-workflows`). Internal `Prerequisites`, `Preview`, `Advanced`, `MissingTool`, `FeatureDocsChoice`.
- **Flow**: nothing is read until "Set up AI-DLC" (`setup:info`). It shows AI-DLC version, git state, "Other harnesses" (`info.harnesses`, today never `.claude/`), the dry-run preview with counts, notes and conflicts, plugins and model presets, and the feature-docs choice. "Set up" asks `setup:command` and types the chain into the `shell` tab without Enter. Blocked when `aidlc` is missing or there are conflicts. After start, a non-zero exit of the shell tab shows `setup.failed`.
- **data-testid**: `project-not-aidlc`, `setup-aidlc-start`, `setup-aidlc-checks`, `setup-aidlc-preview`, `setup-aidlc-note`, `setup-aidlc-advanced`, `setup-aidlc-plugin`, `setup-aidlc-preset-<preset>`, `setup-aidlc-missing`, `setup-aidlc-feature-docs`, `setup-aidlc-run`, `setup-aidlc-failed`.
- **Tests**: `tests/renderer/SetupAidlc.test.jsx` asserts the chain `git init -b main && aidlc --project-dir . config --harness claude --yes`.

### FeaturesView
- *Earlier scan.* `src/renderer/FeaturesView.jsx`; exports `StatusBadge`. **data-testid**: `features-view`, `features-view-empty`, `features-view-setup`, `features-view-fallback`, `features-view-epic`, `features-view-story`, `features-view-story-detail`, `features-view-intent-link`, `features-view-reveal`, `features-view-open-editor`, `features-view-filter-status`, `features-view-filter-priority`.

### ProjectSettingsDialog
- **File**: `src/renderer/ProjectSettingsDialog.jsx` (133 lines). Opened from the arm's settings tool.
- **Props**: `open`, `onClose`, `projectId`, `name`, `settings {featureDocs, featuresPath}`, `onSetup`.
- **Behaviour**: the form resets from the saved settings each time it opens. Save sends exactly `{featureDocs, featuresPath}` through `setProjectSettings` and closes; a main-process error stays in the dialog. The path is validated in the renderer with `isValidFeaturesPath` (imported from `main/parsers/features.js`).
- **Renders**: native `dialog.panel.settings-dialog` > `form` with `h2` (`settings.project.titleFor`), `fieldset.settings-group` with three radios (`settings.project.mode.<id>` and help), path field with `aria-invalid`/`aria-describedby`, error rows, optional setup offer, Save/Cancel.
- **data-testid**: `project-settings-dialog`, `project-settings-mode-auto|show|hide`, `project-settings-path`, `project-settings-setup`, `project-settings-save`, `project-settings-cancel`.
- **Tests**: `tests/renderer/ProjectSettingsDialog.test.jsx` (skimmed).
- **US-0801**: the "Agent-terminal" choice would be a second fieldset here. Its save path must also reach main.

### TerminalPanel
- **File**: `src/renderer/TerminalPanel.jsx` (280 lines, internal `TermSession`). Props `projectId`, `visible`. Depends on xterm, FitAddon, TerminalContext, Terminal Control, `tokens.xtermTheme`, AuctumMark, `Bar`.
- **Constants**: `QUICK_COMMANDS` (`/aidlc --status`, `/aidlc --doctor`, `/aidlc continue`), `KINDS = ['claude', 'shell']`.
- **TermSession**: spawns on mount (`ptySpawn({projectId, kind, cols, rows})`), registers `{activity, spawn, write, focus, restart}` with the context, writes typed keys to the pty, resizes with a ResizeObserver (skipped while hidden), shows `terminal.startFailed` / `terminal.exited` with a Restart button. Its mount effect depends on `spawn`, which depends on `kind`: a new `kind` kills the old pty and spawns a new one.
- **Renders**: `section.terminal-panel(.is-collapsed)[aria-label=terminal.label]` > resize separator (drag or arrows, 180 px to 60 % of the window), `div.terminal-arm` (tab blocks with the state label `terminal.state.<state>` and name `terminal.<kind>`, `is-breathing` when `claude` is busy; elbow toggle), `div.terminal-main` (`Bar`, one `TermSession` per kind, footer with quick commands typed into `claude`, "Waiting for your Enter" rows, error).
- **data-testid**: `terminal-panel-resize`, `terminal-panel-toggle`, `terminal-panel-tab-claude|shell`, `terminal-panel-state-claude|shell`, `terminal-panel-pending-claude|shell`, `terminal-panel-error`, `terminal-panel-quick-command`, `terminal-panel-restart-<kind>`.
- **Tests**: `tests/renderer/TerminalPanel.test.jsx` (stubbed xterm; asserts state "Arbetar", the pending label and the `pty-claude` write).

### TerminalContext
- **File**: `src/renderer/TerminalContext.jsx` (106 lines). `TerminalProvider` and `useTerminal()` (API in `api-documentation.md`). Mounted per project in ProjectView; renders no markup.
- **State**: `sessions` (ref, tab → session), `view {open, active}` (starts `{open: true, active: 'claude'}`), `states {claude, shell}` (start `exited`), `error`, `pending {claude, shell}`.
- **`ready(tab)`**: spawns an exited tab and waits for its first `idle` (20 s); errors `terminal.cannotStart`, `terminal.noResponse`. **`run(tab, fn)`**: shows the tab, readies it, runs `fn`, focuses; errors go to `error`.
- **Names in errors**: `terminal.tabName.<tab>` ("Claude", "The shell").

### Terminal Control
- **File**: `src/renderer/terminalControl.js` (75 lines). Pure: no React, no bridge.
- **`createActivity({quietMs = 1500})`**: `exited` at start; output → `busy`; 1.5 s without output → `idle`; `onExit(code)` → `exited` with `exitCode`.
- **`waitFor`**, **`runSequence`** (each step waits for `idle`; after a submitted step it waits up to 3 s for output first), **`withEnter`**, **`READY_TIMEOUT_MS`** 20000.
- **Tests**: `tests/renderer/terminalControl.test.jsx` (skimmed).
- **US-0801**: the signal relies on output pauses. Whether opencode, Codex or Kiro go quiet when they wait for input has not been verified.

### Feature Docs Prompt
- **File**: `src/renderer/featureDocsPrompt.js` (11 lines). `featureDocsPrompt({exists, path})`: one line (no newline, so nothing is sent), built from `features.prompt.*` in the current language. Plain language, not tied to `/aidlc` syntax.

### useProject Hook
- *Earlier scan.* `src/renderer/useProject.js` (134 lines). `useProject(projectId, initialSpace)` returns `space, setSpace, intents, listWarning, selected, setSelected, detail, newKeys, error, cost, models, lastIntentChangeAt`.

### useFeatures Hook
- *Earlier scan.* `src/renderer/useFeatures.js` (53 lines): feature docs, project settings and story links; subscribes to `features:changed`.

### Renderer Utilities
- *Exports re-checked in this scan.* `src/renderer/format.js`: status labels via `labelOf`, `formatTime`, `formatDuration`, `isInFlight`, `shortModel` (strips `claude-`), `stageTitle`, `stagePosition`, `formatUsd`, `formatCost`, `formatTokens`, `tokenBreakdown`, `withSlots(key, elements)`. `src/renderer/tokens.js`: `token(name)`, `xtermTheme()`.

### Renderer Bootstrap
- **File**: `src/renderer/main.jsx` (26 lines). Loads Antonio 400/600/700 and `theme.css`; sets `<html lang>` on every `languageChanged`; asks `getLanguage()`, switches i18n, then renders `App` inside `I18nextProvider`. On failure the bundled Swedish default stays.

### Renderer Entry
- *Earlier scan.* `src/renderer/index.html`: CSP, `<title>`, `div#root`, `main.jsx`.

## Shared modules

### Shared i18n
- **File**: `src/shared/i18n.js` (55 lines). One i18next instance per process with `i18next-icu`, bundled `sv` and `en`, start language `sv`, `fallbackLng: 'en'`, `initAsync: false`, `returnEmptyString: false`, missing key → the key, dev-only missing-key warning once per key and language.
- **Exports**: `LANGUAGES`, `LANGUAGE_SETTINGS`, `resolveLanguage`, `t`, `locale`, default instance.
- **Used by**: almost every main and renderer module (`t('errors.…')` in main, `useTranslation()` or `t` in the renderer).
- **Tests**: `tests/main/i18n.test.js`, `tests/main/i18nKeys.test.js`.

### Locale Files
- **Files**: `src/shared/locales/en.json`, `src/shared/locales/sv.json` (523 lines each, identical key sets). Groups `common, app, intents, pipeline, cost, github, terminal, features, setup, settings, menu, errors`.
- **Harness-specific texts** (en): `terminal.claude`, `terminal.tabName.claude`, `terminal.quickTitle` ("…into the claude tab…"), `menu.claude`, `intents.resume.busy`, `setup.done` ("Claude restarts…"), `setup.featureDocsNew`, `settings.alertsLegend` ("Questions from Claude"), `app.notification.title` ("{project}: Claude is waiting for your answer"), the question popup's waiting and answer texts, `github.conflictState`. `setup.harnessesLabel` is "Other harnesses:".
- **Rules** (enforced by `i18nKeys.test.js`): the same keys in both files, no empty text, every literal `t('…')` key present, the same ICU placeholders per key, valid ICU.

### App Name Module
- **File**: `src/shared/appName.js` (7 lines). `APP_NAME 'T.H.A.D.E.U.S.'`, `APP_FULL_NAME`, `APP_TAGLINE`, `APP_SHORT 'THADEUS'`, `APP_VENDOR 'Auctum'`. Imported by `App.jsx`, `Splash.jsx`, `src/main/menu.js` and `src/main/index.js`.

## Preload and main

### Preload Bridge
- **File**: `src/preload/index.js` (63 lines). `call(channel)` = `ipcRenderer.invoke`; `subscribe(channel)` forwards only the payload and returns `removeListener`. No generic `invoke`/`send`.
- **API**: `platform`, 35 invoke functions and 10 subscriptions (list in `api-documentation.md`); new: `getLanguage`.

### IPC Router
- **File**: `src/main/ipc.js` (317 lines).
- **Project table**: `Map` projectId → `{root, space, watcher, setupWatcher, featuresWatcher, featuresKey, sender, models, setupInfo, questions}`. `projectId` is a fresh UUID on every open.
- **Watching**: `project:open` validates the root, detects AI-DLC, then `watchSpace` (AI-DLC) or `watchForSetup` (plain folder), and starts `syncFeaturesWatch` without waiting.
- **Caches per opened project**: `p.models` (promise from `getConfiguredModels`), `p.setupInfo` (from `setup:info`, used by `setup:command` to validate plugins).
- **pty**: `pty:spawn` passes `{projectId, root: project(projectId).root, kind, cols, rows, sender}`. The renderer cannot name a root or a command.
- **Settings**: `settings:set` → `setSettings`, then `setLanguageFromSettings`; rebuilds the menu when the language changed. `projectSettings:set` forwards only `featureDocs` and `featuresPath`.
- **Questions**: `startedWith` set, `activeProjectId`, `allQuestions`, `publishQuestions`, `refreshQuestions` → `notifyQuestions`.
- **`registerIpc()`** logs and rethrows; **`shutdown()`** kills every pty and closes every watcher.

### Question Service
- **Files**: `src/main/questions.js` (59 lines, skimmed), `src/main/notify.js` (48 lines, read).
- **`notify.js`**: `notificationTitle(q)` = `app.notification.title` ("{project}: Claude is waiting for your answer"); `gateText(q)`; `notificationBody(q)` cut to about 120 characters; `notifyQuestions(fresh, {settings, win, activeProjectId})` shows each id once, skips the shown project in a focused window, honours `questionAlerts` and `notificationSound`, and on click restores the window and sends `questions:focus`.
- **`questions.js`**: derives waiting questions and gates from audit events (`CLOSERS`, `parseOptions`); harness-neutral (reads only `aidlc/` audit shards).
- **Tests**: `tests/main/questions.test.js`, `tests/main/notify.test.js` (not read).

### Project Service
- **File**: `src/main/projectService.js` (246 lines).
- **Detection**: `detectProject(root)` requires `aidlc/spaces/` with at least one space (`errors.notAidlc`, `errors.noSpace`); active space from `aidlc/active-space`, else `default`, else the first. It does not look at harness folders.
- **Intent list**: `loadIntentList(root, space, onlyDirs)` merges `intents.json`, folders on disk and `active-intent`; per intent reads `aidlc-state.md` and `project-description.json`; keeps the last good index when `intents.json` is half written.
- **Detail**: `loadIntentDetail` → `buildDetail` (state, runtime graph, `.aidlc-engine/active-directive.json`, audit events, unit statuses, artifact files); returns the last detail with `stale: true` on error.
- **Questions**: `loadPendingQuestions(project, onlyDirs)` reads audit logs only for in-progress intents, cached per intent.
- **Cost**: `loadCost(root)` reads `LEDGER_PATH = aidlc/.aidlc-sessions/usage-ledger.json`; never throws; keeps the last good ledger with `stale` and `warning`.
- **Caches**: `listCache`, `detailCache`, `costCache`, `questionCache` (`ponytail:` unbounded).

### Project Access
- **File**: `src/main/projectAccess.js` (75 lines). `openRoot(dir)` (realpath, must be a folder), `resolveInRoot(root, rel)` (rejects absolute, `..`, symlink escapes, checked twice), `readText`, `readJsonSafe` (never throws: `{ok, value}` or `{ok: false, missing, error}`), `listDir` (missing → `[]`), `exists`. No write calls.
- **Tests**: `tests/main/projectAccess.test.js` (skimmed).

### PTY Manager
- **File**: `src/main/pty.js` (85 lines).
- **Kinds**: `shellArgs(kind)`: `claude` → `$SHELL -l -i -c claude`; `shell` → `$SHELL -l`; anything else throws before node-pty loads. `-i` makes zsh/bash read the interactive rc files, where nvm usually lives.
- **Spawn**: `cwd` = project root; env = `process.env` plus `TERM=xterm-256color`, `COLORTERM=truecolor`; size clamped (default 100x30); sessions keyed by UUID with `projectId` and `sender`; `pty:data` and `pty:exit` pushed after an `isDestroyed()` check.
- **Loading**: node-pty is imported on first spawn and cached only after success, so a failed load is retried.
- **Tests**: `tests/main/pty.test.js` (lazy load, retry, no load at import; error message asserted in Swedish), `tests/main/ptyPerms.test.js`.
- **US-0801**: the one place a harness CLI is started. A new harness is a new entry in `shellArgs` (or a table it reads), chosen by a validated id.

### Exec Runner
- **File**: `src/main/exec.js` (47 lines). `defaultExec` (promisified `execFile`), `loginPath(exec)` (PATH from `$SHELL -l -i -c` with a marker, once per process, falls back to the app's PATH), `runFixed(file, args, {cwd, timeout = 10000, exec})` (rejects non-string arguments before running).
- **US-0801**: fits `<cli> --version` as the AC asks (fixed arguments, no shell). Callers decide parallelism and caching.

### Settings Store
- **File**: `src/main/settings.js` (102 lines). The only file the app writes: `<userData>/settings.json`, userData pinned to `aidlc-dash` by Main Entry.
- **`sanitize()`**: keeps `openProjects`, `recentProjects`, `activeProject`, `animations`, `fullscreen`, `questionAlerts`, `notificationSound`, `language`, `projectSettings` (at most 200, each through `sanitizeProject`). Every other key is dropped.
- **Per project**: `PROJECT_DEFAULTS {featureDocs: 'auto', featuresPath: 'docs/FEATURES.md'}`; `getProjectSettings(root)`; `setProjectSettings(root, partial)` validates each given field and merges.
- **Writes**: one at a time through a promise queue; a failed write is reported to its caller and does not block the next.
- **Tests**: `tests/main/settings.test.js` (project settings, animations, fullscreen, question alerts, language, concurrent writes).

### Setup Helper
- **File**: `src/main/setup.js` (85 lines).
- **`getSetupInfo(root, {exec})`**: lists root folders matching `OTHER_HARNESSES = ['.kiro', '.codex', '.cursor', '.aidlc']` (not `.claude/`, not `.github/`); git state; `aidlc --version` (missing → `{installed: false}` and stop); dry run `aidlc --project-dir <root> config --harness claude --dry-run` parsed by `parsePreview`; plugins from `aidlc config project --show --json`. Never throws for a missing tool.
- **`buildSetupCommand(options, availablePlugins)`**: `git init -b main` (optional) `&& aidlc --project-dir . config --harness claude --yes` `&& aidlc config project --plugins … --yes` `&& aidlc config models --preset … --project --yes`; rejects plugins not in the list read and unknown presets.
- **Tests**: `tests/main/setup.test.js` (asserts the `--harness claude` strings and `harnesses: ['.kiro/']`).

### Model Config Reader
- **File**: `src/main/models.js` (66 lines). `getConfiguredModels(root)`: `aidlc config models --show --json --harness claude` → `{source: 'aidlc-config', agents}`; fallback the `model:`/`effort:` frontmatter of `.claude/agents/aidlc-*-agent.md` → `agent-files`; else `none`. Never throws; the error text is Swedish and not translated (line 56).
- **Tests**: `tests/main/configuredModels.test.js` (asserts the `--harness claude` arguments).
- **US-0801**: Claude-only by construction; the model table needs a harness label or a per-harness source.

### Ledger Parser
- **File**: `src/main/parsers/ledger.js` (177 lines). Pure; the renderer imports `compareModels`.
- **`summarizeLedger(ledger, intents)`**: workflows keyed `intent:<uuid>` map to intents; `record:…/legacy` nodes are summed as legacy; per intent `total`, `byStage`, `byAgent`, `byModel`, `stageModels`, `agentModels`, `complete`; `byScope` with averages; `timeline`; project totals. Only the ledger's own `usd` is used. Reads no harness field.
- **`agentModels`**: attributes models to agents only where certain (one model, one agent, or `main` plus one).
- **`compareModels(configured, actualByAgent, {onlyParticipants})`**: `inherit` means the session's (`main`) model; `sameModel` normalises by stripping `claude-` and a `[…]` suffix.
- **Tests**: `tests/main/ledger.test.js` (not read in full), `tests/renderer/CostPanel.test.jsx`.

### Main i18n
- **File**: `src/main/i18n.js` (13 lines). `currentLanguage()`; `setLanguageFromSettings(settings)` resolves `language` with `app.getLocale()` and switches synchronously (bundled resources). Called at startup (`index.js:70`) and after every `settings:set`.

### Main Entry
- *Earlier scan, two lines re-read.* `src/main/index.js` (97 lines). userData pinned to `aidlc-dash` (line 10); `windowOptions(settings, platform)`; `whenReady`: language, Dock icon in dev, `registerIpc()`, `applyMenu(null)`, `createWindow().then(applyMenu)`.

### App Menu
- *Earlier scan, terminal submenu re-read.* `src/main/menu.js` (173 lines). Labels through `t('menu.…')`. Terminal submenu: `menu.claude` → `terminal {action: 'claude'}`, `menu.shell`, `menu.restartTab`, enabled when a project is open. `parseMenuState` accepts only `{hasProject, isAidlc, showFeatures}`. **Tests**: `tests/main/menu.test.js`.

### File Watcher
- *Earlier scan.* `src/main/watcher.js` (165 lines): `watchIntents` (debounce 300 ms, max 800 ms; `dirNames`, `indexChanged`, `costChanged`), `watchFiles`, `watchForAidlc`.

### Audit Parser
- *Earlier scan.* `src/main/parsers/audit.js`: `parseAudit`, `mergeAudits`, `categoryOf`, `NOISY_EVENTS`.

### Git Reader
- *Earlier scan.* `src/main/git.js`: status, fetch, remote changes, remote file, conflicts; argument checks; through `runFixed`.

### Feature Docs Loader
- *Earlier scan.* `src/main/features.js` and `src/main/parsers/features.js` (`isValidFeaturesPath`, `DEFAULT_FEATURES_PATH`).

### Parsers
- *Earlier scan.* `src/main/parsers/`: `state.js`, `pipeline.js`, `audit.js`, `intents.js`, `runtimeGraph.js`, `units.js`, `ledger.js` (see Ledger Parser), `features.js`.

## Build, CI and test

### Packaging Config
- *Earlier scan, before US-0406 was built; `package.json` skimmed in this scan.* `package.json` now has `name: thadeus`, `productName: THADEUS`, `version: 0.2.0`, dependencies including `i18next`, `i18next-icu`, `intl-messageformat`, `react-i18next`. `electron-builder.yml` (not re-read): macOS universal `dmg` (unsigned), Linux `deb` x64, `asarUnpack node_modules/node-pty/**`.

### Build Scripts
- *Earlier scan.* `scripts/make-icon.cjs`, `scripts/fix-pty-perms.cjs`, `scripts/check-glibc.mjs`.

### Release Pipeline
- *Earlier scan.* `.github/workflows/release.yml`: `verify` (tag equals `package.json` version, `npm ci`, `npx vitest run tests/`), `build-mac`, `build-linux` (glibc check), `release` (`gh release create`).

### Project README
- *Earlier scan.* `README.md`: start, Gatekeeper, usage, security, settings paths.

### Test Suite
- **Folders**: `tests/main/` (22 files, node), `tests/renderer/` (16 files, jsdom, with `setup-i18n.js` switching to Swedish), `tests/fixtures/`.
- **In-scope tests read in this scan**: `pty.test.js`, `setup.test.js`, `settings.test.js`, `i18n.test.js`, `i18nKeys.test.js`, `TerminalPanel.test.jsx`, `ResumeButton.test.jsx`, `SetupAidlc.test.jsx`, `CostPanel.test.jsx`, `setup-i18n.js`.
- **Patterns**: injected `exec` fakes for main modules (`fakeExec` answering `"<file> <args>"`); `vi.doMock('node-pty')` with `vi.resetModules()`; stubbed xterm and `window.bridge` for the terminal; `vi.mock('TerminalContext.jsx')` with a fake `useTerminal()` for ResumeButton and SetupAidlc; real temp folders under `tests/.tmp/`; renderer assertions on Swedish texts.
- **Claude-specific assertions** that US-0801 will touch: see `code-quality-assessment.md`.
