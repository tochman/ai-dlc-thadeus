# Developer Code Scan: US-0303 Project velocity

Focused scan at `bbfb4c0` (branch `fix/US-0025`). Code was read only; no tests, builds or app runs.

## Developer Code Scan Results

### Scan Coverage
- **Analyzed deeply**:
  - `src/main/parsers/` (all 11 files, line by line: `audit`, `state`, `runtimeGraph`, `pipeline`, `intents`, `units`, `features`, `releases`, `auditCost`, `agentProgress`; `ledger` by its exports and `summarizeLedger`)
  - `src/main/projectService.js`
  - `src/main/features.js`
  - `src/main/git.js`
  - `src/main/releases.js`
  - `src/main/ipc.js` (imports, the handler table, the project, cost and features handlers, `registerIpc`)
  - `src/renderer/` (`useProject.js`, `useFeatures.js`, `Lcars.jsx`, `Tooltip.jsx`, `tooltipPlacement.js`, `format.js` exports, the view switch in `ProjectView.jsx` and the arm in `App.jsx`, the tabs of `IntentDetail.jsx`, `Timeline.jsx`, `CostPanel.jsx`, `FeaturesView.jsx`; the rest by header and imports)
- **Skimmed only**:
  - `src/preload/index.js` (the bridge names the velocity data would sit beside)
  - `src/main/` outside the list above (file names and headers: `teamActivity.js`, `usageSnapshot.js`, `platforms/`, `agentProgress.js`)
  - `src/shared/locales/` (line counts), `tests/main/`, `tests/renderer/` (file names)
  - `docs/features/epic-03-audit-timeline.md` (US-0303 text)
  - the event types and fields in this project's audit shards (counted with grep, as input data, not as AI-DLC code)
- **Left out**: `node_modules/`, `out/`, `dist/`, `coverage/`, `tests/.tmp/`, `.thadeus/`, and AI-DLC's own install and workspace (`.claude/`, `.opencode/`, `aidlc/` beyond the audit field count above)

### Packages Found
- `thadeus` — Electron desktop app — JavaScript (ESM) and JSX — the AI-DLC bridge console; one package, no workspaces

### Build System
- **Type**: npm with electron-vite (unchanged since the earlier store)
- **Config Files**: `package.json`, `electron.vite.config.mjs`, `vitest.config.mjs`, `electron-builder.yml`
- **Build Dependencies**: main, preload and renderer bundled separately; the renderer bundles `src/main/parsers/{features,releases,ledger}.js` and `src/shared/*` directly

### APIs Discovered
- Electron IPC — `src/main/ipc.js` — 87 `<area>:<verb>` invoke handlers in one table (76 at `721e051`), plus the agent and hook handlers
- Preload bridge — `src/preload/index.js` — named members only (`getIntent`, `getCost`, `loadFeatures`, `getStoryLinks` are the ones velocity data sits beside)

### Frameworks & Libraries
- Unchanged from the store's `technology-stack.md`; this run added none and found no charting change (CostPanel draws plain SVG; TokenDetail uses `@visx/*`)

### Test Coverage
- **Test Directories**: `tests/main` (82 files), `tests/renderer` (48 files)
- **Test Frameworks**: vitest 5.1.0, jsdom, Testing Library
- **Coverage Config**: present (`vitest.config.mjs`, 80% line floor)
- Parser tests sit in `tests/main/parsers.test.js`, `features.test.js`, `releases.test.js`, `git.test.js`, `auditCost.test.js`, `agentProgress.test.js`, `projectService.test.js`

### Code Quality Indicators
- **Linting**: ESLint 9 flat config and Prettier, both in CI
- **CI/CD**: `.github/workflows/release.yml`
- **Documentation**: every module has a story-tagged header; exported functions carry JSDoc
- `tests/renderer/noNativeTitle.test.jsx` (US-0414) fails on any native `title=` in the renderer; a new view must use `Tooltip.jsx`

### Technical Debt Signals
- 12 `ponytail:` comments in the scanned main files and 9 in the renderer; 0 TODO/FIXME
- `src/main/parsers/agentProgress.js` imports `workingAgents` from `../projectService.js`, so this "pure" parser pulls in the Node-side service chain (no cycle, but parsers are no longer Node-free)
- `ipc.js` has grown to 1038 lines

## Handoff Summary
- **Intent-relevant finding**: every input US-0303 needs is already parsed, but nothing turns it into durations.
  - `mergeAudits` (`parsers/audit.js:53`) gives every event with `timeMs`, `event` and `fields.Stage`. The shards hold `WORKFLOW_STARTED`/`WORKFLOW_COMPLETED`, `PHASE_STARTED`/`PHASE_COMPLETED`, `STAGE_STARTED`/`STAGE_COMPLETED`, `STAGE_AWAITING_APPROVAL` → `GATE_APPROVED`/`GATE_REJECTED`, `STAGE_REVISING`, `REVIEW_REQUESTED`/`REVIEW_COMPLETED` and `WORKFLOW_PARKED`/`WORKFLOW_UNPARKED`.
  - `parseRuntimeGraph` (`parsers/runtimeGraph.js:50`) has `durationMs` per stage, but `runtime-graph.json` is git-ignored, so another clone has none.
  - Story markers come from `parseEpic`/`statusOf` (`parsers/features.js:26,155`) and `releaseOf`/`buildReleases` (`parsers/releases.js:28,111`). Tag dates come from `listReleaseTags` (`git.js:150`).
  - `git.js` has no file-history call, so the 🚧 and ✅ dates need a new fixed `git log` call over the epic files.
  - The all-intents loop to copy is `loadCrossMachineCost` (`projectService.js:305`), which uses `auditEventsOrEmpty`.
- **Risks / follow-up**:
  - Stories are squash-merged, so 🚧 and ✅ can land in the same commit; story times from git are then zero or missing and must be shown as unknown.
  - Audit shards are per machine; merged events cover every machine that committed its shard.
  - A missing audit folder gives `[]` today (`loadAuditEvents`), and `auditEventsOrEmpty` hides read errors. Velocity must keep "missing" apart from "empty" (AC 4).
  - A new view needs an arm block in `App.jsx`, a branch in `ProjectView.jsx`, LCARS primitives, the `Tooltip`, and keys in both locale files.
