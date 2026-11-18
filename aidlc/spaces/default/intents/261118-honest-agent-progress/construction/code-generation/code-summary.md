# Code Summary: US-0030 honest agent progress

Zero-Unit express work on branch `fix/US-0030`. TDD: each layer went Red, then Green, then Refactor.

## Files modified

| File | Change |
|------|--------|
| `src/main/agentAdapters.js` | `agentLine()` (NFR1): `stripUnsafe` to one line, absolute paths inside `cwd` made relative and all others shown as `…`, then `cutGraphemes` to 80 characters including the `…`. `claudeToolStart()` gives `detail` (the tool input's `description`). For `Agent`/`Task` it also gives `task` and `taskType` (`subagent_type`). `parseClaudePermission` gives `agentId`/`agentType` (FR1.1). |
| `src/shared/agentActivity.js` | `STALE_MS = 30000`. Tool entries carry `detail`. Each session has a `tasks` queue: an Agent call's task waits there until an agent of the same type starts, and its tool end drops it (FR2.1). Main shows `waiting` with reason `agent` and `waitingFor` while one of its agents waits, unless main has an error or a wait of its own (FR1.2, FR1.4). Rows also give `task`, `detail`, `waitingFor`, `lastMs` and `stale` (FR5). |
| `src/main/agentEvents.js` | The `permission` kind feeds the wait with the asking agent's id. The `permission_prompt` Notification is no longer read as main's own wait (FR1.4). The event keeps `agentId`, which is main-only and not in `PUBLIC`. A permission answered in the app feeds `answered` to the row that asked (FR1.3). `feedFields()` was split out of `feedActivity()`. |
| `src/renderer/AgentProgress.jsx` | Shows the task (`agent-progress-task`). Shows the tool call's description instead of "running <tool>". Shows "waiting for <agent>". `stepsOf()` joins an agent hook row to the one audit build row of the same agent (`agent-progress-steps`, FR3). Shows "seen N ago" from `lastMs` on the existing 1 s clock (`agent-progress-seen`, FR5.1, NFR3). |
| `src/shared/locales/{sv,en}.json` | New keys `tokenDetail.progress.seen` and `tokenDetail.progress.state.waiting.agent`. The step count reuses `tokenDetail.progress.steps`. |
| Tests | `tests/main/agentAdapters.test.js` (+5), `tests/main/agentActivity.test.js` (+6), `tests/main/agentEvents.test.js` (+2), `tests/renderer/AgentProgress.test.jsx` (+5). |

## Key decisions

- Matching a task to its agent is by type and in order, because there is no parent tool id (see Step 9). An Agent call with no `subagent_type` counts as `general-purpose`. If there is no match, the row shows no task (FR2.2), which is better than a wrong one. This is also why a task is dropped at its Agent call's tool end.
- Main's "waiting for <agent>" is worked out when the rows are built, not stored. It clears as soon as the agent's own wait clears.
- `stale` is computed on the renderer's own clock from `lastMs`, so it does not depend on main's pushes. Main's `stale` field is a snapshot.
- The step count is matched by agent name only, because hook rows carry no stage or Unit. A Unit build row names no agent, so it counts as the developer's. When the same agent has two builds, no count is shown. This shortcut is marked with a `ponytail:` comment.
- The old ticker (1 s) already meets "updates at least every 10 s", so no new timer was added.

## Test summary

- Baseline (Step 2), the 4 targeted files: 4 files, 112 passed.
- Business logic Red (Step 3), the 3 main files: 12 failed, 107 passed. The test "no description gives no detail" (FR4.2) already passed, as expected.
- Frontend Red (Step 6): 5 failed, 6 passed.
- After Green and Refactor: `npx vitest run tests/main/agentActivity.test.js tests/main/agentAdapters.test.js tests/main/agentEvents.test.js tests/renderer/AgentProgress.test.jsx tests/main/i18nKeys.test.js` gave 5 files, 134 passed. With `agentPermissions`, `agentPermissionAdapter` and `TokenDetail` added: 8 files, 273 passed.
- ESLint: clean on the changed files. Prettier: clean after `--write` on the 5 files whose new lines needed it.

## Tests written but not run

- The full suite (`npx vitest run tests/ --coverage`) was not run, because the brief says targeted tests only. Build and Test runs it and checks the 80% floor.

## Deviations from the plan

- No `tool_use_id` matching: SubagentStart has no parent id to match on (Step 9).
- `traceability.json` was not written, as the brief instructs (the conductor writes it).
- Change in scope: the `permission_prompt` Notification no longer marks main as waiting. It has the same cause as FR1.4: it carries no agent id and only repeats the PermissionRequest's wait.

## Step 9: real payload finding

There is no real SubagentStart or PreToolUse(Agent) payload on disk. The app deletes each event file after reading it, and this session's channel folder (`~/Library/Application Support/aidlc-dash/agent-channel/<id>`) no longer exists. The fixtures under `tests/fixtures/agent-events/claude/` have no activity payloads. According to Claude Code's hook reference, SubagentStart carries `agent_id` and `agent_type`, with no task description and no parent `tool_use_id`. PreToolUse for the Agent tool carries `tool_input.description` and `subagent_type`. So the assumption on matching by type and order still stands but has not been checked against a real payload. The manual check is still owed: two agents of the same type started in parallel should each show their own task.
