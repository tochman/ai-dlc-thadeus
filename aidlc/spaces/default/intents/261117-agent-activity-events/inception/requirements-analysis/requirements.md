# Requirements: US-0214 (agent activity from hook events, legend toggles)

## Intent analysis

The token view's Agent progress often shows nothing while work is running. In the screenshot of 2026-11-17 22:33, a dispatched developer agent had run for 18 minutes while the view said "No agents are working". Today the rows come from audit events and the inflight file. That misses the main chat, and it misses agents the audit does not log. The goal is to show the main chat and every dispatched agent, each with what it is doing now, from the hook events both harnesses send. A second goal is to let the person read the token diagrams by hiding series from the legend.

Sources:
- `[desc]` the intent description;
- the US-0214 story and its Notes, which hold the checked event tables (`docs/features/epic-02-cost-and-models.md`);
- `[Q1]`–`[Q5]`, the answers in `requirements-analysis-questions.md`;
- US-0213, which supplies the hook kinds, the channel and the per-session signals this work builds on.

## Functional requirements

**FR1 Activity hooks (report-only)** (story AC5, `[Q5]`)
- FR1.1 **Claude Code:** THADEUS entries report `PreToolUse` and `PostToolUse`/`PostToolUseFailure` for every tool, plus `SubagentStart`, `SubagentStop`, `UserPromptSubmit`, `MessageDisplay`, `StopFailure` and `PermissionRequest`. US-0213's kinds (`Stop`, `Notification`, `SessionStart`) are reused. Every one of these entries is `async`. The existing synchronous `AskUserQuestion` and `PermissionRequest` waiting entries stay as they are.
- FR1.2 **opencode:** the plugin reports `session.tool.*`, `session.text.*`, `session.reasoning.*`, `session.status`, `permission.asked`, `form.created`, `session.execution.failed`/`interrupted` and `session.created` (with `parentID`). Handlers are fire-and-forget.
- FR1.3 They install, update and remove through the US-0506 preview. An install from v0.2.8 or from the US-0213 release reads as out of date. AI-DLC's entries are never changed.

**FR2 Who is working** (story AC1, AC2, AC4, `[Q4]`)
- FR2.1 Each agent tab's main chat has its own "Main" row, labelled with its harness, whenever it has activity for the project.
- FR2.2 Each dispatched agent has a row under the main chat that started it, with its agent type. Claude Code tells them apart by `agent_id`; opencode by `parentID`.
- FR2.3 A row appears within 2 seconds of the agent's start and goes within 2 seconds of its end. The screenshot case, a developer agent running while the view says none, is a test.
- FR2.4 "No agents are working" shows only when no main chat and no agent is active.

**FR3 What each row is doing** (story AC3, `[Q2]`, `[Q3]`)
- FR3.1 A row shows one state: running a tool (with its name), writing, thinking (opencode only), waiting for me, idle, or stopped on an error (with its reason).
- FR3.2 Each row shows how long it has been in its current state. There is no history list.
- FR3.3 Precedence when several signals are live: error > waiting for me > running a tool > writing or thinking > idle.

**FR4 Missing or old hooks** (story AC6)
- FR4.1 When the app's hooks are missing or out of date, Agent progress says so and offers the update. It falls back to today's audit-based rows and never shows "No agents are working" as if that were known.

**FR5 Legend toggles** (story AC legend criteria, `[Q1]`)
- FR5.1 Every token-view diagram with more than one series (tokens over time, the rate, and the splits by stage, agent and model) lets the person hide or show a series by clicking its legend entry, or by pressing Enter or Space on it.
- FR5.2 The y-axis rescales to the series still shown. The last shown series cannot be hidden.
- FR5.3 The hover box and the Table view show only the series that are shown.
- FR5.4 The choice is remembered per project and diagram while the app runs.

## Non-functional requirements

- NFR1 A hook never blocks or slows the agent: the activity entries are `async` and exit 0 on any failure. The opencode handlers never await the channel.
- NFR2 Nothing is written in `aidlc/`. Agent text is never shown as activity: only tool names, states and error types.
- NFR3 Legend entries are buttons with `aria-pressed`. A series always keeps its text label, so colour is never the only sign. Every text goes through `t()` in Swedish and English, in the LCARS look.
- NFR4 TDD. The full suite stays green, and line coverage stays at or above 80%.

## Constraints

- It builds on US-0213's channel, signals and installer (`src/main/agentEvents.js`, `agentAdapters.js`, `agentHooks.js`, `dialog.sh`, the opencode plugin).
- The plan is ultra-express: no design stage. The root cause of today's missed rows is found in Code Generation, test first.

## Assumptions

- A1 A session belongs to the project whose agent tab runs it. The activity is shown for the project's active intent.
- A2 Claude Code's docs do not say whether `MessageDisplay`, `Notification` or `StopFailure` fire inside subagents. Where they don't, a subagent row shows "working" from its tool events and goes when `SubagentStop` arrives.
- A3 An interrupt by the person (Esc) sends no `Stop`. The row turns idle at the next `UserPromptSubmit`, or after 30 s with no event.

## Out of scope

- Tool history, timelines and per-tool cost.
- A compare view across intents (US-0215 and later).

## Open questions (for Code Generation)

- OQ1 Why did today's reading miss the running developer agent? Find out first and keep a regression test for it.
