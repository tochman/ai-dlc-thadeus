# Code Structure

## Layout

```
src/
  main/            Electron main process (44 files, incl. parsers/)
    parsers/       pure parsers: audit, state, runtimeGraph, pipeline, intents, units, ledger, features, releases
    agent*.js      agent dialogs (US-0506): channel, events, adapters, permissions, replies, ipc, hooks, timing
  preload/index.js window.bridge
  renderer/        React views (56 files), editor/ subfolder, theme.css, pure helpers (*.js)
  shared/          pure modules for both sides; locales/sv.json, en.json (1225 lines each)
scripts/           build and CI helpers (glibc check, pty perms, icon, licences, screenshots)
.thadeus/hooks/    dialog.sh, the hook script the app installs into projects (bundled ?raw)
tests/main, tests/renderer, tests/helpers, tests/fixtures
docs/              FEATURES.md, features/epic-*.md (13), releases/, screenshots/
build/             icon sources
```

## File Classification

| Category | Files |
|---|---|
| Controller/Handler | `src/main/ipc.js`, `src/main/agentIpc.js`, `src/preload/index.js`, `src/main/menu.js` |
| Service/UseCase | `projectService.js`, `setup.js`, `plans.js`, `modelChoice.js`, `aidlcWrite.js`, `aidlcConfig.js`, `aidlcUpdate.js`, `releases.js`, `features.js`, `updater.js`, `notify.js`, `agentEvents.js`, `agentPermissions.js`, `agentReplies.js`, `agentHooks.js` |
| Repository/DAO | `projectAccess.js` (read), `fileWrite.js` (write), `settings.js`, `tokenReadings.js`, `git.js`, `models.js` |
| Model/Parser | `src/main/parsers/*`, `questions.js`, `agentAdapters.js` |
| Utility | `exec.js`, `tools.js`, `harness.js`, `watcher.js`, `pty.js`, `agentChannel.js`, `agentTiming.js`, `src/shared/*`, renderer `format.js`, `terminalControl.js`, `picker.js`, `tokenFlow.js`, `tokenChart.js`, `storyFilter.js`, `workflowBusy.js`, `tokens.js` |
| View | `src/renderer/*.jsx`, `src/renderer/editor/*` |
| Configuration | `package.json`, `electron.vite.config.mjs`, `electron-builder.yml`, `vitest.config.mjs`, `eslint.config.mjs`, `.prettierrc.json`, `.nvmrc` |
| Static/Asset | `theme.css`, `index.html`, `build/`, `locales/*.json` |
| Test | `tests/**` |

## Code Patterns

- **Header comments name the story and requirement** (`US-0506 u2 BR5.4`). Exported functions carry JSDoc.
- **Pure first**: parsers and helpers have no Node or React imports and are tested directly. Factories with no Electron import (`createAgentChannel`, `createAgentEventStore`, `createAgentIpc`) let main logic run in plain Node tests.
- **Never-throw readers** (`readJsonSafe` returns `{ok, missing, error}`), with the last good value kept in module-level caches.
- **Fixed commands**: `runFixed(cmd, args[])` with execFile, no shell, a timeout and the login-shell PATH. Commands come from fixed tables (`configTables.js`, `harnesses.js`).
- **i18n**: every user text goes through `t()`. Swedish is the default in tests. `tests/main/i18nKeys.test.js` checks that the key sets match.
- **`data-testid`** is `<component>-<role>` in kebab-case. Deliberate shortcuts carry a `ponytail:` comment naming the ceiling.
- **Styling**: LCARS tokens on `:root` in `theme.css`. Components use classes only. Motion follows `data-motion`.

## Where US-0507 Lands

- `src/main/parsers/units.js` and `runtimeGraph.js` hold the Unit status and graph normalisation.
- `src/main/projectService.js` `buildDetail()` assembles the detail, and `workingAgents()` lives next to it.
- `src/main/watcher.js` `watchIntents` decides what is live.
- `src/main/git.js` holds the read-only git calls.
- `src/renderer/BoltDag.jsx` is the node view. `IntentDetail.jsx` l.251 passes it props. The locale keys go under `intents.units.*`.
