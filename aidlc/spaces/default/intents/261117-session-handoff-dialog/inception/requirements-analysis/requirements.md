# Requirements: US-0213 + US-0026 (session handoff dialog)

## Intent analysis

Long AI-DLC intents pay for the same long context on every turn; cache reads are about two thirds of this repository's cost. AI-DLC resumes from disk, so a fresh session at a stage boundary loses nothing. The goal: the app offers, at the right moment and in one LCARS dialog, to compact or start a fresh session, and types the command for the person when the agent is idle. US-0026 fixes the same dialog at a new session: it must never be empty, and it offers `/clear` or `/clear` + resume. Both build on the US-0506 agent dialog, its hook channel and its installer.

Sources: `[desc]` the intent description; stories US-0213 (`docs/features/epic-02-cost-and-models.md`) and US-0026 (`docs/features/epic-00-fixes.md`); `[Q1]`–`[Q6]` the answers in `requirements-analysis-questions.md`; `[chat]` the person's hook notes of 2026-11-17 (Notification, SessionStart, Stop).

## Functional requirements

**FR1 Context size reporting** (US-0213 AC1, `[chat]`)
- FR1.1 Claude Code: a THADEUS `Stop` entry reports the last request's context size (input + cache read + cache write, from the transcript). It never blocks the stop.
- FR1.2 opencode: the THADEUS plugin reports the same size from the message's token usage.
- FR1.3 Claude Code: a THADEUS `Notification` entry reports that the agent is waiting for the person (idle or asking). The app uses it as one input to the idle rule (FR5).
- FR1.5 Claude Code: a THADEUS `SessionStart` entry reports each new session and its source (`startup`, `resume`, `clear`, `compact`). opencode: the plugin reports its session-created event. The app uses it to send `/aidlc --resume` as soon as the session after `/clear` is ready (FR3.2, FR3.3), to open the new-session page only when the source fits (FR3.3), and to confirm that a compaction took place (FR8.1). It adds no context: AI-DLC's own `SessionStart` entry does that (A2).
- FR1.4 All new entries install, update and remove through the US-0506 preview, next to AI-DLC's entries, which are never changed.

**FR2 When the dialog opens** (US-0213 AC2, `[Q3]`, `[Q5]`)
- FR2.1 The context passes the threshold (default 150 000 tokens).
- FR2.2 A stage completes (`STAGE_COMPLETED` in the active intent's audit).
- FR2.3 AI-DLC waits at a gate. The intent files decide: the state file shows a stage awaiting approval (`[?]`), and the latest gate event in the audit is `STAGE_AWAITING_APPROVAL`. A waiting question in the US-0506 channel only times the dialog, and never opens it alone.
- FR2.4 One dialog per stage boundary. When a gate follows a stage completion, only the gate dialog shows. A completion with no gate after it shows its own.

**FR3 The handoff page** (US-0213 AC2–AC3, US-0026 AC2–AC3, `[Q1]`, `[Q2]`, `[Q6]`)
- FR3.1 One handoff page in the agent dialog serves both stories.
- FR3.2 At the FR2 moments it offers **Compact** (sends `/compact` with the instruction in FR4), **Fresh session** (sends `/clear`, waits until the new session is ready, then sends `/aidlc --resume`) and **Not now**. At a gate, Fresh session says that AI-DLC shows the gate again in the new session.
- FR3.3 At a new session, or with a parked workflow, it offers **/clear** and **/clear + /aidlc --resume** only. There is no Compact choice, because the context is still small.
- FR3.4 It shows the context size in tokens and what one turn costs at that size: tokens × the session model's cache-read price from the US-0211 price table, labelled as an API-price estimate. A model with no price shows "price missing", never 0.
- FR3.5 opencode uses its own equivalents (`/compact`, `/new` or `/clear`) and resumes with `/aidlc --resume`. Any other harness gets no command choices.

**FR4 Compact instruction** (US-0213 AC4)
- FR4.1 The instruction keeps the current intent, stage and Unit, the open decisions and the files left to change. It drops file contents and test output.
- FR4.2 Claude Code: a THADEUS `PreCompact` entry prints the same instruction, so an automatic compaction uses it too.

**FR5 Send only when idle** (US-0213 AC5, `[Q4]`, `[chat]`)
- FR5.1 A command is sent only when no tool or dispatched agent is running, no question or permission is waiting, and the person is not typing.
- FR5.2 Typing means a key went to that agent tab in the last 5 seconds, or since the agent last stopped, whichever is later. Every key counts, Enter included.
- FR5.3 Until the agent is idle, the choice waits, and the page says it is waiting.

**FR6 Settings and repeats** (US-0213 AC6–AC7)
- FR6.1 For each project, in Configuration, the person sets the threshold and turns each of the three moments on or off.
- FR6.2 "Not now" at the threshold asks again only after another 50 000 tokens. "Not now" at a boundary asks again at the next boundary.
- FR6.3 Claude Code, optional and off by default: the app starts `claude` with `CLAUDE_CODE_AUTO_COMPACT_WINDOW` set to the threshold. No file is written for it.

**FR7 Never an empty page** (US-0026 AC1)
- FR7.1 An event with nothing to show (no text and no choices) closes its page, or closes the dialog when it was the last page. The root cause (which event opens the empty page) is found and fixed in Code Generation, with a test first.

**FR8 Visibility** (US-0213 AC8)
- FR8.1 The console logs each action with the context size before and after.

## Non-functional requirements

- NFR1 Nothing is written in `aidlc/`, and no AI-DLC hook entry is changed (US-0213 AC9).
- NFR2 Every text goes through `t()` in both `sv.json` and `en.json`. The page follows LCARS, and every choice works from the keyboard (US-0213 AC10, US-0026 AC4).
- NFR3 A hook entry never blocks or slows the agent: the `Stop`, `Notification`, `PreCompact` and `SessionStart` entries return within 2 s and exit 0 on any failure, as `dialog.sh` does.
- NFR4 Commands are sent through the existing terminal path (`TerminalContext`), with fixed command text only.
- NFR5 Tests come first (TDD). A test fails without the US-0026 fix and passes with it, and the full suite stays green.

## Constraints

- Hooks cannot run `/compact` or `/clear` themselves. Only the app's terminal can type them.
- The plan is ultra-express, so there is no design stage. The design checks in the story notes move to Code Generation (see Open questions).

## Assumptions

- A1 Claude Code's `Notification` event fires when the agent waits for input or permission. To be checked in Code Generation; if it is missing, FR5 works without it.
- A2 Re-injecting context after a compaction is already done by AI-DLC's `SessionStart` hook, so THADEUS adds no `SessionStart` entry for it (`[chat]`).
- A3 Autonomous Construction rarely goes idle, so there usually only the threshold moment applies (story note).
- A4 Desktop alerts and Slack or Discord pings stay with the existing `notify.js`. They are not part of this work (`[chat]`).

## Out of scope

- An automatic mode with no dialog.
- Slack or Discord notifications.
- Any change to AI-DLC's own hooks or files.

## Open questions (for Code Generation)

- OQ1 After `/clear`, does `/aidlc --resume` show the waiting gate again and accept the approval (AI-DLC's human-presence guard)? It is checked by hand first. A parked workflow needs an unpark first, which `/aidlc --resume` already prompts for.
- OQ2 Closed: the `SessionStart` event in FR1.5 tells the app the new session is ready (decided 2026-11-17).
