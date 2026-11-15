# Unit Test Instructions: u1-questions

## Framework setup

- **Runner:** vitest 5.1.x (installed), with the two projects in `vitest.config.mjs`: `main` (node, `tests/main/**/*.test.js`) and `renderer` (jsdom, `tests/renderer/**/*.test.jsx`, Swedish locale through `tests/renderer/setup-i18n.js`). No change to the projects.
- **Added in plan Steps 1–2:** `@vitest/coverage-v8` (same version as the installed vitest), a `coverage` block in `vitest.config.mjs` (`provider: 'v8'`, include `src/**/*.{js,jsx}` and `.opencode/plugins/*.js`, `thresholds.lines: 80`), and, in Step 37, per-file 80% line globs for this Unit's new files. ESLint (`eslint.config.mjs`) and Prettier (`.prettierrc.json`, `.prettierignore`) are added too; they are not test tools, but the Construction Verification Command runs them.
- **Shells for the script tests:** `tests/helpers/shells.js` exports `SHELLS`: `['sh']`, plus `'dash'` when `dash -c 'exit 0'` succeeds. With `THADEUS_REQUIRE_DASH=1` (set in CI) a missing dash fails the run instead of skipping it. On `ubuntu-latest` `sh` is dash. On the release Mac `sh` is bash in POSIX mode and dash is usually absent; `brew install dash` adds the second run locally (optional).
- **Prerequisites:** `npm ci`. Nothing else: the script tests need only `sh`, `cat`, `mv`, `rm`, `date` and `sleep`, which macOS and Linux provide.

## Runnable before the first test-first cycle (plan Step 9)

```bash
npx vitest run tests/main/i18nKeys.test.js
```

This existing file must be green before the first Red step. Each Red step below then fails on its own file, because the module under test does not exist yet.

## This Unit's tests, file by file

Run each file during its plan step; the steps record the Red output of these exact commands.

| Plan step | Component | Command |
|---|---|---|
| 10–12 | TextSanitizer `src/shared/agentText.js` | `npx vitest run tests/main/agentText.test.js` |
| 13–15 | ClaudeCodeHook `.thadeus/hooks/dialog.sh` | `npx vitest run tests/main/dialogScript.test.js` |
| 16–18 | AgentChannel and heartbeat `src/main/agentChannel.js`, with the script integration | `npx vitest run tests/main/agentChannel.test.js tests/main/agentChannelScript.test.js` |
| 19–21 | HarnessEventAdapter `src/main/agentAdapters.js` | `npx vitest run tests/main/agentAdapters.test.js` |
| 22–24 | OpencodePlugin `.opencode/plugins/thadeus-dialog.js` | `npx vitest run tests/main/opencodePlugin.test.js` |
| 25–27 | TimingLog `src/main/agentTiming.js` | `npx vitest run tests/main/agentTiming.test.js` |
| 28–30 | AgentEventStore `src/main/agentEvents.js`, FallbackQuestionSource in `src/main/questions.js` | `npx vitest run tests/main/agentEvents.test.js tests/main/questions.test.js` |
| 31–33 | PtyManager, IpcRouter (`src/main/agentIpc.js`), preload, single instance | `npx vitest run tests/main/pty.test.js tests/main/agentIpc.test.js tests/main/preload.test.js tests/main/windowOptions.test.js` |
| 34–36 | AgentDialog `src/renderer/AgentDialog.jsx`, App wiring, texts | `npx vitest run tests/renderer/AgentDialog.test.jsx tests/renderer/AppShell.test.jsx tests/main/i18nKeys.test.js` |

## The whole Unit in one run

All of this Unit's test files, without coverage:

```bash
npx vitest run tests/main/agentText.test.js tests/main/dialogScript.test.js tests/main/agentChannel.test.js tests/main/agentChannelScript.test.js tests/main/agentAdapters.test.js tests/main/opencodePlugin.test.js tests/main/agentTiming.test.js tests/main/agentEvents.test.js tests/main/questions.test.js tests/main/pty.test.js tests/main/agentIpc.test.js tests/main/preload.test.js tests/main/windowOptions.test.js tests/renderer/AgentDialog.test.jsx tests/renderer/AppShell.test.jsx tests/main/i18nKeys.test.js
```

