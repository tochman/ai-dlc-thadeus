# Reverse Engineering Timestamp

## Run Record

- Date: 2026-11-19
- Commit: 90031e25c5fafc681865e7c8d7635ebc1498206d
- Intent: spec-kit-framework (`261119-spec-kit-framework`, EPIC-14 US-1401–US-1410)

This was a focused scan of where the app assumes AI-DLC: project detection, the intent and audit readers, the watchers, project settings, the IPC wiring, the terminal commands (Resume and the quick commands), the token log, the waiting questions, agent progress, and the left arm's view routing. It was merged onto the store from the US-0031 scan at `6ec3546`. That store was stale, so only this run's coverage is recorded as verified, and the earlier analyzed paths are demoted to shallow (except `App.jsx`, analyzed again). The prose outside this area is kept from the earlier scans. The developer agent did both the scan and the synthesis, because collaborators were off for this run.

What was read, and how closely:
- Read line by line: `projectService.js`, `projectAccess.js`, `watcher.js`, `settings.js`, `preload/index.js`, `setup.js`, `harness.js`, `tokenReadings.js`, `tokenHistory.js`, `questions.js`, `agentProgress.js`, `parsers/{audit,intents,state,pipeline,units}.js`, `ProjectView.jsx`, `ResumeButton.jsx`, `useProject.js`, `terminalControl.js`, `shared/harnesses.js`.
- Read by sections: `ipc.js` (`:1-545`, `:748-885`, `:1139-1335`, plus a channel map), `App.jsx` (`:1-160`, `:300-345`, `:380-480`, `:570-772`).
- Skimmed, in the snapshot: `agentHooks.js`, `agentAdapters.js`, the other parsers, `TerminalPanel.jsx`, `IntentList.jsx`, `IntentDetail.jsx`, `Pipeline.jsx`, `ArtifactReader.jsx`, `Lcars.jsx`, `ProjectSettingsView.jsx`, `SetupAidlc.jsx`, `ConfigView.jsx`, `TokenView.jsx`, `AgentProgress.jsx`. Outside it, by grep: `TerminalContext.jsx`, `menu.js`, `fileWrite.js`.
- Not opened: `node_modules/`, `out/`, `dist/`, `coverage/`, `tests/.tmp/`, `.claude/`, and the rest of AI-DLC's install and workspace.

Code was read only: no tests, builds or app runs.

## Scope of Analysis

```yaml
scope_version: 1
kind: partial
intent: spec-kit-framework
fingerprint: ca29aad116ec05bfe5848131bb183f70ac7abe11
analyzed:
  paths:
    - src/main/projectService.js
    - src/main/projectAccess.js
    - src/main/watcher.js
    - src/main/settings.js
    - src/main/ipc.js
    - src/preload/index.js
    - src/main/setup.js
    - src/main/harness.js
    - src/main/tokenReadings.js
    - src/main/tokenHistory.js
    - src/main/questions.js
    - src/main/agentProgress.js
    - src/main/parsers/audit.js
    - src/main/parsers/intents.js
    - src/main/parsers/state.js
    - src/main/parsers/pipeline.js
    - src/main/parsers/units.js
    - src/renderer/App.jsx
    - src/renderer/ProjectView.jsx
    - src/renderer/ResumeButton.jsx
    - src/renderer/useProject.js
    - src/renderer/terminalControl.js
    - src/shared/harnesses.js
  components:
    - Project Service
    - Project Access
    - Watcher
    - Settings Store
    - IPC Router
    - Preload Bridge
    - Setup Helper
    - Harness Detection
    - Token Readings
    - Token History
    - Questions Parser
    - Agent Progress Loader
    - Audit Parser
    - Intents Merger
    - State Parser
    - Pipeline Merger
    - Units Status
    - App Shell
    - ProjectView
    - ResumeButton
    - useProject
    - Terminal Control
    - Harness Table
shallow:
  paths:
    - src/renderer/AgentDialog.jsx
    - src/renderer/ReplyPage.jsx
    - src/main/agentEvents.js
    - src/shared/agentOrder.js
    - src/main/agentHooks.js
    - src/main/agentAdapters.js
    - src/main/parsers/runtimeGraph.js
    - src/main/parsers/ledger.js
    - src/main/parsers/auditCost.js
    - src/main/parsers/velocity.js
    - src/main/parsers/features.js
    - src/renderer/TerminalPanel.jsx
    - src/renderer/TerminalContext.jsx
    - src/renderer/IntentList.jsx
    - src/renderer/IntentDetail.jsx
    - src/renderer/Pipeline.jsx
    - src/renderer/ArtifactReader.jsx
    - src/renderer/Lcars.jsx
    - src/renderer/SetupAidlc.jsx
    - src/renderer/ConfigView.jsx
    - src/renderer/TokenView.jsx
    - src/main/menu.js
    - src/main/planningRecord.js
    - src/main/planningSync.js
    - src/main/fileWrite.js
    - src/main/releases.js
    - src/main/parsers/releases.js
    - src/renderer/FeaturesView.jsx
    - .github/workflows/release.yml
    - package.json
    - src/main/agentReplies.js
    - src/shared/alertPlan.js
    - src/main/sessionHandoff.js
    - src/main/
    - src/main/parsers/
    - src/main/parsers/agentProgress.js
    - src/shared/agentActivity.js
    - src/renderer/AgentProgress.jsx
    - src/renderer/TokenDetail.jsx
    - .thadeus/hooks/dialog.sh
    - src/main/exec.js
    - src/main/modelChoice.js
    - src/main/models.js
    - src/main/aidlcWrite.js
    - src/main/features.js
    - src/main/git.js
    - src/main/aidlcConfig.js
    - src/main/costRules.js
    - src/preload/
    - src/renderer/
    - src/renderer/useFeatures.js
    - src/renderer/ProjectSettingsView.jsx
    - src/renderer/ConfigEdit.jsx
    - src/shared/
    - src/shared/locales/
    - docs/
    - build/
    - tests/main/
    - tests/renderer/
```
