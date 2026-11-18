# Reverse Engineering Timestamp

## Run Record

- Date: 2026-11-18
- Commit: 39a3dbfbcb70f67a228e4dc0fa93cd8821b991ed
- Intent: planning-changes-kept (`261118-planning-changes-kept`, EPIC-06 US-0608)

This was a focused scan of release planning: the planning record and its commit and push cycle, the release and editor writes, the Features view's release list, their IPC and bridge, the CI workflow and `package.json`. It was merged onto the store from the US-0030 scan at `0ebb196`. That store was stale, so only this run's coverage is recorded as verified, and the earlier analyzed paths are demoted to shallow. The prose outside the analyzed area is kept from the earlier scans and is marked where it is not re-verified. The developer agent did both the scan and the synthesis, because collaborators were off for this run.

What was read, and how closely:
- Read line by line: `planningRecord.js`, `planningSync.js`, `fileWrite.js`, `releases.js`, `parsers/releases.js`, `release.yml`, `package.json`.
- Read by sections: `FeaturesView.jsx` (the release picker, the release list and the planning block), `ipc.js` (the docs watch, the planning scheduler and context, the features, planning and file handlers, `registerIpc`) and `preload/index.js` (the feature, planning and editor members).
- Skimmed or searched, outside the analyzed paths: `features.js` (hashes, watch paths), `useFeatures.js` (reloads), `git.js` (worktree and push helpers), `watcher.js` (`watchFiles`), `projectAccess.js` (`readText`), and the related tests by name and grep.
- Not opened: `node_modules/`, `out/`, `dist/`, `coverage/`, `tests/.tmp/`, `.claude/`, and the rest of AI-DLC's install and workspace.

Code was read only: no tests, builds or app runs.

## Scope of Analysis

```yaml
scope_version: 1
kind: partial
intent: planning-changes-kept
fingerprint: a0ee1e78d1e9778602c49a7031c5e3f2e82c18c9
analyzed:
  paths:
    - src/main/planningRecord.js
    - src/main/planningSync.js
    - src/main/fileWrite.js
    - src/main/releases.js
    - src/main/parsers/releases.js
    - src/renderer/FeaturesView.jsx
    - src/main/ipc.js
    - src/preload/index.js
    - .github/workflows/release.yml
    - package.json
  components:
    - Planning Record
    - Planning Sync
    - File Editor Service
    - Releases Service
    - Releases Parser
    - FeaturesView
    - IPC Router
    - Preload Bridge
    - Release Workflow
    - Packaging Config
shallow:
  paths:
    - ./
    - src/main/
    - src/main/parsers/
    - src/main/agentEvents.js
    - src/main/agentProgress.js
    - src/main/parsers/agentProgress.js
    - src/shared/agentActivity.js
    - src/renderer/AgentProgress.jsx
    - src/renderer/TokenDetail.jsx
    - .thadeus/hooks/dialog.sh
    - src/main/exec.js
    - src/main/modelChoice.js
    - src/main/models.js
    - src/main/aidlcWrite.js
    - src/main/settings.js
    - src/main/watcher.js
    - src/main/projectService.js
    - src/main/projectAccess.js
    - src/main/parsers/intents.js
    - src/main/agentAdapters.js
    - src/main/agentHooks.js
    - src/main/features.js
    - src/main/git.js
    - src/main/aidlcConfig.js
    - src/main/costRules.js
    - src/preload/
    - src/renderer/
    - src/renderer/useFeatures.js
    - src/renderer/ProjectSettingsView.jsx
    - src/renderer/useProject.js
    - src/renderer/ConfigEdit.jsx
    - src/shared/
    - src/shared/locales/
    - docs/
    - build/
    - tests/main/
    - tests/renderer/
```
