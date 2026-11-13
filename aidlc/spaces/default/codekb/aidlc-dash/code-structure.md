# Code Structure: aidlc-dash

## Directory overview

```
src/
  main/          Electron main process (Node, ESM): index.js (userData, window), i18n.js (main language),
                 menu.js, ipc.js, settings.js, pty.js, exec.js, setup.js, models.js, projectService.js,
                 projectAccess.js, watcher.js, git.js, features.js, questions.js + notify.js
    parsers/     pure parsers for AI-DLC files (also imported by the renderer)
  preload/       contextBridge API (window.bridge)
  renderer/      React SPA: components (.jsx), Lcars.jsx, tokens.js, hooks, helpers, theme.css, index.html, main.jsx
  shared/        imported by main and renderer: appName.js, i18n.js, locales/sv.json, locales/en.json
tests/
  main/          Vitest, node (22 files)
  renderer/      Vitest + Testing Library, jsdom (16 files + setup-i18n.js)
  fixtures/      sample project, audit shards, ledger, feature docs
scripts/         icon generation, node-pty permissions, glibc check
build/           icon sources
docs/            FEATURES.md, one file per epic, screenshots/
```

## File classification

| Category | Files |
|----------|-------|
| Configuration | `package.json`, `electron-builder.yml`, `electron.vite.config.mjs`, `vitest.config.mjs` (two projects; renderer setup file `tests/renderer/setup-i18n.js`), `.nvmrc`, `src/renderer/index.html` (CSP, `<title>`) |
| Entry | `src/main/index.js`, `src/renderer/main.jsx` (language first, then render) |
| Controller/Handler | `src/main/ipc.js`, `src/main/menu.js`, `src/preload/index.js` |
| Service/UseCase | `src/main/projectService.js`, `setup.js`, `models.js`, `pty.js`, `git.js`, `features.js`, `watcher.js`, `questions.js`, `notify.js`, `i18n.js` |
| Repository/DAO | `src/main/projectAccess.js` (root-confined reads), `src/main/settings.js` (the only write) |
| Utility/Helper | `src/main/exec.js`, `src/main/parsers/*.js`, `src/shared/i18n.js`, `src/shared/appName.js`, `src/renderer/format.js`, `terminalControl.js`, `featureDocsPrompt.js`, `tokens.js` |
| Static/Asset | `src/shared/locales/*.json` (translations, data only), `src/renderer/theme.css`, `build/` icons |
| UI components | `src/renderer/*.jsx` (24 files including `main.jsx`), hooks `useProject.js`, `useFeatures.js` |
| CI/CD | `.github/workflows/release.yml` |
| Test | `tests/main/*.test.js`, `tests/renderer/*.test.jsx`, `tests/fixtures/` |

## Agent terminal in detail

| File | Lines | Content |
|------|-------|---------|
| `src/main/pty.js` (85) | 7-8 | `sessions` Map id → `{proc, projectId, sender}`; `ptyModule` cached only after a successful load |
| | 10-20 | `loadPty()`: dynamic `import('node-pty')`, CJS default handling, error `errors.ptyLoadFailed` |
| | 22-27 | `shellArgs(kind)`: `claude` → `['-l','-i','-c','claude']`, `shell` → `['-l']`, else `errors.unknownTerminal` |
| | 33-55 | `spawnSession({projectId, root, kind, cols, rows, sender})`: validates the kind before loading node-pty; `$SHELL` (fallback zsh on macOS, bash elsewhere); `xterm-256color`, `cwd: root`, env `process.env` + `TERM`, `COLORTERM`; pushes `pty:data` and `pty:exit` |
| | 57-85 | `writeSession` (string only), `resizeSession` (clamped 1-999), `killSession`, `killProjectSessions`, `killAllSessions` |
| `src/main/exec.js` (47) | 5-9 | timeouts (10 s default, 5 s PATH probe), `PATH_MARKER`, `PATH_PROBE` |
| | 20-35 | `loginPath()`: once per process, `$SHELL -l -i -c "printf marker$PATH"`; falls back to the app's PATH |
| | 41-47 | `runFixed(file, args, {cwd, timeout, exec})`: rejects non-string args, `execFile` with the login PATH; `exec` injectable |
| `src/renderer/terminalControl.js` (75) | 4-9 | `QUIET_MS` 1500, `READY_TIMEOUT_MS` 20000, echo timeout 3000, `withEnter` |
| | 15-45 | `createActivity()`: `exited` → `busy` on output → `idle` after quiet; `onExit(code)` |
| | 48-75 | `waitFor(activity, target, ms)`, `runSequence(term, steps)` |
| `src/renderer/TerminalContext.jsx` (106) | 10-17 | `TerminalProvider`: `sessions` ref, `view {open: true, active: 'claude'}`, `states {claude, shell}`, `error`, `pending {claude, shell}` |
| | 19-48 | `register(tab, session)`, `show(tab)`, `ready(tab)` (spawn if exited, wait for idle) |
| | 51-100 | `run(tab, fn)`; context value: `view`, `setView`, `error`, `register`, `show`, `state`, `exitCode`, `pending`, `input`, `type`, `sequence`, `restart` |
| `src/renderer/TerminalPanel.jsx` (280) | 14-16 | `QUICK_COMMANDS` (`/aidlc --status`, `/aidlc --doctor`, `/aidlc continue`), `KINDS = ['claude','shell']`, `errorText` |
| | 23-149 | `TermSession({projectId, kind, shown, register, onInput})`: `spawn` (deps `projectId, kind, activity`), registration, xterm setup, pty subscriptions, ResizeObserver; cleanup kills the pty |
| | 152-280 | `TerminalPanel({projectId, visible})`: resize handle, tab blocks (state label, `term-tab-name` = `terminal.<kind>`, breathing when `claude` is busy), elbow toggle, one session per kind, footer with quick commands (typed into `claude`), pending rows, error |
| `src/renderer/ResumeButton.jsx` (55) | 8-15 | `SAFE_DIR_NAME`, `resumeLabel(position)` |
| | 21-55 | busy check on `claude`, `type`/`sequence` into `claude` |

