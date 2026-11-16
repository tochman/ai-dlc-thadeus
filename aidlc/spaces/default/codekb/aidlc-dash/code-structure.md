# Code Structure

## Layout

```
src/
  main/            Electron main process (44 files, incl. parsers/)
    parsers/       pure parsers: audit, state, runtimeGraph, pipeline, intents, units, ledger, features, releases
    agent*.js      agent dialogs (US-0506): channel, events, adapters, permissions, replies, ipc, hooks, timing
  preload/index.js window.bridge
  renderer/        React views (57 tracked files), editor/ subfolder, theme.css (1413 lines), pure helpers (*.js)
  shared/          pure modules for both sides; locales/sv.json, en.json (1244 lines each)
scripts/           build and CI helpers (glibc check, pty perms, icon, licences, screenshots)
.thadeus/hooks/    dialog.sh, the hook script the app installs into projects (bundled ?raw)
tests/main, tests/renderer, tests/helpers, tests/fixtures
docs/              FEATURES.md, features/epic-*.md (13), releases/, screenshots/
build/             icon sources
```

The main-process count is from the earlier full scan (`721e051`); this run re-read only `src/renderer`.

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
- **i18n**: every user text goes through `t()`. Components use `useTranslation()`; modules outside a hook (`Lcars.jsx`, `format.js`, `Pipeline.jsx` as `translate`) import `t` from `src/shared/i18n.js`. Swedish is the default in tests. `tests/main/i18nKeys.test.js` checks that the key sets match.
- **`data-testid`** is `<component>-<role>` in kebab-case. Deliberate shortcuts carry a `ponytail:` comment naming the ceiling.
- **Styling**: LCARS tokens on `:root` in `theme.css`. Components use classes only. Motion follows `data-motion` on `<html>` (set in `App.jsx:108`).
- **LCARS primitives** live in `Lcars.jsx` (`Bar`, `Frame`, `Hairlines`, `Dots`, `Readout`, plus `progressStates`/`dotsLabel`). Decorative parts are `aria-hidden`, and status is never colour alone. A shared tooltip fits here as one more primitive.
- **Accessible names**: icon buttons carry `aria-label` and today repeat it in `title` (`App.jsx:539-549`). A `role="img"` span carries `aria-label` (`Pipeline.jsx:60`, `CostTab.jsx:17`, `Dots`).

## Where US-0414 Lands

- A shared tooltip (a component in `Lcars.jsx`, or a class in `theme.css`) styled from `.token-detail-row-tip` (`theme.css:709-710`).
- The 31 native `title=` sites in 13 files (the list is in `component-inventory.md`, "Tooltip Sites").
- `TokenDetail.jsx`: the row tip (l.272) and the visx `Tooltip` (l.135-156) take the shared style; `theme.css:679-684` and `709-710` fold into it.
- `src/shared/locales/{sv,en}.json`: any new tooltip keys, in both files.
- `tests/renderer/`: a test of the shared tooltip opening on focus and on hover, plus the existing `.title` asserts (see `code-quality-assessment.md`).
