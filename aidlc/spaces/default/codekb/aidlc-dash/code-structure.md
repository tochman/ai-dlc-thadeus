# Code Structure

## Layout

```
src/
  main/            Electron main process (41 modules, plus parsers/ and platforms/)
    parsers/       pure parsers: audit, state, runtimeGraph, pipeline, intents, units, ledger, features, releases, auditCost, agentProgress, velocity
    platforms/     GitHub, GitLab and Bitbucket pull-request readers (US-1201)
    agent*.js      agent dialogs (US-0506) and agent progress (US-0507)
    costRules.js   the THADEUS cost rule pack (US-0212)
  preload/index.js window.bridge
  renderer/        React views and helpers, editor/ subfolder, theme.css, pure helpers (*.js)
  shared/          pure modules for both sides (incl. configTables.js, costRules.js); locales/sv.json, en.json
scripts/           build and CI helpers
.thadeus/hooks/    dialog.sh, the hook script the app installs into projects
tests/main (85 entries), tests/renderer (50 entries), tests/helpers, tests/fixtures
docs/              FEATURES.md, features/epic-*.md, releases/, screenshots/
build/             icon sources
```

The counts are at `2b5d6a4`. This run read the US-0210 area (see `reverse-engineering-timestamp.md`); everything else was only listed.

## File Classification

| Category | Files |
|---|---|
| Controller/Handler | `src/main/ipc.js`, `src/main/agentIpc.js`, `src/preload/index.js`, `src/main/menu.js` |
| Service/UseCase | `projectService.js`, `features.js`, `releases.js`, `teamActivity.js`, `agentProgress.js`, `setup.js`, `plans.js`, `modelChoice.js`, `aidlcWrite.js`, `aidlcConfig.js`, `aidlcUpdate.js`, `costRules.js`, `updater.js`, `notify.js`, `agentEvents.js`, `agentPermissions.js`, `agentReplies.js`, `agentHooks.js` |
| Repository/DAO | `projectAccess.js` (read), `fileWrite.js` (write), `settings.js`, `tokenReadings.js`, `usageSnapshot.js`, `credentials.js`, `git.js`, `models.js` |
| Model/Parser | `src/main/parsers/*`, `questions.js`, `agentAdapters.js` |
| Utility | `exec.js`, `tools.js`, `harness.js`, `watcher.js`, `pty.js`, `agentChannel.js`, `agentTiming.js`, `src/shared/*`, renderer `format.js`, `tooltipPlacement.js`, `terminalControl.js`, `picker.js`, `tokenFlow.js`, `tokenChart.js`, `storyFilter.js`, `workflowBusy.js`, `tokens.js` |
| View | `src/renderer/*.jsx`, `src/renderer/editor/*` |
| Configuration | `package.json`, `electron.vite.config.mjs`, `electron-builder.yml`, `vitest.config.mjs`, `eslint.config.mjs`, `.prettierrc.json`, `.nvmrc` |
| Static/Asset | `theme.css`, `index.html`, `build/`, `locales/*.json` |
| Test | `tests/**` |

## Code Patterns

- **Header comments name the story and requirement** (`US-0209 FR1.4`). Exported functions carry JSDoc.
- **Pure first**: parsers and helpers take parsed values and return plain objects, and are tested directly.
- **Never-throw readers** (`readJsonSafe` returns `{ok, missing, error}`), with the last good value in module-level caches.
- **Fixed CLI commands from tables**: the renderer sends a small change object (`{kind, key, value, where}` for config; `{harness, where, agent|preset|group, model, effort}` for models). Main refuses unknown fields (`CHANGE_FIELDS`, `MODEL_FIELDS`) and values outside `src/shared/configTables.js` before anything runs. Commands come in pairs: `--yes` and `--dry-run`.
- **Results as values**: `run()` and `apply()` return `{ok, command, output}` or `{ok: false, command, error}`, where `errorText` turns a timeout into `t('errors.timeout')`. The renderer's `ChangePanel` shows the command, the dry run, then the output or the error.
- **Exec**: `runFixed(file, args[], {cwd, timeout, exec, env, maxBuffer})` uses execFile with no shell and the login-shell PATH. `exec` is injectable, so the tests run no real CLI. `toolPath('aidlc')` gives the saved or found binary.
- **Per-project state in `ipc.js`**: the `projects` map holds the root, space, watchers, sender, cached `harnesses`, `models` and `modelOptions`, pending previews (`guardLock`, `costRules`, `planEdit`) and `questions`.
- **Baseline then alert**: `refreshQuestions` adds every id of a project's first computation to `startedWith`. Only ids that appear after it alert.
- **Settings**: `sanitize`/`sanitizeProject` keep known keys only (invalid values fall back or are left out). `update()` queues writes. `settingsNow()` is a synchronous copy for main.
- **i18n**: every user text goes through `t()`. `tests/main/i18nKeys.test.js` checks that the key sets match.
- **`data-testid`** is `<component>-<role>` in kebab-case. Deliberate shortcuts carry a `ponytail:` comment naming the ceiling.
- **Views**:
  - A project view is a `view === '<id>'` branch in `ProjectView.jsx`, with an `ArmBlock` in `App.jsx`.
  - Configuration sections come from `PROJECT_SECTIONS` (`docs`, `agent`, `aidlc`, `costRules`) in `ProjectSettingsView.jsx`; `AIDLC_SECTIONS` are shown only in AI-DLC projects.
  - A settings section is a `<form>` with `Section`, `RadioBlocks` (from `SettingsView.jsx`) and `useSectionSave`.
- **LCARS primitives** live in `Lcars.jsx`. Tooltips go only through `Tooltip.jsx`.

## Where US-0210 Lands

- `src/main/modelChoice.js`: a `from` field (pattern `^[a-z0-9][a-z0-9-]*$`, or a preset name) in `MODEL_FIELDS` and `policyArgs`, and a way to list the saved profile names.
- `src/main/settings.js`: the new project fields (critical plans, critical and economy profile, ask before economy) in `sanitizeProject` and `setProjectSettings`. `ipc.js` `projectSettings:set` must pass them through as well.
- `src/main/ipc.js`: a main-side check in `watchSpace`'s `onChange` (beside `refreshQuestions`), with a baseline at open, a push to the renderer, and an apply handler that reuses `applyModelChange` and `sendConfigChanged`.
- `src/preload/index.js`: one subscribe and one or two invoke members.
- Renderer: a new section in `ProjectSettingsView.jsx` (or a part of `agent`/`aidlc`), an LCARS question dialog, and the active profile shown in `ConfigView`.
- `src/shared/locales/{sv,en}.json`: new keys in both files.
- Tests: `modelChoice.test.js`, `settings.test.js`, `ipc.test.js`, `ProjectSettingsView.test.jsx`, plus a test for the new dialog.
