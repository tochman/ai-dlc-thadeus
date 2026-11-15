# Code Quality Assessment

Read-only assessment at commit `2d111d6`; the testing, linting, documentation and public-readiness sections were updated at `bc1dd3d` (US-1101). No tests, builds or app runs were made, so pass/fail and coverage figures are not measured here.

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
- **CI**: `.github/workflows/release.yml` `verify` job runs, as separate steps, `npx vitest run tests/ --coverage` (with `THADEUS_REQUIRE_DASH=1`), `npx eslint .` and `npx prettier --check .` on every PR to `main` and on tags, before the mac and Linux builds.
- **Coverage**: `@vitest/coverage-v8` with an 80% line floor, enforced in CI (added since `2d111d6`; configuration in `vitest.config.mjs`, not re-read in this run).
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

ESLint 9 (`eslint.config.mjs`) and Prettier 3 (`.prettierrc.json`) are configured and block CI (versions in `technology-stack.md`). Prettier skips `docs/`, `*.md`, `*.css` and `tests/fixtures/`, so Markdown files (README and the new public files) are not format-checked. No editorconfig or TypeScript/`tsc --checkJs`.

## Documentation

- `README.md`: background, features, install, usage, development, testing, security, an "Open source" paragraph and licence. Already mostly written for outside users; see "Public-readiness review" for gaps.
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
| Large modules | `ipc.js`, `App.jsx`, `ConfigEdit.jsx`, `ProjectView.jsx`, `TerminalPanel.jsx`, `theme.css` | changes in the question flow touch several large files |
| Renderer imports from `src/main/parsers/` | `Timeline.jsx`, `CostTab.jsx`, `ConfigEdit.jsx`, `FeaturesView.jsx`, `ProjectSettingsDialog.jsx` | safe while the parsers stay pure |
| Duplicated helpers | `errorText()` in renderer files; `gateText`/`askText` | drift risk |
| Unbounded caches | `projectService.js` (`ponytail:`), `notify.js` `notified`, `ipc.js` `startedWith` | memory grows with long runs and many intents |
| Swedish log messages and a few internal errors | `console.*` across main, `exec.js`, `models.js`, `scripts/check-glibc.mjs` | inconsistent with the English UI default; not user-facing |
| `tests/.tmp/` used by tests in the repo folder | `tests/main/harness.test.js` and others | git-ignored; harmless |

## Public-readiness review (US-1101, at `bc1dd3d`)

Scope of this review: `package.json`, `package-lock.json`, `electron-builder.yml`, `.github/`, `.gitignore`, `LICENSE`, `README.md`, `build/`, `scripts/`, `tests/fixtures/`, `docs/`. The 749 tracked files under `aidlc/` (of 1823 tracked) and AI-DLC's install folders were not reviewed here. Secret checks: `git grep` over these paths and a pattern grep over `git log -p --all` (private keys, AWS, GitHub, Anthropic, OpenAI, Slack, Google keys); no dedicated scanner (`gitleaks`) is installed, so AC2 still needs one.

