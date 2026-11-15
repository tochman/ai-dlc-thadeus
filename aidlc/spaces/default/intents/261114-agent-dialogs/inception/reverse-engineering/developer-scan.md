# Developer Code Scan: aidlc-dash (T.H.A.D.E.U.S.)

Intent `261114-agent-dialogs` (EPIC-05 US-0506), full rescan at commit `2d111d6175fef7c4fe65dc7cc4cd197dbdebcc25` (2026-11-14). Code was read only: no tests, builds or app runs.

## Developer Code Scan Results

### Scan Coverage
- **Analyzed deeply**:
  - `package.json`, `package-lock.json` (resolved versions only), `electron.vite.config.mjs`, `vitest.config.mjs`, `electron-builder.yml`, `.nvmrc`, `.gitignore` (project block)
  - `.github/workflows/release.yml`
  - `scripts/` (check-glibc.mjs, fix-pty-perms.cjs, make-icon.cjs)
  - `src/main/` (every file, including `parsers/`)
  - `src/preload/index.js`
  - `src/shared/appName.js`, `src/shared/configTables.js`, `src/shared/harnesses.js`, `src/shared/i18n.js`, `src/shared/planName.js`
  - `src/renderer/` every `.js`/`.jsx` file, `src/renderer/editor/`, `src/renderer/index.html` (CSP)
  - Intent-area tests: `tests/main/questions.test.js`, `tests/main/notify.test.js`, `tests/main/pty.test.js`, `tests/main/harness.test.js`, `tests/renderer/QuestionPopup.test.jsx`, `tests/renderer/picker.test.jsx`, `tests/renderer/pickerSmoke.test.jsx`, `tests/renderer/terminalControl.test.jsx`, `tests/fixtures/picker/index.js`, `tests/fixtures/picker/single.txt`, `tests/fixtures/picker/batch-square.txt`, `tests/fixtures/picker/gate.txt`
  - `docs/FEATURES.md`, `docs/features/epic-05-workflow-control.md`
- **Skimmed only**:
  - `src/renderer/theme.css` (section outline and the question-popup / motion rules only)
  - `src/shared/locales/` (key structure; `app.question.*` in `en.json` read; `sv.json` mirrors it, enforced by `tests/main/i18nKeys.test.js`)
  - `tests/main/` and `tests/renderer/` other files (test case names only); `tests/renderer/TerminalPanel.test.jsx` (mock setup and the `answer()` cases)
  - `tests/fixtures/` (other picker variants and the project / audit / ledger / features fixtures, by name)
  - `docs/features/` other epics (EPIC-00 US-0004, US-0006 read), `docs/releases/`, `docs/screenshots/` (images, not opened)
  - `README.md` (headings), `LICENSE`, `build/` (icon sources)
- **Left out**:
  - `node_modules/` (dependencies)
  - `out/`, `dist/` (build output)
  - `tests/.tmp/` (test output)
  - AI-DLC's own install and workspace: `.claude/`, `.aidlc/`, `.opencode/`, `aidlc/`, `aidlc.settings.json`, `opencode.json` (AI-DLC's opencode entries), `AGENTS.md` (one AI-DLC-marked section only), the AI-DLC block of `.gitignore`

### Packages Found
- `thadeus` 0.2.4 (private) — Electron desktop app — JavaScript (ESM, JSX) — read-mostly console for AI-DLC projects with embedded agent terminals
  - `src/main/` — Electron main process: IPC router, file access, parsers, pty, watchers, CLI runners
  - `src/preload/` — contextBridge `window.bridge` (named calls only)
  - `src/renderer/` — React 19 UI (LCARS design), xterm terminals, Monaco editor
  - `src/shared/` — pure modules used by both sides (harness table, i18n, config tables, names)
- `scripts/` — build/CI helpers (Node)
- `tests/` — vitest suites (`main` in node, `renderer` in jsdom)

