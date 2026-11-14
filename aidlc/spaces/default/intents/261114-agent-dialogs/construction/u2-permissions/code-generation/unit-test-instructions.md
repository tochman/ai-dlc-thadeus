# Unit Test Instructions: u2-permissions

## Framework setup

- **Runner:** vitest 5.1.x as u1 left it, with three projects in `vitest.config.mjs`: `main` (node, `tests/main/**/*.test.js` except the timed script file), `scripts` (node, `tests/main/dialogScript.test.js`, run after the others with `sequence.groupOrder: 1`) and `renderer` (jsdom, `tests/renderer/**/*.test.jsx`, Swedish locale through `tests/renderer/setup-i18n.js`). The projects do not change.
- **Coverage:** `@vitest/coverage-v8` is installed. The `coverage` block measures `src/**/*.{js,jsx}` and `.opencode/plugins/*.js` with `thresholds.lines: 80`, plus per-file 80% globs for `src/main/agent*.js` (which covers the new `agentPermissions.js`), `src/shared/agentText.js`, `src/renderer/AgentDialog.jsx` and `.opencode/plugins/thadeus-dialog.js`. Plan Step 25 adds one glob for the new `src/shared/agentOrder.js`. No threshold is lowered and no file is excluded.
- **Lint and format:** ESLint (`eslint.config.mjs`) and Prettier (`.prettierrc.json`, `.prettierignore`) are in place from u1. They are not test tools, but the Construction Verification Command runs them.
- **Shells for the script tests:** `tests/helpers/shells.js` (from u1) exports `SHELLS`: `['sh']`, plus `'dash'` when `dash -c 'exit 0'` succeeds. With `THADEUS_REQUIRE_DASH=1` (set in CI) a missing dash fails the run. On `ubuntu-latest` `sh` is dash; on the release Mac `brew install dash` adds the second run (optional).
- **Prerequisites:** `npm ci`. No new dependency in this Unit.
- **Worktree:** this Unit is built in its own copy of the project with u1 and without u3. The tests use only u1's code and this Unit's; a reply is represented by a plain `kind: 'reply'` object where an order test needs one.

## Runnable before the first test-first cycle (plan Step 3)

```bash
npx vitest run tests/main/agentAdapters.test.js
```

This existing u1 file must be green before the first Red step. Each Red step below then fails on its own cases, because the permission code does not exist yet.

## This Unit's tests, file by file

Run each command during its plan step; the steps record the Red output of these exact commands.

| Plan step | Component | Command |
|---|---|---|
| 4–6 | HarnessEventAdapter, permission part (`src/main/agentAdapters.js`) | `npx vitest run tests/main/agentPermissionAdapter.test.js tests/main/agentAdapters.test.js` |
| 7–9 | ClaudeCodeHook with `permission` (`.thadeus/hooks/dialog.sh`) | `npx vitest run tests/main/dialogScript.test.js` |
| 10–12 | AgentChannel (`src/main/agentChannel.js`), with the script integration | `npx vitest run tests/main/agentChannel.test.js tests/main/agentChannelScript.test.js` |
| 13–15 | OpencodePlugin, permission path (`.opencode/plugins/thadeus-dialog.js`) | `npx vitest run tests/main/opencodePlugin.test.js` |
| 16–18 | Pager order (`src/shared/agentOrder.js`), permission store and delivery (`src/main/agentPermissions.js`, `src/main/agentEvents.js`), TimingLog (`src/main/agentTiming.js`) | `npx vitest run tests/main/agentOrder.test.js tests/main/agentPermissions.test.js tests/main/agentTiming.test.js tests/main/agentEvents.test.js` |
| 19–21 | IpcRouter answer check (`src/main/agentIpc.js`) | `npx vitest run tests/main/agentIpc.test.js` |
| 22–24 | AgentDialog permission page (`src/renderer/AgentDialog.jsx`), App sort and notice (`src/renderer/App.jsx`), texts | `npx vitest run tests/renderer/AgentDialog.test.jsx tests/renderer/AppShell.test.jsx tests/main/i18nKeys.test.js` |

`tests/main/agentAdapters.test.js`, `agentEvents.test.js`, `agentChannel.test.js`, `agentChannelScript.test.js`, `dialogScript.test.js`, `opencodePlugin.test.js`, `agentTiming.test.js`, `agentIpc.test.js` and `tests/renderer/AgentDialog.test.jsx` hold u1's cases too. They are listed because this Unit changes the code they test, and u1's cases must stay green.

## The whole Unit in one run

All of this Unit's test files, without coverage:

