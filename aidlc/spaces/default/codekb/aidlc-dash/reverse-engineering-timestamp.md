# Reverse Engineering Timestamp

## Run Record

- Date: 2026-11-16
- Commit: f46cb71d05d86bea71fdc9d9e82e2087f67f8cc3
- Intent: cross-machine-cost (`261116-cross-machine-cost`, EPIC-02 US-0209)

This was a focused scan merged onto a stale store (the full scan of intent `agent-progress` at `721e051`). The developer agent did both the scan and the synthesis, because the architect was switched off for this run. Prose outside the cost and audit area is kept from the earlier store; the earlier full coverage could not be re-verified and is recorded below as shallow.

What was read, and how closely:
- Read line by line: the ledger, audit and intents parsers, `projectService.js`, `tokenReadings.js`, `watcher.js`, `CostPanel.jsx`, `CostTab.jsx`, `TokenView.jsx`, the data parts of `TokenDetail.jsx`, `tokens.js`.
- Read at the level of header, imports and exports: the other parsers, the cost and watch handlers in `ipc.js`, `useProject.js`, `IntentDetail.jsx`, `IntentList.jsx`, `tokenFlow.js`, the preload bridge, the related tests and fixtures.
- Read for the format only: the cost fields of the committed audit shards.
- Not opened: `node_modules/`, `out/`, `dist/`, `coverage/`, `tests/.tmp/`, `.thadeus/tokens/`, and AI-DLC's install and workspace.

Code was read only: no tests, builds or app runs.

## Scope of Analysis

```yaml
scope_version: 1
kind: partial
intent: cross-machine-cost
fingerprint: d99a7746929215a418f4943dfa0e20840d33418b
analyzed:
  paths:
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
  components:
    - Project Service
    - Watcher
    - Audit Parser
    - Intents Merger
    - Ledger Parser
    - Token Readings
    - CostPanel
    - CostTab
    - TokenView
    - TokenDetail
    - Theme Tokens
shallow:
  paths:
    - ./
    - docs/
    - build/
    - src/main/parsers/state.js
    - src/main/parsers/pipeline.js
    - src/main/parsers/runtimeGraph.js
    - src/main/parsers/units.js
    - src/main/parsers/agentProgress.js
    - src/main/parsers/features.js
    - src/main/parsers/releases.js
    - src/main/ipc.js
    - src/preload/index.js
    - src/renderer/useProject.js
    - src/renderer/IntentDetail.jsx
    - src/renderer/IntentList.jsx
    - src/renderer/tokenFlow.js
    - tests/
```
