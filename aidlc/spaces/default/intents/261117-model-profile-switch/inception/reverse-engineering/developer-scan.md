# Developer Code Scan: US-0210 model profile switch

Focused scan at `2b5d6a4` of the CLI runner, the model commands, the project settings, intent watching and the settings UI. Code was read only.

## Developer Code Scan Results

### Scan Coverage
- **Analyzed deeply**:
  - `src/main/exec.js`
  - `src/main/modelChoice.js`
  - `src/main/models.js`
  - `src/main/aidlcWrite.js`
  - `src/main/settings.js`
  - `src/main/watcher.js`
  - `src/main/parsers/intents.js`
  - `src/main/projectService.js` (lines 1-200: intent list, summaries, `inProgress`; the cost and velocity loaders were not re-read)
  - `src/main/ipc.js` (by sections: model and config handlers, `watchSpace`, `refreshQuestions`, `project:open`, `projectSettings:*`, `registerIpc`)
  - `src/renderer/ProjectSettingsView.jsx`
  - `src/renderer/useProject.js`
- **Skimmed only**: `src/preload/index.js` (searched), `src/main/aidlcConfig.js` (the models parser), `src/renderer/ConfigEdit.jsx` (`ModelPicker`, `ChangePanel`), `src/renderer/ConfigView.jsx`, `src/renderer/ProjectView.jsx` and `App.jsx` (section wiring), `src/main/costRules.js`, `src/renderer/CostRulesSection.jsx`, `src/renderer/VelocityView.jsx`, `src/main/notify.js` (heads), `src/shared/configTables.js` (model tables), `tests/` (file names). As input contracts only: `intents.json` and one `aidlc-state.md`, and the `config models` flag parsing in AI-DLC's CLI (`--from`, `--save-as`, the `ModelProfile` type).
- **Left out**: `node_modules/`, `out/`, `dist/`, `coverage/`, `tests/.tmp/`, `.thadeus/`, AI-DLC's install and workspace.

### Packages Found
- `thadeus` (repo `aidlc-dash`): Electron app, JavaScript/JSX, desktop dashboard for AI-DLC. Unchanged since the last scan except new modules for US-0212 and US-0303.

### Build System
- **Type**: npm with electron-vite and electron-builder.
- **Config Files**: `package.json`, `electron.vite.config.mjs`, `electron-builder.yml`, `vitest.config.mjs`.
- **Build Dependencies**: no dependency changes since `bbfb4c0`.

### APIs Discovered
- IPC invoke handlers in `src/main/ipc.js` (1070 lines): `models:options|preview|apply|check`, `config:*`, `projectSettings:get|set`, `project:intents`, push `project:changed`, `config:changed`, `questions:changed`.
- External command: `aidlc config models … --harness <h> --project|--local --yes` through `runFixed`.

### Frameworks & Libraries
- Electron 45, React 19, chokidar 4, i18next 27 with ICU, vitest 5.1 (see `technology-stack.md`).

### Test Coverage
- **Test Directories**: `tests/main` (85 entries), `tests/renderer` (50 entries).
- **Test Frameworks**: vitest, jsdom, Testing Library.
- **Coverage Config**: present (`vitest.config.mjs`, 80% lines). Tests near US-0210: `modelChoice.test.js`, `settings.test.js`, `watcher.test.js`, `ipc.test.js`, `projectService.test.js`, `ProjectSettingsView.test.jsx`, `useProject.test.jsx`, `ConfigView.test.jsx`.

### Code Quality Indicators
- **Linting**: ESLint 9 flat config and Prettier, both in CI.
- **CI/CD**: `.github/workflows/release.yml`.
- **Documentation**: story ids in header comments, JSDoc on exports.

### Technical Debt Signals
- `projectSettings:set` in `ipc.js` passes through a fixed list of fields, `sanitizeProject` keeps another fixed list, and `setProjectSettings` validates a third. A new setting must be added in all three places.
- The project's harness is resolved in the renderer (`resolveHarness`, `ProjectView.jsx:305`); main has only the detection and the saved setting.

## Handoff Summary
- **Intent-relevant finding**: A saved model profile holds only the effort per group, not models. AI-DLC stores `profiles[name] = { groups }` (`ModelProfile`, `.claude/tools/aidlc-model-policy.ts:65`), and `--from <profile>` replaces only `groups` and leaves per-agent pins alone. A "critical" profile can therefore raise efforts but cannot move an agent to a stronger model. The app's command builder (`buildModelCommand`, `src/main/modelChoice.js:101`) accepts only `agent | preset | group` and refuses `--from`. Its `run()` already returns `{ok, command, output|error}`, which covers the "show the output" and "show the failure" criteria.
- **Existing pieces to reuse**:
  - Intent watching: `watchSpace` → `project:changed {indexChanged}` (`ipc.js:417`).
  - Baseline then fresh-only alerts: the `startedWith` pattern in `refreshQuestions` (`ipc.js:349`).
  - End detection: `inProgress()` (`projectService.js:191`); `intents.json` status values seen: `complete`, `in-flight`, and `archived` (handled).
  - Plan identity: `plan ?? scope`, as `plans:list` uses.
  - After a switch: `models:apply` clears `p.models` and `p.modelOptions` and sends `config:changed`.
- **Risks / follow-up**:
  1. Requirements must say whether "profile" means an effort profile, or also per-agent models (which would need a sequence of `--agent … --model` commands).
  2. The app has no list of saved profile names. `--show --json` is parsed only for `data.effective`, so it is not known whether it reports `profiles`.
  3. AI-DLC does not record which profile was loaded last, so the app must keep the "active profile" itself.
  4. New project settings touch three places (see the debt signal above).
  5. The question must be an LCARS dialog, not `window.confirm`.
  6. Two intents at once: the "critical wins" rule needs the set of open critical intents from `loadIntentList`.
  7. The watcher debounce of 300-800 ms is before the first stage, but nothing has been measured.
