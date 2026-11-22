# Developer Scan: EPIC-14 Spec Kit framework (focused)

Repo: workspace root (unrecorded project-root repo). Commit `90031e2`. Scope classic, depth Standard, brownfield. Focused scan of where the app assumes AI-DLC. Code was read only: no tests, builds or app runs.

## Developer Code Scan Results

### Scan Coverage
- **Analyzed deeply**:
  - src/main/projectService.js
  - src/main/projectAccess.js
  - src/main/watcher.js
  - src/main/settings.js
  - src/main/ipc.js (by sections: imports and project state `:1-545`, the project, cost, tokens, config and agents handlers `:748-885`, setup, project settings and pty `:1139-1335`; the rest by a channel map)
  - src/preload/index.js
  - src/main/setup.js
  - src/main/harness.js
  - src/main/tokenReadings.js
  - src/main/tokenHistory.js
  - src/main/questions.js
  - src/main/agentProgress.js
  - src/main/parsers/audit.js, intents.js, state.js, pipeline.js, units.js
  - src/renderer/App.jsx (by sections: state and restore `:1-160`, the answer wiring `:300-345`, view routing and the arm `:380-480`, `:570-680`, the project panes `:700-772`)
  - src/renderer/ProjectView.jsx
  - src/renderer/ResumeButton.jsx
  - src/renderer/useProject.js
  - src/renderer/terminalControl.js
  - src/shared/harnesses.js
- **Skimmed only**: in the snapshot: `agentHooks.js` and `agentAdapters.js` (heads, exports, grep for intent and framework terms), `parsers/runtimeGraph.js`, `parsers/agentProgress.js`, `parsers/ledger.js`, `auditCost.js`, `velocity.js`, `features.js`, `releases.js` (heads and exports), `TerminalPanel.jsx` (quick commands `:1-60`, `:190-230`), `IntentList.jsx`, `IntentDetail.jsx`, `Pipeline.jsx`, `ArtifactReader.jsx`, `Lcars.jsx` (exports), `ProjectSettingsView.jsx` (sections), `SetupAidlc.jsx`, `ConfigView.jsx`, `TokenView.jsx`, `AgentProgress.jsx`. Outside the snapshot, by grep only: `TerminalContext.jsx` (`type`, `sequence`), `src/main/menu.js` (`isAidlc`), `src/main/fileWrite.js` (`isEngineOwned`), the test file names.
- **Left out**: node_modules/, out/, dist/, coverage/, tests/.tmp/ (git-ignored), and AI-DLC's own install and workspace (.claude/, aidlc/, .aidlc/, .opencode/command/).

### Packages Found
- thadeus: Electron app, JavaScript (ES modules) and JSX: main, preload, renderer, shared. No change since the last scan.

### Build System
- **Type**: npm with electron-vite and electron-builder (unchanged; see `technology-stack.md`).
- **Config Files**: `package.json`, `electron.vite.config.mjs`, `vitest.config.mjs` (not re-read).
- **Build Dependencies**: none new for this area.

### APIs Discovered
- IPC invoke: about 110 channels in one `handlers` table (`ipc.js:748-1353`) plus the agent, hooks and handoff tables. The project area: `project:open|close|spaces|intents|intent|cost|velocity`, `tokens:readings`, `agents:working|progress`, `setup:info|run`, `projectSettings:get|set`, `pty:spawn`.
- Push: `project:changed`, `project:detected`, `project:watchError`, `questions:changed`, `config:changed`, `features:changed`, `features:planningChanged` (new since the last scan), `agent:activity`.
- `window.bridge`: 188 lines, named members only.

### Frameworks & Libraries
- chokidar 4 (watchers), React 19, xterm 6, node-pty (unchanged). No YAML parser is installed, and `.specify/extensions.yml` (US-1404) would need one or a small reader.

### Test Coverage
- **Test Directories**: `tests/main`, `tests/renderer`.
- **Test Frameworks**: vitest 5.1.0.
- **Coverage Config**: present (v8, 80% lines).
- Tests near this area (by name): `projectService`, `projectAccess`, `watcher`, `settings`, `setup`, `harness`, `ipc`, `menu`, `questions`, `tokenReadings`, `tokenHistory` (main); `AppShell`, `AppAlerts`, `ProjectView`, `SetupAidlc`, `ProjectSettingsView`, `ResumeButton`, `TerminalPanel`, `terminalControl`, `IntentList`, `useProject` (renderer).

