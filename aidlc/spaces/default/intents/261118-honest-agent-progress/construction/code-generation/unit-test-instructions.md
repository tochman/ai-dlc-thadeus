# Unit Test Instructions: US-0030 honest agent progress

## Framework

vitest 5.1.0, already configured in the repository with two projects: `main` (node, `tests/main/**/*.test.js`) and `renderer` (jsdom, `tests/renderer/**/*.test.jsx`, Swedish locale). No setup beyond `npm ci`.

## Commands (this work only)

Runnable before the first Red step (Step 2 checks it green):

```bash
npx vitest run tests/main/agentActivity.test.js tests/main/agentAdapters.test.js tests/main/agentEvents.test.js tests/renderer/AgentProgress.test.jsx
```

Locale keys (after Step 7):

```bash
npx vitest run tests/main/i18nKeys.test.js
```

## Expected coverage

About 12 new tests, one per requirement (FR1.1–FR5.2, NFR1, NFR3). The project floor is 80% line coverage; Build and Test checks it on the full suite (`npx vitest run tests/ --coverage`), not here.

## Mocking and test data

- Adapter tests: build Claude Code hook payloads as plain objects (`hook_event_name`, `tool_name`, `tool_input.description`, `agent_id`, `agent_type`, `tool_use_id`), as the existing adapter tests do.
- Activity model tests: feed events with fixed `atMs` values; no timers. Staleness is tested by passing a `nowMs` to `view()`.
- Renderer tests: render `AgentProgress` with row props and the existing `t()` setup; use `vi.useFakeTimers()` for the 10 s tick.
- No files written outside `tests/.tmp/`; no network.
