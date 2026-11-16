# Developer Code Scan: aidlc-dash (T.H.A.D.E.U.S.)

Intent `261116-agent-progress` (US-0507), full rescan at `721e051`, 2026-11-16. Read only: no tests, builds or programs were run.

## Developer Code Scan Results

### Scan Coverage
- **Analyzed deeply**:
  - `src/main/projectService.js`, `src/main/watcher.js`, `src/main/projectAccess.js`
  - `src/main/parsers/audit.js`, `state.js`, `runtimeGraph.js`, `pipeline.js`, `intents.js`, `units.js`
  - `src/main/ipc.js` (imports, project table, `watchSpace`, `watchConfig`, `watchGitHead`, the `project:*` and `agents:working` handlers)
  - `src/renderer/BoltDag.jsx`, `src/renderer/IntentDetail.jsx`, `src/renderer/useProject.js`, the `.dag-*` rules in `src/renderer/theme.css`
  - every other tracked file under `src/`, `scripts/`, `.github/`, `.thadeus/hooks/`: header comment, imports and exports read; the root configs (`package.json`, `vitest.config.mjs`, `eslint.config.mjs`, `.prettierrc.json`, `electron-builder.yml`, `.nvmrc`, `.gitignore`) read whole
  - `tests/`: file list, the `it`/`test` count, `tests/fixtures/` layout
  - for orientation only (not documented): the audit, `runtime-graph.json`, plan files and review records of intent `261114-agent-dialogs`, the only intent with a Unit DAG
