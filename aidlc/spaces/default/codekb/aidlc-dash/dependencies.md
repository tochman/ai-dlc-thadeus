# Dependencies

The external package versions are in `technology-stack.md`. This file covers how the parts depend on each other.

## Internal Dependencies (main process)

```mermaid
flowchart TD
  IPC[ipc.js] --> PS[projectService.js]
  IPC --> FL[features.js]
  IPC --> RS[releases.js]
  IPC --> GIT[git.js]
  IPC --> TA[teamActivity.js]
  IPC --> W[watcher.js]
  IPC --> SS[settings.js]
  IPC --> MC[modelChoice.js]
  IPC --> MO[models.js]
  IPC --> AC[aidlcConfig.js]
  IPC --> AW[aidlcWrite.js]
  IPC --> CR[costRules.js]
  IPC --> OTHER[pty, agent and plan modules]
  PS --> PA[projectAccess.js]
  PS --> P[parsers: intents, state, runtimeGraph, audit, pipeline, units, ledger, auditCost, velocity]
  MC --> EX[exec.js]
  MC --> TL[tools.js]
  MC --> CT[shared/configTables.js]
  MO --> EX
  AW --> EX
  AC --> EX
  SS --> PF[parsers: features, releases]
  SS --> H[shared/harnesses.js]
  GIT --> EX
  CR --> PL[plans.js]
  AP[parsers/agentProgress.js] --> PS
```

Text fallback:
- `ipc.js` depends on every service:
  - the Project Service, Features Loader, Releases Service, Git Reader, Team Activity and Watcher;
  - the Settings Store;
  - Model Choice and the Model Config Reader;
  - the AI-DLC config reader and writer;
  - the cost rules and the other modules.
- Model Choice, the Model Config Reader, the config reader and writer, and the Git Reader all run commands through `exec.js`, with the binary from `tools.js`.
- Model Choice and the config writer take every argument from `shared/configTables.js`.
- `settings.js` validates against the features and releases parsers and the harness table.
- `parsers/agentProgress.js` imports `workingAgents` from `projectService.js`. There is no cycle.

## Internal Dependencies (renderer)

- `App.jsx` → `ProjectView`, `AgentDialog`, `LatestMessageStrip`, `SettingsView`, the dialogs; `PROJECT_SECTIONS` from `ProjectSettingsView`.
- `ProjectView` → `useProject`, `useFeatures`, `IntentList`, `IntentDetail`, `TerminalPanel`, `FeaturesView`, `ConfigView`, `ProjectSettingsView`, `CostRulesSection`, `PlansView`, `CostPanel`, `VelocityView`, `RefreshPanel`, `MachinesView`, `EditorPanel`.
- `ProjectSettingsView` → `SettingsView` (`Section`, `RadioBlocks`), `AgentHooksSection`, `TerminalContext`, `shared/harnesses.js`, `parsers/features.js`, `parsers/releases.js`.
- `ConfigView` → `ConfigEdit` (`ModelPicker`, `ChangePanel` and the editors).
- `CostRulesSection` → `ConfigEdit` (`ChangePanel`), `SettingsView`.
- `IntentDetail` → `Pipeline`, `Timeline`, `BoltDag`, `ArtifactReader`, `CostTab`, `VelocityView` (the intent tab), `StoryComments`, `ResumeButton`, `TokenView`, `TokenDetail`.
- `Lcars.jsx` → `Tooltip.jsx` → `tooltipPlacement.js`.

## External Integrations

| Integration | Direction | Module |
|---|---|---|
| AI-DLC project files (`aidlc/…`) | read; watched | Project Service, Watcher |
| AI-DLC memory files | marked-block and Guard Policy writes after a diff | Cost Rules Service, AI-DLC Config Writer |
| Feature docs | read; marker and plan writes | Features Loader, Releases Service |
| `aidlc` CLI | run with fixed arguments | Model Choice, Model Config Reader, config reader and writer, Setup Helper, Plans Service, AI-DLC Update Check |
| git | read-only commands, plus `init` in setup | Git Reader, File Editor Service |
| GitHub, GitLab, Bitbucket | read pull requests and comments | Team Activity, `platforms/` |
| GitHub releases API / `gh` | read and download | Updater |
| Agent harness hooks | a file channel in userData | Agent Channel, Dialog Hook Script |
| App settings | read and write `userData/settings.json` | Settings Store |

## US-0210 Blast Radius

| File | Likely change | Dependents and tests |
|---|---|---|
| `src/main/modelChoice.js` | a `from` policy (preset name or profile name), and possibly a profile list | `modelChoice.test.js`; `ModelPicker` keeps working |
| `src/main/settings.js` | the new project fields in `sanitizeProject` and `setProjectSettings` | `settings.test.js` |
| `src/main/ipc.js` | pass the new fields in `projectSettings:set`; a critical-intent check in `watchSpace` `onChange` with a baseline; an apply handler; a push channel | `ipc.test.js` |
| `src/preload/index.js` | one subscribe and one or two invoke members | none of its own |
| `src/renderer/ProjectSettingsView.jsx` (+ `App.jsx` if it gets a new section) | the settings form | `ProjectSettingsView.test.jsx`, `AppShell.test.jsx` |
| a new LCARS dialog, or a reuse of `AgentDialog` | the question and the output | new `tests/renderer` test; `noNativeTitle.test.jsx` |
| `src/renderer/ConfigView.jsx` | show the active profile | `ConfigView.test.jsx` |
| `src/shared/locales/{sv,en}.json` | new keys | `tests/main/i18nKeys.test.js` |

Impact: medium. The change runs across the processes, but every piece has an existing pattern to copy. No new dependency is needed.

## Licences

All runtime dependencies are permissively licensed. `scripts/third-party-licenses.mjs` generates `build/THIRD_PARTY_LICENSES.txt` at build time (US-1101).
