# Code Structure

## Repository layout

```text
aidlc-dash/
├── src/
│   ├── main/            Electron main process (Node ESM)
│   │   └── parsers/     pure parsers for AI-DLC files (some also bundled into the renderer)
│   ├── preload/         contextBridge: window.bridge
│   ├── renderer/        React UI, index.html, theme.css
│   │   └── editor/      Monaco editor (lazy loaded)
│   └── shared/          pure modules used by main and renderer
│       └── locales/     sv.json, en.json (ICU MessageFormat)
├── tests/
│   ├── main/            vitest, node environment (32 files)
│   ├── renderer/        vitest, jsdom environment (27 files + setup-i18n.js)
│   └── fixtures/        picker screens, audit shards, ledger, feature docs, a fixture AI-DLC project
├── scripts/             check-glibc.mjs (CI), fix-pty-perms.cjs (postinstall), make-icon.cjs
├── build/               icon.svg, icon.png, icons/NxN.png (electron-builder resources)
├── docs/                FEATURES.md, features/epic-*.md, releases/ (hand-written release plans, e.g. 0.2.3.md), screenshots/
├── .github/workflows/   release.yml (the only file under .github/)
├── package.json, electron.vite.config.mjs, vitest.config.mjs, electron-builder.yml, .nvmrc
├── eslint.config.mjs, .prettierrc.json, .prettierignore
├── README.md, LICENSE (MIT), AGENTS.md
└── (AI-DLC install: .claude/, .aidlc/, .opencode/, aidlc/, opencode.json — not part of the app)
```

Build output (`out/`, `dist/`), `coverage/`, `node_modules/` and `tests/.tmp/` are git-ignored; `.gitignore` also carries AI-DLC's managed block. Of 1823 tracked files, 749 are AI-DLC records under `aidlc/` and 357 are outside AI-DLC's folders. No `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md` or issue/PR templates exist (US-1101).

`tests/fixtures/` (95 files): `agent-events/{claude,opencode}/` (hook and event JSON), `agent-hooks/` (settings files for the hook installer, with a README), `audit/` (shards `machine-a`, `machine-b`, `epic02-units`), `features/`, `ledger/`, `picker/` (screen transcripts), `plain-folder/`, `project/` (a small AI-DLC project with three intents) and `broken.json`.

## File classification

| Category | Files |
|---|---|
| Configuration / entry | `src/main/index.js` (app lifecycle, window options), `src/renderer/main.jsx`, `src/renderer/index.html`, build configs |
| Controller / handler | `src/main/ipc.js` (all IPC handlers), `src/preload/index.js` (bridge), `src/main/menu.js` (menu commands) |
| Service / use case | `projectService.js`, `questions.js`, `notify.js`, `pty.js`, `harness.js`, `setup.js`, `aidlcConfig.js`, `aidlcWrite.js`, `plans.js`, `modelChoice.js`, `models.js`, `git.js`, `updater.js`, `features.js`, `releases.js`, `fileWrite.js`, `watcher.js`, `tools.js` |
| Repository / data access | `projectAccess.js` (root-confined reads), `settings.js` (app settings file), `fileWrite.js` (atomic editor writes) |
| Model / parser | `src/main/parsers/` (`audit`, `state`, `runtimeGraph`, `pipeline`, `intents`, `units`, `ledger`, `features`, `releases`) |
| Utility | `exec.js`, `i18n.js`, `src/shared/*`, `src/renderer/format.js`, `tokens.js`, `tokenFlow.js`, `terminalControl.js`, `picker.js`, `featureDocsPrompt.js` |
| UI component | every `src/renderer/*.jsx` and `src/renderer/editor/*.jsx` |
| Hooks (React) | `useProject.js`, `useFeatures.js`, `useEditorTabs` (in `EditorPanel.jsx`), `useDetectedHarnesses` (in `ProjectView.jsx`), `useTwoBusyWarning` (in `TerminalPanel.jsx`) |
| Static / asset | `theme.css` (1166 lines, LCARS tokens on `:root`, motion rules), `build/`, `docs/screenshots/` |
| Test | `tests/**` |

The full per-component list with responsibilities is in `component-inventory.md`.

