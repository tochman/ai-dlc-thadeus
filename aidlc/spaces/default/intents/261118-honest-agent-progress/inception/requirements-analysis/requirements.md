# Requirements: US-0030 honest agent progress

Source story: US-0030 in `docs/features/epic-00-fixes.md` (EPIC-00, v0.2.10, High). Causes from the code scan: `inception/reverse-engineering/developer-scan.md`, Handoff Summary. Answers: `requirements-analysis-questions.md` (Q1–Q3).

## Intent analysis

While agents work, the person reads Agent progress in the token view instead of the terminal. On 2026-11-18 it showed things that were not true ("Main — waiting for your permission (5 min)" with no prompt open), and less than Claude Code's own status line (no task, only "running Bash", no step count). The goal is that every row is true now, says what the agent is doing in words, and admits when its information is old.

## Functional requirements

**FR1 — Permission state is true** (story AC1, Q3)
- FR1.1 A permission request is shown on the row of the agent that asked (by its agent id); a request with no agent id is the main row's.
- FR1.2 While a background agent waits for permission, the main row shows "waiting for <agent>", not "waiting for your permission".
- FR1.3 A permission state clears when the request is answered (in the app or the terminal), or when the next event for that agent arrives.
- FR1.4 While main waits for a background agent with no permission request open, the main row never says it is waiting for the person's permission.

**FR2 — The task is shown** (story AC2, Q1)
- FR2.1 When an agent is started with a task description (the Agent tool's `description`), its row shows that task next to the agent's name.
- FR2.2 With no task description known, the row shows the agent's name only, as today.

**FR3 — Step count is shown with hook rows** (story AC3)
- FR3.1 When the live hook rows are shown, a row working through a plan with checkboxes, Unit or stage level (zero-Unit), shows "step n of m" from the ticked steps, as the audit rows do today (US-0507).
- FR3.2 A row whose agent has no plan shows no step count.

**FR4 — The activity is said in words** (story AC4, Q1)
- FR4.1 When a tool call carries a description (for example "Rerunning view tests after fixing expectation"), the row shows it instead of "running <tool>".
- FR4.2 With no description, the row falls back to "running <tool>".

**FR5 — Old states say they are old** (story AC5, Q2)
- FR5.1 A row with no new event for 30 seconds shows how long ago it was last seen ("seen 2 min ago"), whatever its state, waiting states included.
- FR5.2 A new event for the row removes the note.

## Non-functional requirements

- **NFR1 — Bounded agent text** (Q1; relaxes US-0214's "identifiers only" on purpose): the task and activity texts are cut to one line of at most 80 characters, with control characters removed and paths outside the project hidden, through `src/shared/agentText.js`. Nothing else from an agent's payload reaches a row. The adapter tests' identifier-only assertions change to match.
- **NFR2 — Language and look**: every text goes through `t()` with the same keys in `sv.json` and `en.json`, in the LCARS look; a state is never shown by colour alone.
- **NFR3 — Timing**: a row reflects a new event within 250 ms, as the `agent:activity` push does today, and the "seen ago" note updates at least every 10 seconds.
- **NFR4 — Tests**: for each FR, a test fails without the fix and passes with it (TDD); the existing suite stays green; coverage stays at or above 80%.

## Constraints

- No change to `.thadeus/hooks/dialog.sh` is needed: it already passes the whole payload; filtering happens in `src/main/agentAdapters.js`.
- Claude Code is the harness that must work; opencode's field names are unverified (`agentAdapters.js:320`) and keep today's behaviour if absent.

## Assumptions

- [assumption] Claude Code's SubagentStart payload may not carry the task description or the parent `tool_use_id`. If it does not, the task is taken from the main agent's PreToolUse of the Agent tool and paired with the next SubagentStart of the same agent type, in order. To be checked against a real payload in Code Generation.
- [assumption] An answer given in the terminal reaches the app as the next hook event (PostToolUse or another), which clears the wait under FR1.3.

## Out of scope

- Agent text beyond the two bounded fields (prompts, tool output, file contents).
- Changing the audit-based rows used when hooks are not installed or out of date.
- New harnesses beyond Claude Code and opencode.

## Open questions

None.
