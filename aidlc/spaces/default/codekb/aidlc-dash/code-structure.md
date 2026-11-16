# Code Structure

## Layout

```
src/
  main/            Electron main process (incl. parsers/)
    parsers/       pure parsers: audit, state, runtimeGraph, pipeline, intents, units, agentProgress, ledger, features, releases
    agent*.js      agent dialogs (US-0506): channel, events, adapters, permissions, replies, ipc, hooks, timing
  preload/index.js window.bridge
  renderer/        React views, editor/ subfolder, theme.css, pure helpers (*.js)
  shared/          pure modules for both sides; locales/sv.json, en.json
scripts/           build and CI helpers (glibc check, pty perms, icon, licences, screenshots)
.thadeus/hooks/    dialog.sh, the hook script the app installs into projects (bundled ?raw)
tests/main, tests/renderer, tests/helpers, tests/fixtures
docs/              FEATURES.md, features/epic-*.md, releases/, screenshots/
build/             icon sources
```

## File Classification

| Category | Files |
|---|---|
| Controller/Handler | `src/main/ipc.js`, `src/main/agentIpc.js`, `src/preload/index.js`, `src/main/menu.js` |
| Service/UseCase | `projectService.js`, `agentProgress.js`, `setup.js`, `plans.js`, `modelChoice.js`, `aidlcWrite.js`, `aidlcConfig.js`, `aidlcUpdate.js`, `releases.js`, `features.js`, `updater.js`, `notify.js`, `agentEvents.js`, `agentPermissions.js`, `agentReplies.js`, `agentHooks.js` |
| Repository/DAO | `projectAccess.js` (read), `fileWrite.js` (write), `settings.js`, `tokenReadings.js`, `git.js`, `models.js` |
| Model/Parser | `src/main/parsers/*`, `questions.js`, `agentAdapters.js` |
| Utility | `exec.js`, `tools.js`, `harness.js`, `watcher.js`, `pty.js`, `agentChannel.js`, `agentTiming.js`, `src/shared/*`, renderer `format.js`, `terminalControl.js`, `picker.js`, `tokenFlow.js`, `tokenChart.js`, `storyFilter.js`, `workflowBusy.js`, `tokens.js` |
| View | `src/renderer/*.jsx`, `src/renderer/editor/*` |
| Configuration | `package.json`, `electron.vite.config.mjs`, `electron-builder.yml`, `vitest.config.mjs`, `eslint.config.mjs`, `.prettierrc.json`, `.nvmrc` |
| Static/Asset | `theme.css`, `index.html`, `build/`, `locales/*.json` |
| Test | `tests/**` |

## Code Patterns

- **Header comments name the story and requirement** (`US-0208 FR2.3`). Exported functions carry JSDoc.
- **Pure first**: parsers and helpers have no Node or React imports and are tested directly; `ledger.js` is imported by the renderer too. Exception: `parsers/agentProgress.js` imports `projectService.js`.
- **Never-throw readers** (`readJsonSafe` returns `{ok, missing, error}`), with the last good value kept in module-level caches (`costCache` for the ledger).
- **Rows, most expensive first**: `ledger.js` `rows()` turns a `byX` map into `{name, usd, tokens, totalTokens, missingPrice}` rows and drops empty ones. Every cost table renders these rows.
- **Fixed commands**: `runFixed(cmd, args[])` with execFile, no shell, a timeout and the login-shell PATH.
- **i18n**: every user text goes through `t()`; `tests/main/i18nKeys.test.js` checks that the key sets match.
- **`data-testid`** is `<component>-<role>` in kebab-case (`cost-tab-stages`, `token-detail-cost`). Deliberate shortcuts carry a `ponytail:` comment naming the ceiling.
- **Styling**: LCARS tokens on `:root` in `theme.css`. Components use classes only. Motion follows `data-motion`.

## Where US-0209 Lands

- `src/main/parsers/` holds the rollup parsing: a new pure reader of `STAGE_COMPLETED`/`WORKFLOW_COMPLETED` fields beside `ledger.js`, or an extension of `summarizeLedger` that takes the audit rollups.
- `src/main/projectService.js`: `loadAuditEvents` already reads every shard; `loadCost` reads the ledger. The local clone id (`aidlc/.aidlc-clone-id`) is read here.
- `src/main/ipc.js` `project:cost` assembles the summary and records token readings.
- `src/main/watcher.js` `watchIntents` decides when `costChanged` is set.
- `src/renderer/CostTab.jsx`, `CostPanel.jsx`, `TokenDetail.jsx`, `TokenView.jsx`, `IntentList.jsx` show the totals; the machine list and partial mark go here, with keys under `cost.*`.
