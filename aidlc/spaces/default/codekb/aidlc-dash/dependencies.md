# Dependencies

Package versions are listed once in `technology-stack.md`; this file records who depends on what.

## External runtime dependencies (`dependencies`)

| Package | Imported by | Process | Notes |
|---|---|---|---|
| `electron` | `src/main/*`, `src/preload/index.js` | main, preload | Notification, BrowserWindow, dialog, shell, Menu, ipcMain/ipcRenderer, contextBridge, webUtils |
| `node-pty` | `src/main/pty.js` (dynamic `import()`) | main | native; `asarUnpack`; `scripts/fix-pty-perms.cjs` fixes `spawn-helper` mode; Linux build checked by `scripts/check-glibc.mjs` |
| `chokidar` | `src/main/watcher.js` | main | v4: misses paths whose folder does not exist yet, worked around by watching a parent with an `ignored` filter |
| `react`, `react-dom` | all `src/renderer/*.jsx` | renderer | |
| `@xterm/xterm`, `@xterm/addon-fit` | `src/renderer/TerminalPanel.jsx` | renderer | buffer API (`baseY`, `getLine`, `isWrapped`, `translateToString`) used by `screenLines()` |
| `i18next`, `i18next-icu`, `intl-messageformat` | `src/shared/i18n.js` | both | bundled into each process |
| `react-i18next` | renderer components | renderer | |
| `react-markdown`, `remark-gfm` | `src/renderer/ArtifactReader.jsx` | renderer | `skipHtml`; custom `a` and `img` |
| `@tanstack/react-virtual` | `src/renderer/Timeline.jsx` | renderer | |
| `@fontsource/antonio` | `src/renderer/main.jsx` | renderer | |

## External build/test dependencies (`devDependencies`)

| Package | Used by |
|---|---|
| `monaco-editor`, `@monaco-editor/react` | `src/renderer/editor/monacoSetup.js`, `MonacoPane.jsx` (bundled at build time, lazy at run time) |
| `electron-vite`, `vite`, `@vitejs/plugin-react` | `electron.vite.config.mjs`, `vitest.config.mjs` |
| `electron-builder` | `npm run build*`, `postinstall` |
| `vitest`, `jsdom`, `@testing-library/react` | `tests/` |

## External system dependencies

| Tool | Needed for | Failure behaviour |
|---|---|---|
| login shell (`$SHELL`) | PATH probe, every terminal tab | PATH falls back to the app's own; spawn error shown in the tab |
| `aidlc` | setup, configuration, plans, models | readers return the error as a value; views show one sentence |
| `claude`, `opencode` | agent tabs | `harnessProblem` message and "Choose harness" |
| `git` | Refresh, setup (`git init`), file tree | panel error; file tree falls back to a walk |
| `gh` (logged in, access to `tochman/aidlc-dash`) | update check and download | `update:check` returns `unavailable` with a reason; still required after the repo goes public until US-0413 |

## Licences (US-1101)

From the `license` fields in `package-lock.json` (lockfile v3, 742 entries) at `bc1dd3d`. The project itself: `package.json` `"license": "MIT"` and `LICENSE` (MIT, © 2026 Auctum Solutions AB) agree.

| Set | Entries | Licences |
|---|---|---|
| Production (`dependencies` and their tree) | 122 | 119 MIT, 1 ISC, 1 BSD-3-Clause, 1 OFL-1.1 (`@fontsource/antonio`, font files bundled into the renderer) |
| Bundled from `devDependencies` by Vite | `monaco-editor`, `@monaco-editor/react` | MIT (Monaco ships its own third-party notices) |
| Build and test only (not shipped) | rest | adds Apache-2.0, MPL-2.0, BlueOak-1.0.0, BSD-2-Clause, CC-BY-4.0, Python-2.0, WTFPL, CC0, 0BSD, MIT-0 |

What ships is `out/**` (bundled main, preload, renderer), `package.json`, the asar-unpacked `node_modules/node-pty/**` and the Electron runtime (`electron-builder.yml` `files`, `asarUnpack`). Electron's own notices (`LICENSE.electron.txt`, `LICENSES.chromium.html`) come with the runtime (the Electron distribution's standard files; not checked in a built package here); the app adds no notice file today: no `extraResources` entry, no `copyright` field, no generated third-party list. Because Vite bundles the JavaScript, the listing must be made from the bundled module set, not from `dependencies` alone.

## Internal cross-module dependencies

Main process imports are listed in `code-structure.md` ("Internal dependency graph"). The cross-process ones:

| From (renderer) | To | Why |
|---|---|---|
| `Timeline.jsx` | `src/main/parsers/audit.js` (`NOISY_EVENTS`) | shared noise list |
| `CostTab.jsx`, `ConfigEdit.jsx` | `src/main/parsers/ledger.js` (`compareModels`) | configured vs actual model |
| `FeaturesView.jsx`, `ProjectSettingsDialog.jsx` | `src/main/parsers/features.js` | status markers, path validation |
| `FeaturesView.jsx`, `ProjectView.jsx`, `ProjectSettingsView.jsx`, `featureDocsPrompt.js` | `src/main/parsers/releases.js` | `DELIVERY`, `DELIVERY_DEFAULT`, `lifecycleTag`, `buildReleases`, `releaseOf`, `releaseOptions`: the same release rules as main |
| many | `src/shared/harnesses.js`, `configTables.js`, `i18n.js`, `appName.js`, `planName.js` | same rules on both sides |