```bash
npx vitest run tests/main/agentPermissionAdapter.test.js tests/main/agentAdapters.test.js tests/main/dialogScript.test.js tests/main/agentChannel.test.js tests/main/agentChannelScript.test.js tests/main/opencodePlugin.test.js tests/main/agentOrder.test.js tests/main/agentPermissions.test.js tests/main/agentTiming.test.js tests/main/agentEvents.test.js tests/main/agentIpc.test.js tests/renderer/AgentDialog.test.jsx tests/renderer/AppShell.test.jsx tests/main/i18nKeys.test.js
```

This Unit's own coverage target (u1 NFR8.2 applied to this Unit's files, OD9) is checked with the same files and coverage limited to the files this Unit creates or changes. The command overrides `coverage.include`, so the project-wide threshold in the config applies to the listed files only. Run it as its own command, with nothing after it:

```bash
npx vitest run tests/main/agentPermissionAdapter.test.js tests/main/agentAdapters.test.js tests/main/dialogScript.test.js tests/main/agentChannel.test.js tests/main/agentChannelScript.test.js tests/main/opencodePlugin.test.js tests/main/agentOrder.test.js tests/main/agentPermissions.test.js tests/main/agentTiming.test.js tests/main/agentEvents.test.js tests/main/agentIpc.test.js tests/renderer/AgentDialog.test.jsx tests/renderer/AppShell.test.jsx --coverage --coverage.include='src/main/agentAdapters.js' --coverage.include='src/main/agentChannel.js' --coverage.include='src/main/agentEvents.js' --coverage.include='src/main/agentPermissions.js' --coverage.include='src/main/agentTiming.js' --coverage.include='src/main/agentIpc.js' --coverage.include='src/shared/agentOrder.js' --coverage.include='src/renderer/AgentDialog.jsx' --coverage.include='.opencode/plugins/thadeus-dialog.js'
```

## Expected coverage

- **Project floor:** 80% line coverage over all measured source (`src/**/*.{js,jsx}` and the plugin), set in `vitest.config.mjs` and run in CI. Build and Test checks it on the full suite of the assembled project, with the recorded Construction Verification Command `npx vitest run tests/ --coverage && npx eslint . && npx prettier --check .`. A Unit-scoped run does not judge that floor. If a Unit-scoped command exits non-zero only on that threshold while every selected test passes, record it with this Unit's results as a coverage note, not a failed test. Never lower the threshold or exclude a file to pass.
- **This Unit's files:** at least 80% line coverage for `src/main/agentPermissions.js`, `src/shared/agentOrder.js`, and the changed `src/main/agentAdapters.js`, `agentChannel.js`, `agentEvents.js`, `agentTiming.js`, `agentIpc.js`, `src/renderer/AgentDialog.jsx` and `.opencode/plugins/thadeus-dialog.js`, checked by the Unit-scoped coverage command above and by the per-file globs. The aim is above 90% for the pure adapter, `agentPermissions.js` and `agentOrder.js`. `src/renderer/App.jsx` is held by the project floor only.
- **Not measured by V8:** `.thadeus/hooks/dialog.sh`. Its permission cases are listed one by one in the `permission argument` block of `dialogScript.test.js` and in `agentChannelScript.test.js`.

## Mocking and stubbing