This Unit's own coverage target (NFR8.2: at least 80% line coverage of the Unit's new files) is checked with the same files and coverage limited to those files. The command overrides `coverage.include`, so the project-wide threshold in the config applies to the listed files only. Run it as its own command, with nothing after it:

```bash
npx vitest run tests/main/agentText.test.js tests/main/dialogScript.test.js tests/main/agentChannel.test.js tests/main/agentChannelScript.test.js tests/main/agentAdapters.test.js tests/main/opencodePlugin.test.js tests/main/agentTiming.test.js tests/main/agentEvents.test.js tests/main/questions.test.js tests/main/pty.test.js tests/main/agentIpc.test.js tests/main/preload.test.js tests/main/windowOptions.test.js tests/renderer/AgentDialog.test.jsx tests/renderer/AppShell.test.jsx --coverage --coverage.include='src/shared/agentText.js' --coverage.include='src/main/agent*.js' --coverage.include='src/renderer/AgentDialog.jsx' --coverage.include='.opencode/plugins/thadeus-dialog.js'
```

## Expected coverage

- **Project floor:** 80% line coverage over all measured source (`src/**/*.{js,jsx}` and the plugin), set in `vitest.config.mjs` and run in CI. Build and Test checks it on the full suite of the assembled project, with the recorded Construction Verification Command `npx vitest run tests/ --coverage && npx eslint . && npx prettier --check .`. A Unit-scoped run does not judge that floor. If a Unit-scoped command exits non-zero only on that threshold while every selected test passes, record it with this Unit's results as a coverage note, not a failed test. Never lower the threshold or exclude a file to pass (plan K1).
- **This Unit's files:** at least 80% line coverage for `src/shared/agentText.js`, `src/main/agentChannel.js`, `src/main/agentAdapters.js`, `src/main/agentEvents.js`, `src/main/agentTiming.js`, `src/main/agentIpc.js`, `src/renderer/AgentDialog.jsx` and `.opencode/plugins/thadeus-dialog.js`, checked by the Unit-scoped coverage command above and by the per-file globs (Step 37). The aim is above 90% for the pure adapter and sanitizer.
- **Not measured by V8:** `.thadeus/hooks/dialog.sh`. Its cases are listed one by one in `dialogScript.test.js` and `agentChannelScript.test.js`, and the script is reviewed against SCD4's per-poll list (plan Step 15).

## Mocking and stubbing

- **File system:** never mocked for the channel, the script or the plugin. Each test makes its own folder with `fs.mkdtempSync(path.join('tests/.tmp', 'u1-'))` (gitignored) and removes it in `afterEach`. These are the integration boundaries the design names: the real script against a real folder, and main against a real file channel.
- **Shell:** the script is always spawned explicitly, as `spawn(shell, [scriptPath, kind], { env })` with `shell` taken from `SHELLS`, never as an executable. A test that needs a failing or counting `sleep` puts a wrapper script in a temp `bin/` folder at the front of `PATH`.
- **Time:** the store, the plugin and the dialog use `vi.useFakeTimers()` for `waitSeconds`, the 2000 ms liveness rule, the 3 s picker wait, `OVERDUE_MS` and `ARRIVAL_MS`. The script tests use real time (they spawn processes) and assert windows with the design's slack: 2.0–2.5 s (NFR5.1), 1.0–3.2 s for `THADEUS_WAIT_SECONDS=2` (NFR5.2), ≤ 300 ms (NFR1.5), ≤ 100 ms (NFR4.1, NFR4.2). Set `{ timeout: 10_000 }` on those tests. The slack is a check tolerance, not a new target.
- **Channel in store tests:** a fake object with the C2 members plus `answerState`, `retract` and `isLive`, whose return values each test sets. Spies on `writeAnswer` assert that no refused answer writes.
- **Pty:** a fake with `write` (spy), `tapOutput(id, fn)` (the test pushes chunks into `fn`) and `ptyOf`. The existing `tests/main/pty.test.js` mocks `node-pty` with `vi.doMock`; the new cases follow it.
- **Electron:** `tests/main/preload.test.js` mocks `electron` (`contextBridge.exposeInMainWorld` captured, `ipcRenderer.invoke`, `send` and `on` as spies). `tests/main/windowOptions.test.js` keeps its existing mock and adds `requestSingleInstanceLock`, `quit` and `on` to `app`. `agentIpc.js` imports nothing from Electron, so its tests pass plain fake senders (`{ isDestroyed, send }`).
- **opencode:** a stubbed V2 `ctx`: an event subscription the test can fire (`form.created`, `form.replied`, `form.cancelled`), `ctx.session.form.reply` as a spy that resolves, rejects or is left out, and a logger spy. The plugin module is imported fresh per test (`vi.resetModules()`), because it reads `process.env` when it sets up.
- **Renderer:** `window.bridge.agentEvents` stubbed with `list`, `answer`, `close` and `onChanged` (the test calls the captured listener to push), with `stamp` present or absent; `window.open` spied for the link check. Tests look up the dialog's text by its Swedish wording, so an English literal left in the component fails them.
- **Console:** spies on `console.log`, `info`, `warn` and `error` for the quiet-path tests (NFR3.12) and the one-line-per-refusal tests (NFR3.11). Each test asserts the `[agent-events]` prefix, that no secret appears, and that quoted agent text is at most 80 characters.

