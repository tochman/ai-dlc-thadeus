# Code Quality Assessment

Read-only assessment at commit `2d111d6`. No tests, builds or app runs were made, so pass/fail and coverage figures are not measured here.

## Summary ratings

| Aspect | Rating | Evidence |
|---|---|---|
| Naming clarity | good | intention-revealing names (`resolveAnswer`, `pendingQuestions`, `harnessProblem`), consistent `data-testid` |
| Function size | fair | most functions are short and pure; `ipc.js` (709 lines), `App.jsx` (603), `ConfigEdit.jsx` (550), `ProjectView.jsx` (448), `TerminalPanel.jsx` (449) are large |
| Error handling | good | readers return errors as values and keep last good data; every IPC handler logs and rethrows; spawn and CLI failures become one translated sentence |
| Test presence | good | 32 main and 27 renderer test files (about 490 test cases); the intent area has dedicated unit, component and xterm smoke tests |
| Duplication | fair | `errorText()` in about 15 renderer files; `gateText`/`askText` in `notify.js` and `QuestionPopup.jsx`; harness "busy" fallbacks repeated |
| Dead code | good | no commented-out blocks; 0 TODO/FIXME/eslint-disable; 10 `ponytail:` markers documenting deliberate ceilings |

## Testing

- **Runner**: vitest with two projects (`vitest.config.mjs`): `main` (node, `tests/main/**/*.test.js`) and `renderer` (jsdom, `tests/renderer/**/*.test.jsx`, Swedish UI via `tests/renderer/setup-i18n.js`).
- **CI**: `.github/workflows/release.yml` runs `npx vitest run tests/` on every PR to `main` and on tags, before the mac and Linux builds.
- **Coverage**: no coverage configuration or provider. The `classic` scope's default 80% line-coverage floor (org `## Testing Posture`) cannot be verified without adding one (for example `@vitest/coverage-v8`).
- **Fixtures**: `tests/fixtures/picker/*.txt` are Claude Code picker screens transcribed from a screenshot (US-0006), not live captures; `tests/fixtures/project/` is a small AI-DLC project; audit shards and a ledger mirror real formats.

### Coverage of the intent area

| Behaviour | Tests |
|---|---|
| Option parsing in every logged form, batch summaries, engine asks, open/close rules | `tests/main/questions.test.js` |
| Picker reading (gate, single, cursor on 2, wrapped, cut with `…`, batch chips, old picker in scrollback), key resolution, mismatch/noPicker/several, wait for the picker | `tests/renderer/picker.test.jsx` |
| Real xterm buffer: ANSI, scrolled viewport, tall picker, redraw, narrow wrap | `tests/renderer/pickerSmoke.test.jsx` |
| Popup: text not HTML, choices, gate buttons, own answer, opencode (no keys), no agent, terminal hand-off, escalation, refused send, arrival warning, batch, plan ask | `tests/renderer/QuestionPopup.test.jsx` |
| `answer()` writes the picker key without switching tabs, refuses without a picker, waits for it | `tests/renderer/TerminalPanel.test.jsx` |
| Notification title/body per language | `tests/main/notify.test.js` |
| Agent spawn by harness id only, lazy node-pty | `tests/main/pty.test.js` |
| Activity signal and sequences | `tests/renderer/terminalControl.test.jsx` |
| Resume waiting reasons (busy, asking, running, elsewhere) | `tests/renderer/ResumeButton.test.jsx` |
| `questionAlerts`/`notificationSound` sanitising | `tests/main/settings.test.js` |

Gaps: nothing tests `ipc.js`'s `refreshQuestions`/`early` baseline or `notifyQuestions`' focus rule (Electron `Notification` is mocked away); no test covers an own answer landing in a different agent tab than the asking one; no test exercises opencode's screen at all.

## Linting, formatting, typing

None configured: no ESLint, Prettier, editorconfig or TypeScript/`tsc --checkJs`. The org rule "defer to project-level configurations" therefore has nothing to defer to. Style is consistent by hand (2 spaces, single quotes, semicolons, long lines up to about 160 characters).

## Documentation

- `README.md`: background, features, install, usage, development, testing, security, licence.
- `docs/FEATURES.md` and `docs/features/epic-*.md`: stories with Given/When/Then criteria, status markers and release notes per story; kept current by a mandated project rule.
- `docs/releases/0.2.3.md`, `0.2.4.md`.
- In code: a header comment per module and a doc comment per exported function, each naming its story and requirement ids; texts for translators described in `src/shared/i18n.js`.