Main and renderer never import each other's process-specific modules; the parsers above are pure (no Node imports).

## Dependencies of the intent area (US-0506 blast radius)

```mermaid
flowchart TD
  Q["src/main/questions.js"] --> PSV["src/main/projectService.js"]
  AUD["src/main/parsers/audit.js"] --> PSV
  PSV --> IPC["src/main/ipc.js"]
  NOT["src/main/notify.js"] --> IPC
  SET["src/main/settings.js"] --> IPC
  PTY["src/main/pty.js"] --> IPC
  HT["src/shared/harnesses.js"] --> PTY
  HT --> SET
  IPC --> PRE["src/preload/index.js"]
  PRE --> APP["src/renderer/App.jsx"]
  APP --> QP["src/renderer/QuestionPopup.jsx"]
  APP --> PV["src/renderer/ProjectView.jsx"]
  PV --> TCX["src/renderer/TerminalContext.jsx"]
  TCX --> PK["src/renderer/picker.js"]
  TCX --> TCL["src/renderer/terminalControl.js"]
  TCX --> TPN["src/renderer/TerminalPanel.jsx"]
  HT --> QP
  APP --> SV["src/renderer/SettingsView.jsx"]
  LOC["src/shared/locales/*.json"] --> QP
  LOC --> NOT
```

Text fallback: `questions.js` and the audit parser feed `projectService.js`, which `ipc.js` uses together with `notify.js`, `settings.js` and `pty.js` (which reads the harness table). The preload bridge carries the result to `App.jsx`, which renders `QuestionPopup.jsx` and passes answers through `ProjectView.jsx` to `TerminalContext.jsx`, which uses `picker.js`, `terminalControl.js` and `TerminalPanel.jsx`. The harness table, the locales and `SettingsView.jsx` (question alert settings) are shared inputs.

Tests touching this area: `tests/main/questions.test.js`, `notify.test.js`, `pty.test.js`, `harness.test.js`, `settings.test.js`, `i18nKeys.test.js`; `tests/renderer/QuestionPopup.test.jsx`, `picker.test.jsx`, `pickerSmoke.test.jsx`, `TerminalPanel.test.jsx`, `terminalControl.test.jsx`, `ResumeButton.test.jsx`, `AppShell.test.jsx`, `SettingsView.test.jsx`; fixtures `tests/fixtures/picker/`.

## Dependencies of the release area (US-0605 blast radius)

```mermaid
flowchart TD
  PF["src/main/parsers/features.js"] --> PR["src/main/parsers/releases.js"]
  PF --> FL["src/main/features.js"]
  PR --> RS["src/main/releases.js"]
  FL --> RS
  FW["src/main/fileWrite.js"] --> RS
  GIT["src/main/git.js listReleaseTags"] --> IPC["src/main/ipc.js"]
  RS --> IPC
  FL --> IPC
  SET["src/main/settings.js delivery"] --> IPC
  IPC --> PRE["src/preload/index.js"]
  PRE --> FV["src/renderer/FeaturesView.jsx"]
  PR --> FV
  PV["src/renderer/ProjectView.jsx"] --> FV
  LOC["src/shared/locales/*.json"] --> FV
```

Text fallback: the features parser feeds the releases parser and the features loader; both feed the releases service, which writes through `fileWrite.js`. `ipc.js` combines the loader, the service, `listReleaseTags` and the saved `delivery` setting and hands them over the preload bridge to `FeaturesView.jsx`, which also imports the releases parser directly and gets `delivery` from `ProjectView.jsx`. Texts come from the locale files (`features.release.*`, `features.releases.*`).

Tests touching this area: `tests/main/releases.test.js`, `tests/main/featureDocsStatus.test.js`, `tests/main/i18nKeys.test.js`, `tests/renderer/FeaturesView.test.jsx`; fixtures `tests/fixtures/features/`.

## Dependencies of the framework-update area (US-0504 blast radius)

```mermaid
flowchart TD
  EX["src/main/exec.js runFixed"] --> TO["src/main/tools.js toolPath, probeTool"]
  EX --> SE["src/main/setup.js"]
  TO --> SE
  GI["src/main/git.js isGitRepo"] --> SE
  SE --> IPC["src/main/ipc.js setup:*"]
  IPC --> PRE["src/preload/index.js"]
  PRE --> SA["src/renderer/SetupAidlc.jsx"]
  PRE --> RP["src/renderer/RefreshPanel.jsx"]
  TCX["src/renderer/TerminalContext.jsx type, anyBusy"] --> RP
  TCX --> SA
  TCX --> PTY["src/main/pty.js writeSession"]
  LOC["src/shared/locales/*.json"] --> RP
  LOC --> SA
```

Text fallback: `runFixed` and `toolPath` carry every `aidlc` call; `setup.js` (with `isGitRepo`) reads the version and the dry-run preview and is reached over `setup:*` IPC by `SetupAidlc.jsx`. `RefreshPanel.jsx` types into the shell tab through `TerminalContext`, which writes to the pty in main, and reads `anyBusy` for the running-workflow gate. Texts come from the locale files (`github.*`, `setup.*`).

Tests touching this area: `tests/main/setup.test.js`, `tests/main/tools.test.js`, `tests/renderer/RefreshPanel.test.jsx`, `tests/main/i18nKeys.test.js`.
