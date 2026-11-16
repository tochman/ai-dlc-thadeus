# Developer Code Scan: US-0209 cost across machines

Focused scan at `f46cb71`, 2026-11-16. Code was read only; no tests, builds or app runs.

## Developer Code Scan Results

### Scan Coverage
- **Analyzed deeply**:
  - src/main/parsers/ledger.js
  - src/main/parsers/audit.js
  - src/main/parsers/intents.js
  - src/main/projectService.js
  - src/main/tokenReadings.js
  - src/main/watcher.js
  - src/renderer/CostPanel.jsx
  - src/renderer/CostTab.jsx
  - src/renderer/TokenView.jsx
  - src/renderer/TokenDetail.jsx
  - src/renderer/tokens.js
- **Skimmed only**: the other parsers in src/main/parsers/ (state, pipeline, runtimeGraph, units, agentProgress, features, releases: headers and exports); the cost and watch handlers in src/main/ipc.js; src/renderer/useProject.js, IntentDetail.jsx, IntentList.jsx, tokenFlow.js; src/preload/index.js; the related tests and fixtures under tests/; the audit-shard format, read as data from the committed shards.
- **Left out**: node_modules/, out/, dist/, coverage/, tests/.tmp/, .thadeus/tokens/, and AI-DLC's install and workspace (.claude/, .aidlc/, .opencode/, aidlc/) apart from the shard format.

### Packages Found
- thadeus — Electron desktop app — JavaScript/JSX — the AI-DLC bridge console (unchanged; see the store's technology-stack.md)

### Build System
- **Type**: npm with electron-vite and electron-builder (unchanged)
- **Config Files**: package.json, electron.vite.config.mjs, vitest.config.mjs
- **Build Dependencies**: renderer bundles `src/main/parsers/ledger.js` directly (`CostTab.jsx`, `TokenDetail.jsx`)

### APIs Discovered
- IPC invoke — src/main/ipc.js — `project:cost` (ledger summary per project and intent, also records token readings), `tokens:readings`
- IPC push — `project:changed {dirNames, indexChanged, costChanged}`; `costChanged` is set only by the ledger file
- Files read — `aidlc/.aidlc-sessions/usage-ledger.json` (`LEDGER_PATH`), `<intent>/audit/*.md` (every shard, `loadAuditEvents`)

### Frameworks & Libraries
- react 19, @visx/* 4.0.0 (TokenDetail charts), chokidar 4.0.3 (watchers), i18next with ICU (unchanged)

### Test Coverage
- **Test Directories**: tests/main (ledger.test.js, parsers.test.js, ipc.test.js, watcher.test.js, tokenReadings.test.js), tests/renderer (CostPanel, TokenView, TokenDetail, TokenDetailChartSize, IntentList, tokenFlow)
- **Test Frameworks**: vitest 5.1.0 (node and jsdom projects)
- **Coverage Config**: present (v8, 80% line floor in vitest.config.mjs)

### Code Quality Indicators
- **Linting**: ESLint flat config and Prettier, in CI
- **CI/CD**: .github/workflows/release.yml
- **Documentation**: module headers name stories (US-0205, US-0207, US-0208); exported functions carry JSDoc

### Technical Debt Signals
- Cost is ledger-only: with no ledger `project:cost` returns `{available: false}` and every cost view hides (ipc.js `project:cost`, `projectService.js` `loadCost`).
- The audit parser keeps every field as a string; no numeric reading of the rollup fields exists.
- `tests/fixtures/audit/machine-a.md` and `machine-b.md` carry no cost fields; there is no `CostTab` test file.
- `parsers/agentProgress.js` imports `projectService.js`, so a parser now pulls in Node file access.

## Handoff Summary
- **Intent-relevant finding**: every shard is already read and merged (`loadAuditEvents`, projectService.js l.140–144; each event's `source` is the shard file name `<host>-<clone-id>.md`), but cost comes only from the local ledger keyed `intent:<uuid>` (`summarizeLedger`, ledger.js l.118–159). The rollups sit on `STAGE_COMPLETED` and `WORKFLOW_COMPLETED` blocks (fields `Tokens In/Out`, `Cache Read/Write`, `Cost USD`, `By Model`, `By Agent`, `Tokens By Model/Agent`). The local clone is named by `aidlc/.aidlc-clone-id` (gitignored), which equals the local shard's suffix, so the local shard can be swapped for the ledger and the other shards added.
- **Risks / follow-up**:
  - A stage completed more than once has cumulative rollups: summing every completion over-counts (261113-cost-and-models: 33.22 summed, 23.39 last-per-stage, 23.86 on `WORKFLOW_COMPLETED`). `WORKFLOW_COMPLETED` is the intent total and must never be added to the stages. This is an observation from the data; confirm it in requirements.
  - `Tokens By Model/Agent` are rounded (`71k`, `13.4M`), and `Cache Write` is not split 5 m / 1 h as in the ledger.
  - A pulled shard sets no `costChanged`, and `useProject` reloads cost only on `costChanged || indexChanged` (useProject.js l.122).
  - Token readings (`readingOf`) are cumulative; feeding remote totals into them would add a jump.
  - Real two-machine data exists: `261113-living-lcars/audit/thomas-comlabs-993a8cefd12a.md` beside the local shard.