- **File system:** never mocked for the channel, the script or the plugin. Each test makes its own folder under `tests/.tmp/` with `mkdtempSync` (gitignored) and removes it afterwards, as u1's tests do.
- **Shell:** the script is always spawned explicitly, as `spawn(shell, [scriptPath, 'permission'], { env })` with `shell` from `SHELLS`, never as an executable. The C6 cases run the exact entry command through `sh -c`.
- **Time:** the store and the dialog use fake timers (`vi.useFakeTimers()` in the store tests; in the dialog tests the existing Date-only fake and `show()` helper, which move the clock past `GUARD_MS` where a test needs it). The script and plugin tests use real time and assert u1's windows: 2.0–2.5 s (NFR5.14), 1.0–3.2 s for `THADEUS_WAIT_SECONDS=2` (NFR5.15), ≤ 300 ms for a dropped answer, ≤ 100 ms for the C6 command. Those tests set `{ timeout: 15_000 }`. The slack is a check tolerance, not a new target.
- **Channel and pty in the store tests:** `tests/helpers/agentFakes.js` (new): a fake channel with `onRawEvent`, `isLive`, `ptyOf`, `writeAnswer`, `answerState`, `retract` as spies whose results each test sets, and a fake pty whose `write` and `tapOutput` are spies. Every permission test asserts the pty fake's `write` was never called, and refusal tests assert `writeAnswer` was never called. u1's `tests/main/agentEvents.test.js` keeps its own local fakes.
- **Adapters:** the store tests use the real `adapters` from `src/main/agentAdapters.js` with the fixtures, so the hook output written is the real one.
- **Electron:** none needed. `agentPermissions.js`, `agentEvents.js` and `agentIpc.js` import nothing from Electron; `agentIpc` tests pass plain fake senders, as u1's do.
- **opencode:** the u1 `load()` stub in `opencodePlugin.test.js` gains `ctx.permission = { reply, hook }`, both spies; `reply` resolves, rejects, is left out (`null`) or fires the `permission.replied` handler from inside itself (the replied-during-reply case). The module is imported fresh per test (`vi.resetModules()`).
- **Renderer:** `window.bridge.agentEvents` stubbed with `list`, `answer`, `close` (resolving `{ state: 'handedBack' }` or `{ state: 'dismissed' }`), `onChanged` and an optional `stamp`. Tests look up texts by their Swedish wording, so an English literal left in the component fails them. Window focus is simulated with `window.dispatchEvent(new Event('focus'))`.
- **Console:** spies on `console.log`, `info`, `warn` and `error` for the quiet paths (OD8); the store's `log` dependency is captured for the one-line-per-refusal checks (OD7), which assert the `[agent-events]` prefix, `session=` and `file=`, no secret, no rule line, and a `text=` excerpt of at most 80 characters with ESC shown as `\u001b`.
- **Source tests:** read `src/main/agentPermissions.js`, `src/main/agentEvents.js`, `src/main/agentIpc.js` and `.opencode/plugins/thadeus-dialog.js` as text with `readFileSync` (no `pty`/`writeSession`/`sendViaKeys` reference in the permission module, no `.focus(`/`.show(`/`moveTop`, no `evaluate` in the plugin).

## Test data

- `tests/fixtures/agent-events/claude/permission-*.json`: Claude Code `PermissionRequest` stdin (`session_id`, `cwd`, `hook_event_name`, `tool_name`, `tool_input`, `permission_suggestions`): `permission-bash.json` (Bash `git push`, one `addRules` suggestion), `permission-bash-dirs.json` (`addRules` plus `addDirectories`), `permission-edit.json` (Edit with `file_path`, no suggestions), `permission-empty-suggestions.json`, `permission-setmode.json`, `permission-deny-rule.json`, `permission-extra-key.json`, `permission-question-tool.json`, `permission-no-tool.json`, `permission-input-string.json`, `permission-unicode.json`.
- `tests/fixtures/agent-events/opencode/permission-*.json`: `permission.asked` events (`properties: { requestID, sessionID, permission, patterns, always, metadata }`): `permission-asked-always.json`, `permission-asked-no-always.json`, `permission-asked-empty-always.json`, `permission-asked-bad-always.json`, `permission-asked-no-request.json`, `permission-asked-no-session.json`; and `permission-replied.json`.
- **Generated in the test, not stored:** the escape table's characters (from `String.fromCodePoint`, never raw in the source), the 64 KB boundary strings with a 4-byte emoji at byte 65 534, the 200/201 code-point `what`, the 4 096/4 097-byte `cwd`, the 8/9-line and 1 024/1 025-character rule lists, the sentinel string planted in a suggestion, and the shell metacharacter payload.
- **Event files** are written in the C1 format: line 1 `THADEUS-EVENT v1 permission <secret>`, then the fixture bytes; names `<epoch-s>-<pid>.evt`, written as `.tmp` and then renamed.
- **The fixtures follow the harness docs** (functional-spec.md harness facts: Claude Code 2.1.325, opencode 2.1.4), not a recorded run. The manual run on the release Mac (NFR2.5, before the release pull request) saves the real payloads of the six choice runs; they replace or confirm these fixtures. `tests/fixtures/agent-events/README.md` says so.
- **Existing fixtures** from u1 stay as they are.

## Development hook entry (for the manual run, not for the automated tests)

The automated tests need no hook installed. For a development run, the person adds this entry by hand to `.claude/settings.json`, beside u1's `PreToolUse` and `PostToolUse` entries (until u4 installs them), and starts the app with `THADEUS_AGENT_HOOKS=1 npm run dev`, adding `THADEUS_TIMING=1` for the timing log:

```text
PermissionRequest  matcher *  timeout 600  command: [ -n "$THADEUS_SESSION_DIR" ] && [ -f "$CLAUDE_PROJECT_DIR/.thadeus/hooks/dialog.sh" ] && sh "$CLAUDE_PROJECT_DIR/.thadeus/hooks/dialog.sh" permission; exit 0
```

opencode loads `.opencode/plugins/thadeus-dialog.js` from this repository by itself; its permission subscriptions need no entry.
