# Reverse Engineering Timestamp

## Run Record

- Date: 2026-11-16
- Commit: bbfb4c06bcd4a887a4f6c1b32137e43a42cec9b9
- Intent: project-velocity (`261116-project-velocity`, EPIC-03 US-0303)

This was a focused scan of the parsers, the Project Service, the feature-doc and git modules, the IPC Router and `src/renderer`. It was merged onto the store from the shared-tooltip scan at `f46cb71`. That store was stale, so only this run's coverage is recorded as verified. `src/renderer` was re-read and stays deep, and the earlier shallow paths stay shallow. The prose outside the analyzed area is kept from the earlier scans and is marked where it is not re-verified. The US-0414 tooltip notes were replaced by short "delivered" notes, because `Tooltip.jsx` now exists. The developer agent did both the scan and the synthesis, because the architect was switched off for this run.

What was read, and how closely:
- Read line by line: every file in `src/main/parsers/` except `ledger.js` (exports and `summarizeLedger`), plus `projectService.js`, `features.js`, `git.js` and `releases.js`.
- Read by sections: `ipc.js` (imports, the handler table, the project, cost and features handlers, `registerIpc`); in the renderer, `useProject.js`, `useFeatures.js`, `Lcars.jsx`, `Tooltip.jsx`, the view switch in `ProjectView.jsx` and `App.jsx`, the tabs of `IntentDetail.jsx`, and the heads of `Timeline.jsx`, `CostPanel.jsx` and `FeaturesView.jsx`.
- Read at the level of header, imports and searches: the rest of `src/renderer`.
- Listed or searched only, outside the analyzed paths: `src/main/` (other modules), `src/preload/index.js`, `tests/`, `src/shared/locales/`, `package.json`, `.gitignore`, `docs/features/epic-03-audit-timeline.md`, and the event types and fields in this project's audit shards (as input data).
- Not opened: `node_modules/`, `out/`, `dist/`, `coverage/`, `tests/.tmp/`, `.thadeus/`, and AI-DLC's install and workspace.

Code was read only: no tests, builds or app runs.

## Scope of Analysis

```yaml
scope_version: 1
kind: partial
intent: project-velocity
fingerprint: 95ecd985b1204242567081c519704e0f5ea17b22
analyzed:
  paths:
    - src/main/parsers/
    - src/main/features.js
    - src/main/git.js
    - src/main/releases.js
    - src/main/projectService.js
    - src/main/ipc.js
    - src/renderer/
  components:
    - IPC Router
    - Project Service
    - Audit Parser
    - State Parser
    - Runtime Graph Parser
    - Pipeline Merger
    - Intents Merger
    - Units Status
    - Ledger Parser
    - Audit Cost Parser
    - Agent Progress Parser
    - Features Parser
    - Releases Parser
    - Git Reader
    - Features Loader
    - Releases Service
    - App Shell
    - ProjectView
    - IntentDetail
    - Timeline
    - CostPanel
    - FeaturesView
    - LCARS Primitives
    - Tooltip
    - Format Helpers
    - useProject
    - useFeatures
shallow:
  paths:
    - ./
    - src/main/
    - src/preload/
    - docs/
    - build/
    - tests/main/
    - tests/renderer/
    - src/shared/locales/
```