## Setup, settings and project detection

| File | Lines | Content |
|------|-------|---------|
| `src/main/setup.js` (85) | 8-13 | `OTHER_HARNESSES = ['.kiro','.codex','.cursor','.aidlc']`, `PRESETS`, `PLUGIN_NAME`, `BASE_COMMAND` (`--harness claude`), `COUNT_KEYS` |
| | 18-31 | `parsePreview(raw)`: counts, conflict lines, `Note:` lines |
| | 48-67 | `getSetupInfo(root)`: harness folders at root, git, `aidlc --version`, dry run with `--harness claude`, plugins |
| | 73-85 | `buildSetupCommand(options, availablePlugins)`: `&&` chain, validated plugins and preset |
| `src/main/models.js` (66) | 8-11 | `AIDLC_ARGS` with `--harness claude`, `AGENTS_DIR = '.claude/agents'` |
| | 50-66 | `getConfiguredModels(root)`: never throws; `aidlc-config`, then `agent-files`, then `none` |
| `src/main/settings.js` (102) | 9-15 | `DEFAULTS`, `PROJECT_DEFAULTS {featureDocs: 'auto', featuresPath}`, whitelists `FEATURE_DOCS`, `ANIMATIONS`, `QUESTION_ALERTS` |
| | 20-50 | `sanitizeProject`, `sanitize` (adds `language` from `LANGUAGE_SETTINGS`) |
| | 52-78 | `getSettings`, serial `update` queue, `setSettings` (never touches `projectSettings`) |
| | 80-102 | `getProjectSettings(root)`, `setProjectSettings(root, partial)` with validation |
| `src/main/projectService.js` (246) | 19-22 | `LEDGER_PATH`, `intentsDir` |
| | 39-52 | `listSpaces`, `detectProject` |
| | 79-109 | `loadIntentList` (cached, `onlyDirs`) |
| | 142-177 | `inProgress`, `loadPendingQuestions` |
| | 179-246 | `buildDetail`, `loadCost`, `loadIntentDetail` |
| `src/main/ipc.js` (317) | 31-38 | `projects` Map projectId → `{root, space, watcher, setupWatcher, featuresWatcher, featuresKey, sender, models, setupInfo, questions}` |
| | 59-169 | `syncFeaturesWatch`, `watchForSetup`, questions (`allQuestions`, `publishQuestions`, `refreshQuestions`), `watchSpace` |
| | 171-298 | `handlers` (35 channels) |
| | 300-317 | `registerIpc`, `shutdown` |
| `src/renderer/SetupAidlc.jsx` (217) | 12-27 | `Prerequisites` (AI-DLC, git, "Other harnesses") |
| | 29-124 | `Preview`, `Advanced`, `MissingTool`, `FeatureDocsChoice` |
| | 131-217 | `SetupAidlc`: `check`, `initiate` (types into `shell`), failure detection from the shell exit code |
| `src/renderer/ProjectSettingsDialog.jsx` (133) | 15-51 | state `mode`, `path`, `error`, `saving`; reset on open; `save` sends `{featureDocs, featuresPath}` |
| | 53-133 | native `dialog` form: feature-docs radios, path field, setup offer, Save/Cancel |
| `src/renderer/ProjectView.jsx` (253) | 24-96 | `AidlcProject` |
| | 99-122 | `SetupDone` (types `/aidlc --doctor`, `/aidlc ` into `claude`) |
| | 128-221 | `ProjectContent`: `terminalCommand` effect, restart `claude` after setup, feature docs, `TerminalPanel`, `ProjectSettingsDialog` |
| | 223-253 | `ProjectView`: wraps in `TerminalProvider` |

