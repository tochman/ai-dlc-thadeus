# Developer Code Scan: US-0801 harness choice

Focused scan for intent `261113-harness-choice` (EPIC-08 US-0801, "Choose the harness per project") at snapshot commit `4b5b8c615a2e0cb7d565c01d052db8504668b652`, over the snapshot paths `src/main`, `src/renderer`, `src/preload`, `src/shared` and `tests`. Code was read only. No tests, builds or app runs.

## Developer Code Scan Results

### Scan Coverage
- **Analyzed deeply**:
  - src/main/pty.js
  - src/main/exec.js
  - src/main/setup.js
  - src/main/models.js
  - src/main/projectService.js
  - src/main/projectAccess.js
  - src/main/settings.js
  - src/main/ipc.js
  - src/main/i18n.js
  - src/main/notify.js
  - src/main/parsers/ledger.js
  - src/preload/index.js
  - src/shared/i18n.js
  - src/shared/appName.js
  - src/shared/locales/en.json
  - src/renderer/TerminalPanel.jsx
  - src/renderer/TerminalContext.jsx
  - src/renderer/terminalControl.js
  - src/renderer/ResumeButton.jsx
  - src/renderer/SetupAidlc.jsx
  - src/renderer/ProjectSettingsDialog.jsx
  - src/renderer/ProjectView.jsx
  - src/renderer/App.jsx
  - src/renderer/CostPanel.jsx
  - src/renderer/CostTab.jsx
  - src/renderer/featureDocsPrompt.js
  - src/renderer/main.jsx
  - tests/main/pty.test.js
  - tests/main/setup.test.js
  - tests/main/settings.test.js
  - tests/main/i18n.test.js
  - tests/main/i18nKeys.test.js
  - tests/renderer/TerminalPanel.test.jsx
  - tests/renderer/ResumeButton.test.jsx
  - tests/renderer/SetupAidlc.test.jsx
  - tests/renderer/CostPanel.test.jsx
  - tests/renderer/setup-i18n.js
