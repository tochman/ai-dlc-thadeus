# Reverse Engineering Timestamp

## Run Record

- Date: 2026-11-17
- Commit: 2b5d6a47c83532c7e55358c2307043461127f990
- Intent: model-profile-switch (`261117-model-profile-switch`, EPIC-02 US-0210)

This was a focused scan of the CLI runner, the model commands, the project settings store and UI, and intent watching. It was merged onto the store from the US-0303 scan at `bbfb4c0`. That store was stale, so only this run's coverage is recorded as verified, and its analyzed paths are demoted to shallow. The prose outside the analyzed area is kept from the earlier scans and is marked where it is not re-verified. The developer agent did both the scan and the synthesis, because the architect was switched off for this run.

What was read, and how closely:
- Read line by line: `exec.js`, `modelChoice.js`, `models.js`, `aidlcWrite.js`, `settings.js`, `watcher.js`, `parsers/intents.js`, `ProjectSettingsView.jsx`, `useProject.js`.
- Read by sections: `projectService.js` (lines 1-200: the intent list, summaries and `inProgress`) and `ipc.js` (the model, config, cost-rules and plans handlers, `watchSpace`, `refreshQuestions`, `project:open`, `projectSettings:*`, `registerIpc`).
- Skimmed or searched, outside the analyzed paths: `src/preload/index.js`, `aidlcConfig.js`, `ConfigEdit.jsx` (`ModelPicker`), `ConfigView.jsx`, `ProjectView.jsx`, `App.jsx`, `costRules.js`, `CostRulesSection.jsx`, `VelocityView.jsx`, `notify.js`, `src/shared/configTables.js`, `src/shared/harnesses.js`, and the test file names.
- Read as input contracts only: `intents.json`, this intent's `aidlc-state.md`, and the `config models` flag parsing in AI-DLC's CLI (`--from`, `--save-as`, `ModelProfile`).
- Not opened: `node_modules/`, `out/`, `dist/`, `coverage/`, `tests/.tmp/`, `.thadeus/`, and the rest of AI-DLC's install and workspace.

Code was read only: no tests, builds or app runs.

## Scope of Analysis

```yaml
scope_version: 1
kind: partial
intent: model-profile-switch
fingerprint: 7e27b02192e4dadadc7d421c56c8789c26344ff4
analyzed:
  paths:
    - src/main/exec.js
    - src/main/modelChoice.js
    - src/main/models.js
    - src/main/aidlcWrite.js
    - src/main/settings.js
    - src/main/watcher.js
    - src/main/projectService.js
    - src/main/parsers/intents.js
    - src/main/ipc.js
    - src/renderer/ProjectSettingsView.jsx
    - src/renderer/useProject.js
  components:
    - Exec Runner
    - Model Choice
    - Model Config Reader
    - AI-DLC Config Writer
    - Settings Store
    - Watcher
    - Project Service
    - Intents Merger
    - IPC Router
    - ProjectSettingsView
    - useProject
shallow:
  paths:
    - ./
    - src/main/
    - src/main/parsers/
    - src/main/features.js
    - src/main/git.js
    - src/main/releases.js
    - src/main/aidlcConfig.js
    - src/main/costRules.js
    - src/preload/
    - src/renderer/
    - src/renderer/ConfigEdit.jsx
    - src/shared/
    - src/shared/locales/
    - docs/
    - build/
    - tests/main/
    - tests/renderer/
```
