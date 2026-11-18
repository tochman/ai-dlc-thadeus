# Code Structure

## Layout

```
src/
  main/            Electron main process (41 modules, plus parsers/ and platforms/)
    parsers/       pure parsers: audit, state, runtimeGraph, pipeline, intents, units, ledger, features, releases, auditCost, agentProgress, velocity
    platforms/     GitHub, GitLab and Bitbucket pull-request readers (US-1201)
    agent*.js      agent dialogs (US-0506), the handoff signals (US-0213), activity (US-0214) and agent progress (US-0507)
    costRules.js   the THADEUS cost rule pack (US-0212)
  preload/index.js window.bridge
  renderer/        React views and helpers, editor/ subfolder, theme.css, pure helpers (*.js)
  shared/          pure modules for both sides (incl. configTables.js, costRules.js, agentActivity.js); locales/sv.json, en.json
scripts/           build and CI helpers
.thadeus/hooks/    dialog.sh, the hook script the app installs into projects
tests/main (85 entries), tests/renderer (50 entries), tests/helpers, tests/fixtures
docs/              FEATURES.md, features/epic-*.md, releases/, screenshots/
build/             icon sources
```

The counts are at `2b5d6a4`. This run (`0ebb196`) read the agent progress area (see `reverse-engineering-timestamp.md`); everything else is from earlier scans.

## File Classification

| Category | Files |
|---|---|
| Controller/Handler | `src/main/ipc.js`, `src/main/agentIpc.js`, `src/preload/index.js`, `src/main/menu.js` |
| Service/UseCase | `projectService.js`, `features.js`, `releases.js`, `teamActivity.js`, `agentProgress.js`, `setup.js`, `plans.js`, `modelChoice.js`, `aidlcWrite.js`, `aidlcConfig.js`, `aidlcUpdate.js`, `costRules.js`, `updater.js`, `notify.js`, `agentEvents.js`, `agentPermissions.js`, `agentReplies.js`, `agentHooks.js` |
| Repository/DAO | `projectAccess.js` (read), `fileWrite.js` (write), `settings.js`, `tokenReadings.js`, `usageSnapshot.js`, `credentials.js`, `git.js`, `models.js` |
| Model/Parser | `src/main/parsers/*`, `questions.js`, `agentAdapters.js`, `src/shared/agentActivity.js` |
| Utility | `exec.js`, `tools.js`, `harness.js`, `watcher.js`, `pty.js`, `agentChannel.js`, `agentTiming.js`, `src/shared/*`, renderer `format.js`, `tooltipPlacement.js`, `terminalControl.js`, `picker.js`, `tokenFlow.js`, `tokenChart.js`, `storyFilter.js`, `workflowBusy.js`, `tokens.js` |
| View | `src/renderer/*.jsx`, `src/renderer/editor/*` |
| Configuration | `package.json`, `electron.vite.config.mjs`, `electron-builder.yml`, `vitest.config.mjs`, `eslint.config.mjs`, `.prettierrc.json`, `.nvmrc` |
| Static/Asset | `theme.css`, `index.html`, `build/`, `locales/*.json`, `.thadeus/hooks/dialog.sh` (shipped as text) |
| Test | `tests/**` |

## Code Patterns

- **Header comments name the story and requirement** (`US-0209 FR1.4`). Exported functions carry JSDoc.
- **Pure first**: parsers and helpers take parsed values and return plain objects, and are tested directly. `reduceActivity` returns a new state per event (`structuredClone` of the touched session).
- **Never-throw readers** (`readJsonSafe` returns `{ok, missing, error}`), with the last good value in module-level caches.
- **Fixed CLI commands from tables**: the renderer sends a small change object (`{kind, key, value, where}` for config; `{harness, where, agent|preset|group, model, effort}` for models). Main refuses unknown fields (`CHANGE_FIELDS`, `MODEL_FIELDS`) and values outside `src/shared/configTables.js` before anything runs. Commands come in pairs: `--yes` and `--dry-run`.
- **Results as values**: `run()` and `apply()` return `{ok, command, output}` or `{ok: false, command, error}`, where `errorText` turns a timeout into `t('errors.timeout')`. The renderer's `ChangePanel` shows the command, the dry run, then the output or the error.
- **Exec**: `runFixed(file, args[], {cwd, timeout, exec, env, maxBuffer})` uses execFile with no shell and the login-shell PATH. `exec` is injectable, so the tests run no real CLI. `toolPath('aidlc')` gives the saved or found binary.
- **Per-project state in `ipc.js`**: the `projects` map holds the root, space, watchers, sender, cached `harnesses`, `models` and `modelOptions`, pending previews (`guardLock`, `costRules`, `planEdit`) and `questions`.
- **Baseline then alert**: `refreshQuestions` adds every id of a project's first computation to `startedWith`. Only ids that appear after it alert.
- **Hook events**: the shell hook copies, the pure adapter reads, the store decides. Activity rows hold identifier-shaped fields only (US-0214 NFR2).
- **Settings**: `sanitize`/`sanitizeProject` keep known keys only (invalid values fall back or are left out). `update()` queues writes. `settingsNow()` is a synchronous copy for main.
- **i18n**: every user text goes through `t()`. `tests/main/i18nKeys.test.js` checks that the key sets match.
- **`data-testid`** is `<component>-<role>` in kebab-case (`agent-progress-main`, `agent-progress-agent`, `agent-progress-state`, `agent-progress-row`). Deliberate shortcuts carry a `ponytail:` comment naming the ceiling.
- **Views**:
  - A project view is a `view === '<id>'` branch in `ProjectView.jsx`, with an `ArmBlock` in `App.jsx`.
  - Configuration sections come from `PROJECT_SECTIONS` (`docs`, `agent`, `aidlc`, `costRules`) in `ProjectSettingsView.jsx`; `AIDLC_SECTIONS` are shown only in AI-DLC projects.
  - A settings section is a `<form>` with `Section`, `RadioBlocks` (from `SettingsView.jsx`) and `useSectionSave`.
- **LCARS primitives** live in `Lcars.jsx`. Tooltips go only through `Tooltip.jsx`.

## Where US-0030 Lands

- `src/main/agentEvents.js`: `KIND_ACTIVITY`/`feedActivity`. Route a dialog kind's activity to the agent that raised it (the payload's `agent_id`), and clear a wait when the permission is answered in the app.
- `src/shared/agentActivity.js`: clearing waits (a subagent's later event, or `answered` from any row), exposing `lastMs` (or a `seenMs`) so the view can say how long ago, and carrying a bounded `task` and tool `description`.
- `src/main/agentAdapters.js`: read `tool_input.description` (Bash and the Agent tool) as bounded, sanitised text, outside `IDENT`.
- `src/renderer/AgentProgress.jsx`: join each hook agent row to its audit build row (`steps`), and show the task, the description and the last-seen time. `src/main/agentProgress.js` and `parsers/agentProgress.js` need no change for the zero-Unit plan.
- `src/shared/locales/{sv,en}.json`: new keys under `tokenDetail.progress`.
- Tests: `tests/main/agentActivity.test.js`, `agentEvents.test.js`, the adapter tests, `tests/renderer/AgentProgress.test.jsx`.

## Where US-0210 Landed (kept from the previous scan, not re-verified)

`modelChoice.js` (a `from` field), `settings.js` (the critical and economy profile fields), `ipc.js` (a check in `watchSpace`'s `onChange` with a baseline), `preload/index.js`, `ProjectSettingsView.jsx`, an LCARS question dialog, and both locale files.
