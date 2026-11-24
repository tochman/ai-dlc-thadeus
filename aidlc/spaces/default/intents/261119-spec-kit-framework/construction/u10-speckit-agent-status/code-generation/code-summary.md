# Code Summary: U10 u10-speckit-agent-status (US-1410)

## Files

Created:
- `src/renderer/SpeckitProgress.jsx`: the LCARS readout (C9) at the top of the Specs view.
- `tests/main/agentProgressSpeckit.test.js`, `tests/main/agentProgressSpeckitTimed.test.js`, `tests/renderer/SpeckitProgress.test.jsx`.

Modified:
- `src/main/agentProgress.js`: `waitingFrom(events)` and `loadSpeckitProgress(root, events, { loadFeatures })`.
- `src/main/ipc.js`: `agents:progress` gives C9 for a Spec Kit project (any dir name is ignored) or when no dir name is given. Otherwise it keeps today's AI-DLC rows.
- `src/preload/index.js`: a comment only.
- `src/renderer/SpeckitShell.jsx`: mounts the readout above `SpeckitFeatures`.
- `src/renderer/AgentDialog.jsx`: the `agent-dialog-source-hooks` note on hook question and permission pages.
- `src/renderer/theme.css`: `.speckit-progress*` and `.agent-dialog-source`.
- `src/shared/locales/{sv,en}.json`: the `speckit.progress.*` keys and `agentDialog.sourceHooks`.
- `vitest.config.mjs`: the timed file is added to `TIMED`.
- `tests/main/ipc.test.js`, `tests/renderer/SpeckitShell.test.jsx`, `tests/renderer/AgentDialog.test.jsx`: new cases. The projectService mock gains `loadAuditEvents`, `inflightCount` and `workingAgents`.
- `docs/FEATURES.md`, `docs/features/epic-14-spec-kit.md`: US-1410 set to 🚧 In progress.

## Key decisions

- `agent` is the harness label, and a permission's `question` is its tool name only (`permission.what`), as the plan says.
- The question text is the header, or else the first non-empty line of the body. It is trimmed and cut to 200 code points. Rows whose id starts with `audit-`, and handoff pages, are left out.
- The readout sends its text through `t()` with ICU values and renders it as plain text nodes. A `<script>` shows as text.
- `agentEvents?.onChanged` is optional in the readout, so a host without the agent bridge (for example the ProjectView test's stub) still renders.

## Tests (TDD: each Red was recorded before its Green)

| Command | Result |
|---|---|
| `npx vitest run --project main tests/main/agentProgressSpeckit.test.js tests/main/ipc.test.js tests/main/i18nKeys.test.js` | 3 files, 107 passed |
| `npx vitest run --project scripts tests/main/agentProgressSpeckitTimed.test.js` | 1 file, 1 passed |
| `npx vitest run --project renderer tests/renderer/SpeckitProgress.test.jsx tests/renderer/AgentDialog.test.jsx tests/renderer/SpeckitShell.test.jsx` | 3 files, 88 passed |

New tests: 11 main logic, 5 IPC, 1 timed, 10 readout, 2 popup notes and 1 shell placement, 30 in all. ESLint and Prettier pass on every changed file.

Not run here: the full suite and its coverage (Build and Test runs them). `tests/renderer/ProjectView.test.jsx` was not run either. It renders `SpeckitShell`, and its bridge has no `getAgentProgress`, so the readout shows its failed state there. It should stay green, but this has not been checked.

## Deviations from the plan

- `loadSpeckitProgress` uses one `try/catch` around the features read, not `Promise.allSettled` over two parts. The waiting part is pure and in memory, so a second settled branch could never run and would have stayed untested. The behaviour is the same: a failed feature read gives `feature: null` and a `console.warn`, and the call never rejects.
- The readout has two effects, not one. One effect subscribes to the two pushes per project id. The other makes the call per project id and refresh counter, with one "again" flag. This way the listeners are not set up again on every refresh.
- There are two popup-note tests (a question page and a permission page), where the plan said one.