## Security posture

| Control | Where |
|---|---|
| Sandboxed renderer, contextIsolation, no node integration, webSecurity | `src/main/index.js` `windowOptions()` |
| CSP: `default-src 'self'`, `script-src 'self'`, `connect-src 'self' ws:`, no objects | `src/renderer/index.html` |
| No navigation away, new windows denied, http(s) links to the OS browser | `src/main/index.js` |
| Narrow bridge, no generic invoke | `src/preload/index.js` |
| Root confinement with realpath checks | `src/main/projectAccess.js` |
| No shell for commands, fixed args from tables, timeouts | `src/main/exec.js`, `aidlcWrite.js`, `modelChoice.js`, `setup.js`, `git.js` |
| Agent CLI only from the harness table by validated id | `src/main/pty.js` |
| External URLs by fixed key | `src/main/ipc.js` `EXTERNAL_URLS` |
| Update assets checked against the own repo and SHA256SUMS | `src/main/updater.js` |
| Markdown without raw HTML; question text as text | `ArtifactReader.jsx` (`skipHtml`), `QuestionPopup.jsx` |
| Engine-owned files never written by the editor | `src/main/fileWrite.js` |

Weak points relevant to US-0506:

- `pty:write` accepts any string for any live session id (`pty.js` `writeSession`); which tab receives an answer is decided in the renderer. US-0506's "permission answers go only to the tab that asked" has no main-side enforcement today.
- An own answer with no picker on screen goes to the last agent tab used (`TerminalContext.jsx` `answer()`), which can differ from the asking tab with two harness tabs open.
- Installing Claude Code hooks or an opencode plugin means writing into `.claude/settings*.json`, `opencode.json` or `.opencode/`, all engine-owned for the editor; it needs a consent and preview flow like EPIC-09's tier 2, and any hook transport (local HTTP endpoint, files written by a command hook, a plugin) is new attack surface the app does not have today (no listener in main; CSP limits renderer connections).

## Technical debt

| Item | Location | Impact |
|---|---|---|
| Question source is the audit log only | `src/main/questions.js` | Claude Code's own questions, permission prompts and messages are invisible |
| Answer path by screen-scraping and exact label match | `src/renderer/picker.js` (`ponytail:` note) | "shows other choices than the ones AI-DLC logged" whenever AI-DLC's logged labels and the picker's differ; any Claude Code layout change breaks it |
| Questions close only on audit events | `questions.js`, `App.jsx` popup rule | a question answered without a matching event (or abandoned) stays and keeps the popup open |
| Activity from output timing | `terminalControl.js` | "idle" can mean waiting for input, thinking quietly, or waiting on a subagent |
| opencode picker keys unverified | `shared/harnesses.js` (`pickerKeys` only on Claude Code) | opencode gets only free text |
| No coverage tool, no linter | repo | scope floors and style not enforceable |
| Large modules | `ipc.js`, `App.jsx`, `ConfigEdit.jsx`, `ProjectView.jsx`, `TerminalPanel.jsx`, `theme.css` | changes in the question flow touch several large files |
| Renderer imports from `src/main/parsers/` | `Timeline.jsx`, `CostTab.jsx`, `ConfigEdit.jsx`, `FeaturesView.jsx`, `ProjectSettingsDialog.jsx` | safe while the parsers stay pure |
| Duplicated helpers | `errorText()` in renderer files; `gateText`/`askText` | drift risk |
| Unbounded caches | `projectService.js` (`ponytail:`), `notify.js` `notified`, `ipc.js` `startedWith` | memory grows with long runs and many intents |
| Swedish log messages and a few internal errors | `console.*` across main, `exec.js`, `models.js`, `scripts/check-glibc.mjs` | inconsistent with the English UI default; not user-facing |
| `tests/.tmp/` used by tests in the repo folder | `tests/main/harness.test.js` and others | git-ignored; harmless |

## Brownfield notes for the next stages

- **Test baseline**: the suite was not run in this stage; Code Generation should record a baseline (`npm test`) before changes.
- **Blast radius of US-0506**: see the intent-area graph in `dependencies.md`; the high-impact files are `src/main/ipc.js`, `src/main/questions.js`, `src/preload/index.js`, `src/renderer/App.jsx`, `src/renderer/QuestionPopup.jsx`, `src/renderer/TerminalContext.jsx`, `src/shared/harnesses.js`, `src/main/settings.js` and both locale files.