- **Skimmed only**: `docs/` (file list, the US-0507 story), `build/` sources (icons), the bodies of the agent-dialog modules (`src/main/agent*.js`, `AgentDialog.jsx`), `theme.css` outside the DAG rules
- **Left out**: `node_modules/`, `out/`, `dist/`, `coverage/`, `tests/.tmp/` (ignored build and test output); `.claude/`, `.aidlc/` (including `.aidlc/worktrees/`), `.opencode/` (so the app's own `.opencode/plugins/thadeus-dialog.js` too, see Handoff), `aidlc/`; `.thadeus/tokens/` (runtime data the app writes); the two git worktrees under `.claude/worktrees/`

### Packages Found
- `thadeus` 0.2.7, an Electron desktop app in JavaScript and JSX (ES modules). It has three bundles: main (`src/main`, 44 files), preload (`src/preload`, 1) and renderer (`src/renderer`, 56), plus pure modules in `src/shared` that both sides use.

### Build System
- **Type**: npm + electron-vite 6 (bundling) + electron-builder 26 (mac universal `.dmg`, Linux x64 `.deb`)
- **Config Files**: `package.json`, `electron.vite.config.mjs`, `electron-builder.yml`, `vitest.config.mjs`, `eslint.config.mjs`, `.prettierrc.json`, `.nvmrc` (Node 22)
- **Build Dependencies**: `build:*` runs electron-vite build, then `scripts/third-party-licenses.mjs`, then electron-builder. `postinstall` runs `fix-pty-perms.cjs`.

### APIs Discovered
- Electron IPC: 76 `ipcMain.handle` channels in `src/main/ipc.js` (plus the agent-dialog handlers spread in from `agentIpc.js` and `agentHooks.js`), exposed through `window.bridge` in `src/preload/index.js`. Push channels include `project:changed`, `config:changed`, `features:changed`, `git:headChanged`, `agent-events:changed`, `pty:data` and `pty:exit`.
- A file channel for agent hooks: event and answer files in `<userData>/agent-channel/<session>/` (`agentChannel.js`), with `.thadeus/hooks/dialog.sh` on the hook side.
- External CLIs, called only through `runFixed` (execFile, no shell): `aidlc`, `git`, `gh`.

### Frameworks & Libraries
- electron ^45.3.1, react/react-dom ^19.3.1, @xterm/xterm ^6, node-pty ^1.1, chokidar ^4.0.3, i18next ^27 + i18next-icu, react-markdown ^10 + remark-gfm, @visx/* ^4, @tanstack/react-virtual 3.14.24, @monaco-editor/react + monaco-editor 0.57 (dev, bundled)

### Test Coverage
- **Test Directories**: `tests/main` (72 files), `tests/renderer` (39), `tests/helpers` (3), `tests/fixtures` (95)
- **Test Frameworks**: vitest ^5.1 with three projects (`main` node, `scripts` timed node, `renderer` jsdom with Swedish i18n), @testing-library/react. There are 1071 `it`/`test` call sites by static count.
- **Coverage Config**: present. v8, an 80% line floor globally plus per-file floors for the agent-dialog files. CI runs it.

### Code Quality Indicators
- **Linting**: ESLint 9 flat config (`eslint.config.mjs`) and Prettier (`.prettierrc.json`, width 160). Both are CI steps.
- **CI/CD**: `.github/workflows/release.yml` runs gitleaks, the tag/version check, tests with coverage, ESLint and Prettier, then the mac and Linux builds, and a GitHub Release on tags.
- **Documentation**: README, CONTRIBUTING, SECURITY, CODE_OF_CONDUCT, `docs/FEATURES.md` with 13 epic files. Module headers name their story and requirement ids.

### Technical Debt Signals
- `src/main/parsers/units.js` sets `running` only on `UNIT_STARTED`. The one intent with Units (`261114-agent-dialogs`) logs no `UNIT_STARTED` at all, only `UNIT_COMPLETED`, `BOLT_STARTED` and `WORKTREE_CREATED`. So a building Unit shows `pending` on the DAG today.
- `parseRuntimeGraph` (`runtimeGraph.js` l.30-48) keeps only counts from `instances` and drops each instance's `bolt`, `worktree`, `started_at` and `outcome`.
- `BoltDag.jsx` has no test of its own. Only `unitStatuses` is tested, in `tests/main/parsers.test.js`.
- `.thadeus/tokens/<intent>.json` (written by `tokenReadings.js`) is neither ignored nor committed, so it shows as untracked in `git status`.
- The caches in `projectService.js` (`listCache`, `detailCache`, `costCache`, `questionCache`) are unbounded. This is marked `ponytail:`.
- There are 0 TODO/FIXME markers, 4 `eslint-disable` lines and 37 `ponytail:` comments.

## Handoff Summary
- **Intent-relevant finding**: the data US-0507 needs is mostly on disk already, but the app reads none of it:
  - (a) `runtime-graph.json` code-generation `instances[]` carry `bolt`, an absolute `worktree` path (`<root>/.aidlc/worktrees/bolt-<id8>_<unit>`), `started_at` and `outcome`, but `runtimeGraph.js` l.30-48 discards them;
  - (b) the audit has `WORKTREE_CREATED`/`BOLT_STARTED`/`WORKTREE_MERGED` (`Bolt slug`, `Worktree path`) and `REVIEW_REQUESTED`/`REVIEW_COMPLETED` (`Stage`, `Reviewer`, `Unit` when unit-scoped, `Verdict`, `Review Record`). `units.js` reads only `UNIT_STARTED`/`UNIT_COMPLETED`;
  - (c) findings by severity exist only in the review record JSON (`findings[].severity`) under the intent's `.aidlc-engine/reviews/`, and `watcher.js` `isIgnored` l.9-13 ignores that folder;
  - (d) nothing watches or reads `.aidlc/worktrees/`. `watchIntents` covers only the space's intents folder, and `.git` is a file in a worktree (the `ponytail:` note in `ipc.js` `watchGitHead`);
  - (e) `SUBAGENT_DISPATCHED` carries only `Agent Type`, so agent work with no Unit can only be named, as `workingAgents()` in `projectService.js` l.151-167 already does.

  `BoltDag` receives only `dag` and `statuses` (`IntentDetail.jsx` l.251). Its node is a fixed 200x64 SVG block with two text lines.
- **Risks / follow-up**:
  - Reads must stay inside the root through `resolveInRoot`. A worktree path from the graph is absolute and must be made relative and checked.
  - The last commit subject needs `git log -1` in the worktree, through `git.js`/`runFixed` with fixed arguments.
  - A missing worktree or plan must be named, not shown as 0 (AC6).
  - It is still unconfirmed where the plan sits inside a worktree: the relative record path under the worktree root is the likely place.
  - `team.md` still says coverage, ESLint and Prettier are "not set up yet", but all three run in CI now.
  - The app-owned `.opencode/plugins/thadeus-dialog.js` was left out because the brief excludes `.opencode/`.