- **Skimmed only**: the rest of `src/main/` (menu.js terminal submenu and the `menu.claude` label, questions.js head, watcher.js, git.js, features.js, the other parsers); the rest of `src/renderer/` (RefreshPanel.jsx around its `state('claude')` call, QuestionPopup.jsx, AppSettingsDialog.jsx exports, format.js exports, the other views); `src/shared/locales/sv.json` (key parity is enforced by `tests/main/i18nKeys.test.js`); the rest of `tests/` (ProjectSettingsDialog.test.jsx, projectService.test.js, projectAccess.test.js, ledger.test.js, configuredModels.test.js, menu.test.js and AppShell.test.jsx by grep, fixtures); `package.json` and `vitest.config.mjs` at the repo root (outside the snapshot paths).
- **Left out**:
  - node_modules/
  - out/
  - dist/
  - tests/.tmp/
  - .claude/, .kiro/, .codex/, .cursor/, .opencode/, .aidlc/, aidlc/ (AI-DLC's own install and workspace)

### Packages Found
- thadeus (repo `aidlc-dash`): Electron desktop app, JavaScript ESM and JSX. Main process, preload bridge, React renderer, and a shared module folder (`src/shared/`) that both processes bundle.

### Build System
- **Type**: npm with electron-vite (bundling) and electron-builder (packaging).
- **Config Files**: `package.json`, `electron.vite.config.mjs`, `electron-builder.yml`, `vitest.config.mjs`.
- **Build Dependencies**: renderer → `src/shared/*` and pure `src/main/parsers/*`; main → `src/shared/*`. No workspaces.

### APIs Discovered
- Electron IPC: `src/preload/index.js` exposes `window.bridge` with `platform`, 35 invoke functions and 10 subscriptions. New since the last store: `getLanguage` (`i18n:language`). No HTTP API.

### Frameworks & Libraries
- electron ^45.3.1: desktop runtime
- react / react-dom ^19.3.1: UI
- i18next ^27.1.1, i18next-icu ^2.7.0, react-i18next ^18.0.1, intl-messageformat ^12.1.5: translation (new with US-0701)
- @xterm/xterm ^6.0.0, @xterm/addon-fit ^0.11.0, node-pty ^1.1.0: agent and shell terminals
- vitest ^5.1.0, @testing-library/react ^16.3.3, jsdom ^29.1.1: tests

### Test Coverage
- **Test Directories**: `tests/main/` (22 files, node), `tests/renderer/` (16 test files plus `setup-i18n.js`, jsdom), `tests/fixtures/`.
- **Test Frameworks**: Vitest projects `main` and `renderer`. The renderer project runs `tests/renderer/setup-i18n.js`, which switches i18n to Swedish, so renderer assertions use Swedish text.
- **Coverage Config**: absent.

### Code Quality Indicators
- **Linting**: none (no ESLint/Prettier config). `tests/main/i18nKeys.test.js` acts as a lint for translations: identical keys in sv/en, no empty text, every literal `t('…')` key exists, identical ICU placeholders per key, and no Swedish interface text (å/ä/ö) in `src/renderer/` or `src/main/menu.js` outside comments and `console.*`.
- **CI/CD**: `.github/workflows/release.yml` (not re-read; runs `npx vitest run tests/` on PRs and tags).
- **Documentation**: header comments cite requirement ids. `src/shared/i18n.js:4-9` explains the locale format to translators.

### Technical Debt Signals
- The agent terminal is hard-wired to Claude through the tab id `'claude'`, which doubles as the CLI name: `src/main/pty.js:24`, `src/renderer/TerminalPanel.jsx:15`, `src/renderer/TerminalContext.jsx:12-16`, plus about ten call sites (see Handoff).
- `--harness claude` is hard-coded in `src/main/setup.js:12`, `:62` and `src/main/models.js:8`; `.claude/agents` is the model fallback (`models.js:10`).
- The per-project settings schema is whitelisted in three places: `settings.js:20-25` (`sanitizeProject`), `settings.js:85-102` (`setProjectSettings` validation) and `ipc.js:274` (explicit field pick).
- `menu:state` accepts only three booleans (`parseMenuState`), so the menu cannot learn a harness name without changing that validation.
- `errorText()` is copied into 10+ renderer files (unchanged from the last store).
- Console messages in main stay Swedish by design (`console.*` is exempt from the Swedish-text test), for example `exec.js:26`, `:30`, `:43` and `models.js:56`. Only `runFixed`'s `Ogiltiga argument` (`exec.js:43`) and `models.js:56` are thrown or returned rather than only logged.

## Handoff Summary
- **Intent-relevant finding**: the agent tab is one fixed kind, `'claude'`, which is at once the CLI name, the tab id, the state key and the test id. `shellArgs` (`src/main/pty.js:22-27`) is a whitelist that runs `$SHELL -l -i -c claude`, so a new harness is a new fixed entry there, chosen in main from a validated id and never sent as a string from the renderer. The renderer side keys everything on `'claude'`: `TerminalPanel.jsx:14-15` (`QUICK_COMMANDS`, `KINDS`), `:208` (breathing), `:224` (label `terminal.claude`), `:255` (quick commands typed into `'claude'`); `TerminalContext.jsx:12-16` (initial view and state maps); `ResumeButton.jsx:29-37`; `ProjectView.jsx:105`, `:108`, `:144`, `:159`; `RefreshPanel.jsx:97`; `App.jsx:223` and `:316` (menu action whitelist); `src/main/menu.js:105`. The test ids `terminal-panel-tab-claude`, `-state-claude` and `-pending-claude` are asserted in `tests/renderer/TerminalPanel.test.jsx`. Building blocks to reuse: harness folder detection already exists in `getSetupInfo` (`setup.js:8`, `:49`), but it leaves out `.claude/` and `.github/`. `runFixed` (`exec.js:41-47`) already gives execFile with fixed arguments, no shell, a timeout and the login PATH, which fits `<cli> --version`. Per-project settings already live in the app's own `settings.json`, keyed by the project's realpath root (`settings.js:80-102`).
- **Risks / follow-up**:
  1. **Busy detection may not fit TUIs.** `idle` means 1.5 s without output (`terminalControl.js:4`, `:24-28`), and `type`/`sequence` wait up to 20 s for `idle` (`READY_TIMEOUT_MS`). A harness TUI that redraws all the time (spinner, clock) would never become idle, so Resume and quick commands would time out with `terminal.noResponse`. Check this against each CLI before relying on the shared signal.
  2. **A harness switch kills the session without asking.** `TermSession`'s mount effect depends on `spawn`, which depends on `kind` (`TerminalPanel.jsx:36-48`, `:71-124`). A changed `kind` prop runs the cleanup (`ptyKill`) and spawns again. The AC's "confirm before closing a working tab" must gate before the prop changes.
  3. **Command syntax per harness is unknown here.** `/aidlc …` is typed literally in four places. The per-harness table (Claude Code and opencode `/aidlc`, the skill or prompt form for Codex and Kiro) must be verified against each CLI. The code gives no evidence for it. `featureDocsPrompt` is plain language and portable.
  4. **Some dashboard parts are Claude-specific.** The cost ledger path is shared (`projectService.js:19`, `aidlc/.aidlc-sessions/usage-ledger.json`), but `summarizeLedger` reads no harness field, and the epic says the Claude hooks fill it. The model table is Claude-only (`models.js:8`, `:10`; `ledger.js:149` strips only `claude-`). Under the AC "the view says which harness it covers", both need a label.
  5. **Visible texts name Claude.** At least 11 `en.json` keys do (`terminal.claude`, `terminal.tabName.claude`, `terminal.quickTitle`, `menu.claude`, `intents.resume.busy`, `setup.done`, `setup.featureDocsNew`, `settings.alertsLegend`, `app.notification.title`, the question popup's waiting/answer texts, `github.conflictState`). Turning them into `{harness}` texts must keep identical placeholders in sv and en, or `i18nKeys.test.js` fails. New labels such as "Agent-terminal" must come from the locales, never be literal Swedish in `src/renderer/`.
  6. **Detection leaves things out today.** `OTHER_HARNESSES` (`setup.js:8`) excludes `.claude/` and `.github/`. `.github/` needs an "AI-DLC files inside" check, and `detectProject` (`projectService.js:43-52`) only checks `aidlc/spaces/`. Four `--version` probes at 10 s timeout each should run in parallel and be cached per opened project, like `p.models` (`ipc.js:219-223`).
  7. **US-0802 dependencies.** `buildSetupCommand` and the dry-run preview hard-code `--harness claude`, and `tests/main/setup.test.js:82-84` and `tests/renderer/SetupAidlc.test.jsx:50` assert that string. `SetupDone` restarts `'claude'` after setup (`ProjectView.jsx:144`).