## Test data

- `tests/fixtures/agent-events/claude/*.json`: Claude Code `PreToolUse` stdin for `AskUserQuestion` (`tool_input.questions[]` with `question`, `header`, `options[{label, description}]`, `multiSelect`), one file per NFR2.1 scenario: `gate-2026-11-14.json` ("Complete workflow" and "Request Changes" with descriptions, while the AI-DLC audit fixture logs "Approve / Request changes"), `reordered.json`, `batch-four.json`, `multi-two.json`, `own-answer.json`; `post-tool-use.json` for the closing event; and the malformed `no-questions.json`, `five-questions.json`, `no-text.json`, `empty-label.json`.
- `tests/fixtures/agent-events/opencode/*.json`: `form.created` for the same five scenarios, plus `form-replied.json` and `form-cancelled.json`.
- **Generated in the test, not stored:** the 70 KB text with emoji, quotes, newlines and control characters (AC1.1.10), the 64 KB boundary strings with a 4-byte emoji at byte 65 534 (NFR5.8), and the shell metacharacter payload (NFR3.8).
- **Event files** are written by the tests in the C1 format: line 1 `THADEUS-EVENT v1 <kind> <secret>`, then the fixture bytes. Names are `<epoch-s>-<pid>.evt`, written as `.tmp` and then renamed.
- **The fixtures follow the spike tables** in `functional-design/functional-spec.md` (Claude Code 2.1.325, opencode 2.1.4). The manual run on the release Mac (NFR2.2, before the release pull request) saves the real event files of the five scenarios. They replace or confirm these fixtures; `tests/fixtures/agent-events/README.md` says so.
- **Existing fixtures** under `tests/fixtures/audit/` and `tests/fixtures/picker/` stay as they are. They serve the fallback (audit) tests moved from QuestionPopup to AgentDialog.

## Development hook entries (for the manual run, not for the automated tests)

The automated tests need no hook installed. For a development run, the person pastes these entries by hand into `.claude/settings.json` (until u4 installs them), and starts the app with `THADEUS_AGENT_HOOKS=1 npm run dev`, adding `THADEUS_TIMING=1` for the timing log:

```text
PreToolUse  matcher AskUserQuestion  timeout 600  command: [ -n "$THADEUS_SESSION_DIR" ] && [ -f "$CLAUDE_PROJECT_DIR/.thadeus/hooks/dialog.sh" ] && sh "$CLAUDE_PROJECT_DIR/.thadeus/hooks/dialog.sh" question; exit 0
PostToolUse matcher AskUserQuestion  timeout 10   command: [ -n "$THADEUS_SESSION_DIR" ] && [ -f "$CLAUDE_PROJECT_DIR/.thadeus/hooks/dialog.sh" ] && sh "$CLAUDE_PROJECT_DIR/.thadeus/hooks/dialog.sh" answered; exit 0
```

opencode loads `.opencode/plugins/thadeus-dialog.js` from this repository by itself.
