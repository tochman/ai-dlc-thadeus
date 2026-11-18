# Reverse Engineering Timestamp

## Run Record

- Date: 2026-11-18
- Commit: 0ebb196215457c487f5f95c77406108b5be4d90a
- Intent: honest-agent-progress (`261118-honest-agent-progress`, EPIC-00 US-0030)

This was a focused scan of Agent progress: the hook script, the activity model, the event store's activity feed, the audit progress rows and plan reads, and their views and IPC. It was merged onto the store from the US-0210 scan at `2b5d6a4`. That store was stale, so only this run's coverage is recorded as verified, and the earlier analyzed paths are demoted to shallow. The prose outside the analyzed area is kept from the earlier scans and is marked where it is not re-verified. The developer agent did both the scan and the synthesis, because collaborators were off for this run.

What was read, and how closely:
- Read line by line: `agentEvents.js`, `agentProgress.js`, `parsers/agentProgress.js`, `shared/agentActivity.js`, `AgentProgress.jsx`, `dialog.sh`.
- Read by sections: `TokenDetail.jsx` (the progress fetch and the mount), `ipc.js` (`agents:progress`, `agentActivity:list`, the `agent:activity` push) and `preload/index.js` (the progress members).
- Skimmed or searched, outside the analyzed paths: `agentAdapters.js` (activity), `agentHooks.js` (the kind table), `projectService.js` (`workingAgents`), `shared/locales/en.json`, and the test files by name and grep.
- Not opened: `node_modules/`, `out/`, `dist/`, `coverage/`, `tests/.tmp/`, `.claude/`, and the rest of AI-DLC's install and workspace.

Code was read only: no tests, builds or app runs.

## Scope of Analysis

```yaml
scope_version: 1
kind: partial
intent: honest-agent-progress
fingerprint: 826043724b21f172ab4ca437e5bd9ee4d93ed06e
analyzed:
  paths:
    - src/main/agentEvents.js
    - src/main/agentProgress.js
    - src/main/parsers/agentProgress.js
    - src/shared/agentActivity.js
    - src/renderer/AgentProgress.jsx
    - src/renderer/TokenDetail.jsx
    - .thadeus/hooks/dialog.sh
    - src/main/ipc.js
    - src/preload/index.js
  components:
    - Agent Event Store
    - Agent Progress Loader
    - Agent Progress Parser
    - Agent Activity Model
    - AgentProgress
    - TokenDetail
    - Dialog Hook Script
    - IPC Router
    - Preload Bridge
shallow:
  paths:
    - ./
    - src/main/
    - src/main/parsers/
    - src/main/exec.js
    - src/main/modelChoice.js
    - src/main/models.js
    - src/main/aidlcWrite.js
    - src/main/settings.js
    - src/main/watcher.js
    - src/main/projectService.js
    - src/main/parsers/intents.js
    - src/main/agentAdapters.js
    - src/main/agentHooks.js
    - src/main/features.js
    - src/main/git.js
    - src/main/releases.js
    - src/main/aidlcConfig.js
    - src/main/costRules.js
    - src/preload/
    - src/renderer/
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