| Finding | Where | Note |
|---|---|---|
| No secret-like values | scanned paths; history grep | history hits were regex sources in AI-DLC's redaction code, not keys; `release.yml` uses only `github.token` |
| Personal author emails in commit metadata | `git log` (54 + 36 + 4 commits, three personal addresses) | public with the history; changing them needs a history rewrite (AC3) |
| References to another local project | `docs/features/epic-01…:33`, `epic-02…:17`, `epic-03…:7`, `epic-04…:23` (the reference project's local path) | names a private project path |
| Fixtures derived from that project | `tests/fixtures/project/…/261112-epic29-small-k2-fixes/`, `261110-epic02-finish/`, `tests/fixtures/audit/machine-a.md` | Swedish K2-accounting story texts and ids; no personal data |
| Machine-name string | `tests/fixtures/picker/no-picker.txt:3` (`audit/macbookpro.md`) | minor |
| Generic home paths | `tests/fixtures/agent-events/claude/*.json` (`/Users/dev/…`) | fine as is |
| Screenshots with private context | `docs/screenshots/intents.png`, `cost.png` (second project tab of the reference project, branch, cost figures; Swedish UI) | `features.png`, `timeline.png`, `splash.png` not viewed |
| Company email | `package.json` author, `electron-builder.yml` maintainer (`info@auctum.se`) | public contact, intended |
| Private-repo wording | `release.yml:2`, `electron-builder.yml:30` | update when public |
| Public files missing | repo root, `.github/` | no `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `ISSUE_TEMPLATE/`, `pull_request_template.md`; `.github/` holds only `workflows/release.yml` |
| README gaps for outsiders | `README.md` | links and download URLs assume `tochman/aidlc-dash`; no prerequisites list for `gh`/`aidlc`, no contributing/security pointers; "Development" mentions the `aidlc/` records |
| Licence agreement | `LICENSE`, `package.json` | both MIT; third-party listing missing (see `dependencies.md` "Licences") |
| Test tied to `.claude/` | `tests/fixtures/agent-hooks/README.md` (`aidlc.json` reads this repo's `.claude/settings.json`) | removing `.claude/` from the public tree breaks it |
| Actions pinned by tag | `release.yml` (`@v4`) | common; SHA pinning is a hardening option once outsiders send PRs |
| Swedish console messages | `scripts/*.cjs`, `scripts/check-glibc.mjs` | contributor-facing |

## Brownfield notes for US-0605 (release area, at `4867a36`)

Ratings for the area: naming good, function size good (all release functions are short and pure but `setStoryRelease`), error handling good (bad input throws a translated error, a stale hash returns `{conflict}`, `listReleaseTags` falls back to `[]`), tests good (see below). Facts the design must keep:

| Fact | Where | Consequence for US-0605 |
|---|---|---|
| No store for planned releases; `docs/RELEASES.md` does not exist and nothing reads it | `parsers/releases.js`, `features.js` | a new reader (pure parser) and a write path are needed, whichever store is chosen |
| `releaseOptions` suggests the next patch and minor only | `parsers/releases.js:83` | AC1 adds the next major; created releases must also join the picker options |
| `writeFileSafe` refuses a file that does not exist (it stats it first) | `fileWrite.js:79` | creating `docs/RELEASES.md` needs a create path (`writeAtomic` exists) |
| The watcher covers only the overview and the epic folders | `features.js` `featureWatchPaths` | a file beside `FEATURES.md` must be added, or the view will not reload on its change |
| Every marker write changes `FEATURES.md`, and each write is hash-checked | `releases.js` `setStoryRelease` | adding several stories from the release list needs one call at a time with fresh hashes, or a batch call in main |
| `docs/releases/` already holds hand-written release plans (`0.2.3.md`, `0.2.4.md`) | `docs/` | a `docs/RELEASES.md` next to it has a near name; say how they relate |
| App settings drop unknown keys | `settings.js` `setProjectSettings` | the app-settings alternative needs a new sanitised key and is not seen by other clones or tools |
| `ReleasesView` has no `projectId`; the `vX.Y.Z` regex and sort are private | `FeaturesView.jsx:160`, `parsers/releases.js:6,22` | small prop and export changes |
| Two-file write without a transaction (`ponytail:`) | `releases.js:24` | a third file (RELEASES.md) widens the same gap |

Tests in the area: `tests/main/releases.test.js` (pure functions on lines shaped like the real epic and overview, plus `setStoryRelease`/`readRuleStatus` in a temp project, conflict and refusal cases); `tests/renderer/FeaturesView.test.jsx` "releases (US-0603)" (picker options and bridge call, refused and failed writes, release list order and dates, stale flags, continuous deployment hiding). No test covers several writes in a row.

## Brownfield notes for the next stages

- **Test baseline**: the suite was not run in this stage; Code Generation should record a baseline (`npm test`) before changes.
- **US-1101 blast radius**: mostly new files (public docs, templates, a licence notice) plus edits to `README.md`, `release.yml`, `electron-builder.yml`, fixtures and docs named in the review above. Removing or ignoring `.claude/` breaks the `agent-hooks` fixture case; run the full suite after any removal.
- **Blast radius of US-0506**: see the intent-area graph in `dependencies.md`; the high-impact files are `src/main/ipc.js`, `src/main/questions.js`, `src/preload/index.js`, `src/renderer/App.jsx`, `src/renderer/QuestionPopup.jsx`, `src/renderer/TerminalContext.jsx`, `src/shared/harnesses.js`, `src/main/settings.js` and both locale files.