### Code Quality Indicators
- **Linting**: ESLint and Prettier in CI (unchanged).
- **CI/CD**: `.github/workflows/release.yml` (not re-read).
- **Documentation**: header comments name stories; JSDoc on exports.

### Technical Debt Signals
- `isAidlc` is the only framework switch. It is a boolean from `detectProject` and is tested in `ipc.js`, `menu.js`, `App.jsx` and `ProjectView.jsx`.
- The `offered` views table is written twice, in `App.jsx:401` and `ProjectView.jsx:360`, and both must agree.
- `projectService.js` mixes the generic and the AI-DLC readers (intents, audit, cost, velocity, questions) in one module of 433 lines.
- `ipc.js` is now 1379 lines.
- `ponytail:` comments in the area: `projectService.js:18` (unbounded caches), `:158` (one dispatch per agent type), `tokenReadings.js:66` (no lock), `tokenHistory.js:100`, `:117`, `settings.js:140` (200 projects), `ipc.js:254` (`.git/HEAD` only at the root), `ResumeButton.jsx:12`.

## Handoff Summary
- **Intent-relevant finding**: The whole app forks on one boolean, `detection.isAidlc`, from `detectProject` (`projectService.js:49-58`). Its only test is whether `aidlc/spaces/` exists.
  - In main it chooses `watchSpace` (the intents watcher, waiting questions, model profiles) or `watchForSetup` (`ipc.js:766-767`). `watchForSetup` waits only for `aidlc/spaces/<space>` (`watcher.js:219`), so a `.specify/` project would wait for ever.
  - In the renderer it chooses `AidlcProject` or `SetupAidlc` (`ProjectView.jsx:413-427`). It also decides the `offered` views (`App.jsx:401`, `ProjectView.jsx:360`), the arm blocks (`App.jsx:588-646`), the Configuration sections (`AIDLC_SECTIONS`), the menu state (`menu.js:35`) and the arm's foot label.
  - A `framework` value has to replace this boolean in all of those places. The project's data goes to the renderer through `project:open` and is held per tab as `tabs[].detection`.
- **Commands to the terminal**: Resume and the quick commands are built only from `harness.commands.aidlc` through `harnessCommand` (`harnesses.js:109`). Resume types `"/aidlc"` without Enter, or `"/aidlc intent <dir>"` with Enter and then `"/aidlc"` (`ResumeButton.jsx:64-70`). The quick commands are three fixed suffixes (`TerminalPanel.jsx:16`). Both go through `terminal.type` and `terminal.sequence` (`TerminalContext.jsx:152`, `:197`; `runSequence`, `terminalControl.js:75`). `/speckit-*` commands need a second command family per harness in the same table.
- **Keyed on an intent**:
  - Token readings are `.thadeus/tokens/<dirName>.json` (name `^[\w.-]+$`). They are written only from `project:cost`, from AI-DLC's `usage-ledger.json` per in-flight intent (`ipc.js:821-826`). A Spec Kit project has no ledger, so nothing writes readings today.
  - Waiting questions, the audit fallback in the agent dialog, the handoff inputs and `agents:working|progress` all need `p.space` and an intent's audit folder.
  - The hook events, the agent dialog and the activity rows are keyed on the session and project, not on an intent, so they work for any framework.
- **Project settings**: kept only in `userData/settings.json` under `projectSettings[root]`, with a fixed list of keys (`settings.js:90-109`) repeated in `ipc.js:1298-1310`. US-1408 needs a file in the repository. The app already writes inside the project under `.thadeus/` (tokens, usage snapshots, the hook script) with `resolveInRoot` and `writeAtomic`.
- **Risks / follow-up**:
  - (a) A Spec Kit project on opencode has no opencode marker (`.aidlc/`, the aidlc command, or an `opencode.json` that mentions aidlc), so `harnessProblem` can call opencode "not installed".
  - (b) `fileWrite.js` treats every harness marker folder, `.claude` included, as engine-owned. So Spec Kit's commands under `.claude/` cannot be edited, while `.specify/` and `specs/` can.
  - (c) `agents:progress` calls `assertName(p.space)`, which throws when the space is null.
  - (d) There is no YAML reader for `extensions.yml`.
  - (e) The `aidlc` CLI check and the AI-DLC update rows stay AI-DLC-only. Spec Kit needs its own `specify` tool entry (`tools.js` `TOOL_IDS`, not read).
