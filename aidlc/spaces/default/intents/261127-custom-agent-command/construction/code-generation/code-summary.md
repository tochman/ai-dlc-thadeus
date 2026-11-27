# Code Summary: US-0806 custom agent command per project

## Files changed

- `src/shared/harnesses.js`: all six harnesses selectable; `cli` for Cursor (`cursor-agent`) and Copilot (`copilot`); `defaultAgentCommand(id)`, `checkAgentCommand(text)` (`{ok, command}` or `{ok:false, reason}`: `empty`, `tooLong`, `lineBreak`, `control`, `char`), `AGENT_COMMAND_MAX = 500`.
- `src/main/settings.js`: `agentCommands` per project; invalid or unknown entries dropped on read; a save with one is refused with `errors.agentCommand.<reason>` and nothing is saved; merged per harness; `null` clears.
- `src/main/pty.js`: `spawnSession` takes `command` and checks it again before node-pty loads; `agentCommandFound(word, root)` runs one login-shell `command -v -- "$p"` with the word as a positional argument (a leading `~/` expanded by hand).
- `src/main/ipc.js`: `pty:spawn` reads `agentCommands[harness]` in main, checks its first word once and returns `{ notFound: word }` without starting anything when it is missing; `projectSettings:set` passes `agentCommands` on.
- `src/renderer/ProjectSettingsView.jsx`: all six choices; a command field per chosen harness and tab, prefilled; only changes saved; empty or default saves `null`; main's refusal shown.
- `src/renderer/TerminalPanel.jsx`: not-found sentence, open-settings button and Restart; quick commands shown disabled with the reason for a harness without AI-DLC commands.
- `src/renderer/ProjectView.jsx`: `harnessProblem` takes the saved command, so a missing table CLI no longer blocks a tab with its own command.
- `src/renderer/SetupAidlc.jsx`: dead "files only" note removed.
- `src/shared/locales/{sv,en}.json`: new keys for the field, refusal reasons, not found and the button; three unused keys removed.
- Tests: `tests/main/{harness,settings,pty,ipc}.test.js`, `tests/renderer/{ProjectSettingsView,TerminalPanel,terminalControl,ProjectView,SetupAidlc}.test.jsx`.

## Decisions

- The not-found check lives in `pty.js` and uses the already-read PATH, so a tab start costs one login-shell run (NFR3); any failure or timeout counts as not found.
- `ponytail:` a first word `~user/...` is not expanded and counts as not found.
- The open-settings button reuses ProjectView's `onChooseHarness`, which already opens Configuration › Agent.

## Tests

Scoped run: 8 files, 271 tests passed (246 before). 16 further harness-dependent test files: 337 passed. ESLint and Prettier clean on the changed files. TDD Red runs recorded per layer; `harnessProblem`'s Red was shown after the fix by setting it aside, not test first.

Not run in this stage: the full suite with coverage (80% floor) and the built-app Playwright tests; Build and Test and CI run them.

## Deviations from the plan

- `App.jsx` unchanged: the opener already reaches the terminal panel through ProjectView.
- `ProjectView.jsx` and `SetupAidlc.jsx` changed (not listed in the plan), for the reasons above.
- Existing tests that used `codex` as an invalid harness now use `bogus`.
- Detection now probes `cursor-agent` and `copilot --version` when a project opens.
- Step 13 needed no edit: US-0806 was already 🚧 In progress for v0.3.2.