## i18n in detail

| File | Lines | Content |
|------|-------|---------|
| `src/shared/i18n.js` (55) | 15-28 | `LANGUAGES ['sv','en']`, `LANGUAGE_SETTINGS ['auto', ...]`, `LOCALE`, `resolveLanguage(setting, osLocale)` |
| | 30-48 | one `i18next` instance with ICU, bundled `sv`/`en`, `lng: 'sv'`, `fallbackLng: 'en'`, `initAsync: false`, `returnEmptyString: false`, missing key → key, dev-only missing-key log |
| | 50-55 | `t`, `locale()`, default export |
| `src/main/i18n.js` (13) | 6-13 | `currentLanguage()`, `setLanguageFromSettings(settings)` (auto from `app.getLocale()`) |
| `src/renderer/main.jsx` (26) | 13-25 | `<html lang>` follows the language; `getLanguage()` then render inside `I18nextProvider` |
| `src/shared/locales/en.json`, `sv.json` (523 each) | – | top-level groups `common, app, intents, pipeline, cost, github, terminal, features, setup, settings, menu, errors` |

## App shell (`src/renderer/App.jsx`, 519 lines)

| Lines | Content |
|-------|---------|
| 1-24 | imports (incl. `saveLanguage`, `withSlots`, `APP_NAME`), `errorText`, `motionMode` |
| 27-46 | `ArmBlock` |
| 48-73 | state (adds `language`), refs |
| 80-137 | `openPath`, restore (reads `language`), `onProjectDetected`, save tabs |
| 139-228 | branch, meta, fullscreen, waiting questions, `answerInClaude` (220-224), `saveAlertSettings` |
| 230-333 | menu commands, named actions, `changeLanguage`, `menuCommands` (`terminal` accepts `claude | shell | restart`, 316), `sendMenuState` |
| 335-519 | header (`APP_NAME`), left arm, error banner, main area, dialogs |

## Code patterns

- Function components with hooks. No class components and no state library.
- State classes as strings: `is-active`, `is-selected`, `is-new`, `status-<status>`, `term-state-<state>`, `lcars-block--<tone>`.
- Every visible text goes through `t()`. Components use `useTranslation()`; non-React modules and module-level helpers use the shared `t` (imported as `translate` inside components that also call the hook). Rich text with elements uses `withSlots(key, elements)` (`format.js:75`).
- IPC errors are cleaned with a local `errorText()` and shown with `role="alert"`; calm states use `role="status"`.
- Interactive elements carry `data-testid` in the form `<component>-<part>`; terminal ids include the kind (`terminal-panel-tab-claude`).
- Main handlers are entries in one `handlers` object. Preload functions are `call(channel)` or `subscribe(channel)`.
- Push from main is received in a `useEffect` that returns the unsubscribe. Newer channels are called optionally (`bridge.onQuestions?.(…)`).
- Commands from main are whitelisted (`Object.hasOwn(menuCommands, …)`, `pick(value, allowed, fn)`).
- Values that reach a shell are whitelisted in main: pty kinds, plugin names (`PLUGIN_NAME`), presets; intent names before a submitted Enter (`SAFE_DIR_NAME`).
- Settings are whitelisted in `sanitize()`; invalid or missing values are left out so the default applies.
- Never-throwing readers return a shape with a reason (`loadCost`, `getConfiguredModels`, `readJsonSafe`).
- Console logs in main are Swedish and are not translated (by design: `console.*` is exempt from the Swedish-text test).
- Comments cite requirement ids (FRx.y, NFRx, US-xxxx) and `ponytail:` simplifications.