### Build System
- **Type**: npm + electron-vite 6 (Vite 8) for bundling, electron-builder 26 for packaging (universal .dmg, x64 .deb)
- **Config Files**: `package.json`, `electron.vite.config.mjs`, `vitest.config.mjs`, `electron-builder.yml`, `.nvmrc` (Node 22)
- **Build Dependencies**: renderer → shared, main → shared, renderer → `src/main/parsers/{audit,features,ledger}.js` (pure modules bundled into the renderer); main/preload externalize all deps (node-pty, chokidar load from node_modules); `postinstall` runs `electron-builder install-app-deps` and `scripts/fix-pty-perms.cjs`

### APIs Discovered
- Electron IPC invoke channels — `src/main/ipc.js` `handlers` — 69 channels (project, questions, harness, config, plans, models, update, file, shell, git, setup, settings, tools, app, i18n, features, projectSettings, pty, window, menu)
- Electron push channels main→renderer — `src/main/ipc.js`, `pty.js`, `notify.js`, `menu.js`, `index.js` — 14 channels (`pty:data`, `pty:exit`, `project:changed`, `project:detected`, `project:watchError`, `questions:changed`, `questions:focus`, `config:changed`, `features:changed`, `file:changed`, `update:state`, `window:fullscreen`, `menu:command`, `app:confirmClose`)
- Preload bridge — `src/preload/index.js` — 83 named members on `window.bridge`
- External CLIs run by main (execFile, fixed args, no shell) — `aidlc` (config, engine config/scope/graph), `git` (read-only), `gh` (release view/download), `<harness cli> --version`, `opencode models`, `hdiutil`/`ditto`/`xattr`/`osascript`/`pkexec dpkg` (updater)
- No HTTP server, no socket listener, no Claude Code hook receiver, no opencode plugin/event client

### Frameworks & Libraries
- Electron — 45.3.1 — desktop shell (sandboxed renderer, contextIsolation)
- React / react-dom — 19.3.1 — UI
- @xterm/xterm — 6.0.0, @xterm/addon-fit 0.11.0 — terminal rendering
- node-pty — 1.1.0 — pseudo terminals (lazy loaded)
- chokidar — 4.0.3 — file watching
- i18next 27.1.1, i18next-icu 2.7.0, intl-messageformat 12.1.5, react-i18next 18.0.1 — sv/en translation
- react-markdown 10.1.0, remark-gfm 4.0.1 — Markdown rendering (raw HTML skipped)
- @tanstack/react-virtual — 3.14.24 — virtualised audit timeline
- monaco-editor 0.57.0, @monaco-editor/react 4.7.0 — in-app editor (devDependencies, bundled)
- @fontsource/antonio 5.3.0 — LCARS font
- vitest 5.1.0, jsdom 29.1.1, @testing-library/react 16.3.3, @vitejs/plugin-react 6.3.0 — tests

### Test Coverage
- **Test Directories**: `tests/main/` (31 files), `tests/renderer/` (25 files + `setup-i18n.js`), `tests/fixtures/` (picker screens, audit shards, ledger, feature docs, a fixture AI-DLC project)
- **Test Frameworks**: vitest (projects `main`/node and `renderer`/jsdom), Testing Library
- **Coverage Config**: absent (no `coverage` block, no coverage provider in devDependencies)

### Code Quality Indicators
- **Linting**: none (no ESLint, Prettier or editorconfig in the repo); style is consistent by hand (2-space, single quotes, semicolons)
- **CI/CD**: `.github/workflows/release.yml` — on PR to `main` and `v*.*.*` tags: `vitest run tests/`, mac and Linux builds, glibc check, GitHub Release with SHA256SUMS on tags
- **Documentation**: README (features, install, usage, development, testing, security); `docs/FEATURES.md` + `docs/features/epic-*.md` (stories with acceptance criteria); `docs/releases/`; nearly every function has a one-line doc comment naming its story/requirement id