## Internal dependency graph (main process)

```text
index.js      -> ipc.js, menu.js, settings.js, tools.js, i18n.js, shared/appName
ipc.js        -> projectAccess, projectService, notify, parsers/ledger, models, aidlcConfig, plans,
                 aidlcWrite, modelChoice, updater, git, setup, harness, tools, settings, watcher,
                 fileWrite, features, releases, parsers/releases, pty, menu, i18n, shared/i18n
features      -> projectAccess, parsers/features, shared/i18n
releases      -> projectAccess, fileWrite, features, parsers/releases, shared/i18n
parsers/releases -> parsers/features (storyIdsIn)
projectService-> projectAccess, parsers/{intents,state,runtimeGraph,audit,pipeline,units,ledger}, questions
questions     -> (none; pure)
notify        -> electron Notification, shared/i18n
pty           -> node-pty (lazy), shared/harnesses, tools
harness       -> exec, tools, shared/harnesses
setup         -> exec, tools, git, projectAccess, shared/harnesses
aidlcConfig   -> exec, parsers/ledger, plans, tools, shared/harnesses
aidlcWrite    -> exec, projectAccess, tools, shared/configTables
plans         -> exec, projectAccess, models, projectService (inProgress), tools, shared/{harnesses,planName}
modelChoice   -> exec, tools, parsers/ledger, shared/{configTables,harnesses}
updater       -> exec, settings (UPDATE_DEFAULTS)
fileWrite     -> exec, projectAccess, shared/harnesses
settings      -> parsers/features, shared/{i18n,harnesses}, tools
tools, exec   -> node:child_process (exec), shared/i18n (tools)
```

No circular imports were found. `plans.js` → `projectService.js` → `questions.js` is one-directional.

## Renderer dependency shape

```text
main.jsx -> App.jsx -> ProjectView.jsx -> TerminalContext.jsx (provider) -> TerminalPanel.jsx
                                          ├ IntentList, IntentDetail -> Pipeline, Timeline, BoltDag, ArtifactReader, CostTab, TokenView, ResumeButton
                                          ├ CostPanel, RefreshPanel, SetupAidlc, ProjectSettingsDialog
                                          ├ ConfigView -> ConfigEdit ; PlansView -> ConfigEdit(ChangePanel)
                                          ├ FeaturesView ; editor/EditorPanel, editor/FileTree
                   App.jsx -> QuestionPopup, SettingsView, DocsDialog, AboutDialog, UpdateNotice, Splash
TerminalContext -> terminalControl.js, picker.js
Renderer -> src/main/parsers/{audit,ledger,features,releases}.js (pure imports, bundled)
```

## Code patterns

- **Fixed-table validation**: every id a renderer sends (harness, tool, config key, model, plan name, external URL key) is checked against a table in `src/shared/` or a regex before anything runs; anything else throws a translated error.
- **Never-throwing readers**: readers return values with `error`/`warning`/`stale` fields instead of throwing (`readJsonSafe`, `getConfiguredModels`, `detectHarnesses`, `getTools`, `loadCost`), and keep the last good value on a half-written file.
- **Preview then apply**: for every write that changes a project (setup, config, guard lock, plan edit, model change) main returns the exact command and its `--dry-run` or diff first; apply runs only that, and tier-2 writes only if the file still reads as it did at preview.
- **Typed, not run**: anything that changes the working tree or the workflow and is not a vetted CLI call is typed into a terminal tab for the person's Enter (`terminal.type(..., {submit: false})`). Setup is the exception since US-0802: `runSetup` runs `aidlc config ... --yes` in main after the preview.
- **Shared pure modules** in `src/shared/` and `src/main/parsers/` keep main and renderer on the same rules.
- **Story-tagged comments**: almost every function's doc comment names its story and requirement (`US-0505 FR1.4`), and deliberate ceilings carry `ponytail:` comments (10 in `src/`).
- **i18n**: every user-facing text through `t()` with ICU placeholders; `tests/main/i18nKeys.test.js` enforces identical keys in `sv.json` and `en.json` and that every literal `t()` key exists.
- **Test ids**: `data-testid` on interactive elements, kebab-case `<component>-<role>`.
