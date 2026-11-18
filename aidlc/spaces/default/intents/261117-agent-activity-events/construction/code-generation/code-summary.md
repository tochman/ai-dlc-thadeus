# Code Summary: US-0214 (agent activity from hook events, legend toggles)

## Files

- **New:** `src/shared/agentActivity.js` (pure reducer: one row per main chat and per dispatched agent, state precedence, time in state), `tests/main/agentActivity.test.js`, `tests/renderer/AgentProgress.test.jsx`.
- **Hooks:** `.thadeus/hooks/dialog.sh` (nine report-only `activity` kinds, bounded stdin copy, never waits), `src/main/agentHooks.js` (async entries, `US-0213` added to `RELEASES`), `.opencode/plugins/thadeus-dialog.js` (V2 events to `activity`, names in `OC`).
- **Main:** `src/main/agentAdapters.js`, `src/main/agentEvents.js`, `src/main/ipc.js` (`agent:activity` push), `src/main/agentProgress.js` and `src/main/parsers/agentProgress.js` (hook rows first, audit fallback; missed-agent root cause fixed), `src/preload/index.js`.
- **Renderer:** `src/renderer/AgentProgress.jsx`, `src/renderer/TokenDetail.jsx`, `src/renderer/tokenChart.js`, `src/renderer/theme.css`, keys in `sv.json` and `en.json`.
- **Tests extended:** `agentAdapters`, `agentEvents`, `agentHooks`, `agentProgress`, `dialogScript`, `opencodePlugin`, `tokenChart`, `TokenDetail`, plus the `tests/fixtures/agent-hooks/*.json` fixtures.

## Key decisions

- Activity is a pure reducer in `src/shared/`, so main and tests share one model; only tool names, states and error types reach a row (NFR2).
- opencode `permission.asked` and `form.created` write their waiting event first, then the `activity` event.
- `ponytail:` every opencode text/reasoning delta writes its own event file; batch them if a long reply writes too many.

## Tests

TDD per step. Targeted run (`unit-test-instructions.md` § This work's tests): 15 files, 412 tests, 0 failures.

## Not executed in this stage

- Full suite, ESLint, Prettier and the 80% coverage check: left for Build and Test (coverage tooling is not set up in the repo yet).
- The built `.dmg` and live hooks in a real Claude Code / opencode session: manual check before release.

## Deviations from the plan

- `dialog.sh` and `thadeus-dialog.js` held an older copy (identical to `53c397c`, likely overwritten by an installed older app's "update hooks"); the build started from the HEAD versions. The old content is recoverable with `git show 53c397c:<path>`.
- One existing opencode test (SCD7, three `permission.asked` in one millisecond) was narrowed to count `permission` events only, since Step 5 adds `activity` events beside them. Its checks are unchanged.
- Loop-back 1 from Build and Test (Step 10): 8 older tests in `tests/main/opencodePluginReply.test.js` (7) and `tests/main/dialogScriptReply.test.js` (test 8) still expected the behaviour from before Steps 4–5. They now ignore the new `activity` events and match the new `case $kind in … | activity)` line, keeping all their checks. Full suite: 1874 of 1874 tests pass.
- The plan's Step 9 tick predated `code-summary.md` and `traceability.json`; both are written now.