### Technical Debt Signals
- No linter/formatter and no coverage measurement, while the `classic` scope default adds an 80% line-coverage floor — `package.json`, `vitest.config.mjs`
- `src/main/ipc.js` (709 lines) holds every handler, project state, question state, watchers and close-guard logic
- `src/renderer/App.jsx` (603 lines) and `ProjectView.jsx` (448) carry many responsibilities; question state routes through App → `terminalCommand` → ProjectView → `TerminalContext.answer()`
- Renderer imports from `src/main/parsers/` (`Timeline.jsx`, `CostTab.jsx`, `ConfigEdit.jsx`, `FeaturesView.jsx`, `ProjectSettingsDialog.jsx`): pure today, but a layering trap
- Duplicated helpers: `errorText()` re-declared in ~15 renderer files; `gateText`/`askText` in both `src/main/notify.js` and `src/renderer/QuestionPopup.jsx`
- Screen-scraping of Claude Code's picker by regex (`src/renderer/picker.js`, marked `ponytail:`); any Claude Code layout change breaks answering
- Log and some internal error texts in Swedish (`console.*`, `exec.js` "Ogiltiga argument", `models.js`), user-facing texts go through `t()`
- Unbounded module caches (`projectService.js` listCache/detailCache/questionCache, marked `ponytail:`); `notify.js` `notified` set grows per run
- 10 `ponytail:` markers (deliberate ceilings); 0 TODO/FIXME/eslint-disable

## Handoff Summary
- **Intent-relevant finding**: The popup's questions come only from AI-DLC's audit log, and an answer only reaches the agent by screen-scraping Claude Code's picker. `pendingQuestions()` (`src/main/questions.js:93-141`) builds options from `DECISION_RECORDED.Options` / `QUESTION_ASKED.Options` and closes a question only on later audit events (`QUESTION_ANSWERED`, `QUESTION_REPLIED`, gate/stage closers, `PLAN_APPROVAL_*`, `REQUEST_ROUTED`). `resolveAnswer()` (`src/renderer/picker.js:85-106`) refuses to send unless every logged option label is found in the on-screen picker (`picker.js:96`), returning `mismatch`, which the popup shows as "Could not send: {harness} shows other choices than the ones AI-DLC logged" (`en.json` `app.question.sendFailed` + `app.question.mismatch`). A question answered without a matching audit event (picker gone, answered by keyboard, free text, crashed stage) stays in the list and keeps the popup open (`App.jsx:205-211`). There is no use of Claude Code hooks (`Notification`, `Stop`, `PreToolUse`, `PermissionRequest`) or of opencode's plugin/event API anywhere in `src/`; the only hook-fed inputs are AI-DLC's own ledger and `aidlc/.aidlc-subagent-inflight` file. Permission prompts and plain chat replies are therefore invisible today; opencode gets the own-answer field only (`harnesses.js` `pickerKeys` is set for Claude Code only).
- **Risks / follow-up**:
  - The answer path is renderer-side: `TerminalContext.answer()` writes keys through `bridge.ptyWrite`, and `pty:write` accepts any string for any live session id (`src/main/pty.js:76-79`); US-0506's "permission answers go only to the tab that asked" needs a main-side check, which does not exist.
  - An own answer with no picker on screen is typed into the last-used agent tab, not necessarily the one that asked (`TerminalContext.jsx:184-188`).
  - Activity (`idle/busy/exited`) is inferred from pty output timing only (`terminalControl.js` `createActivity`, 1.5 s, opencode 4 s); there is no structured "waiting for input" signal.
  - Installing hooks or an opencode plugin writes into harness settings (`.claude/settings*.json`, `opencode.json`, `.opencode/`), which `fileWrite.js` treats as engine-owned and the app has never written; the CSP (`index.html`) allows `connect-src 'self' ws:` only, and main has no listener, so any hook transport (HTTP hook, command hook writing files, plugin) is new infrastructure.
  - Question ids are de-duplicated per app run in main (`startedWith`, `notify.js` `notified`) and in the renderer (`seenQuestionsRef`); a second source of questions must share an id space or the "early" and notification rules break.
  - Settings already hold `questionAlerts` (`popup-notify|popup|off`) and `notificationSound` (`settings.js:18,76-79`); US-0506's separate messages setting does not exist yet.
  - No coverage tooling exists, so the `classic` scope's 80% floor cannot be checked without adding it.
</content>
</invoke>
