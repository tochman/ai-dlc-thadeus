# Requirements: Release v0.2.14 (EPIC-00 fixes)

## Intent analysis

Fixes found while using v0.2.13, as four small stories from `docs/releases/0.2.14.md`, each its own Unit, `fix/US-00xx` branch and pull request, built in the release's order: US-0038, US-0039, US-0037, US-0040. Test first for each. The full acceptance criteria stay in `docs/features/epic-00-fixes.md`; this document adds the decisions from the questions (`[Qn]`) and gives each criterion a stable ID. [desc]

Sources: Initial description: the workflow's request [desc]; the stories in `docs/features/epic-00-fixes.md`; answers in `requirements-analysis-questions.md` [Q1]–[Q3].

## Functional requirements

### FR1: US-0038, an old planning commit never blocks the planning sync
- **FR1.1** When a commit on `dash/planning` conflicts with the target on a file the target changed after that commit was made, later pushes are not all stopped: the app offers "Keep theirs" for that file (dropping its change), and everything else is pushed.
- **FR1.2** A waiting entry or app commit for a release plan whose release is tagged on the target is dropped by the app, with a log line saying why, without offering "Use mine".
- **FR1.3** When an entry's text changed several times before its commit, the commit subject names only the stories its final change is about (US-0033 still holds).
- **FR1.4** While the push is blocked, the Planning sync row names the blocking commit or entry and what to choose.

### FR2: US-0039, Fresh session and Compact act now, or ask AI-DLC to park
- **FR2.1** At a gate (AI-DLC's question is open), Fresh session hands the open question back, then types `/clear` and, once the new session has started, `/aidlc --resume`, without waiting for idle.
- **FR2.2** While the agent works, Fresh session types one line into the session asking AI-DLC to park at its next safe point (`aidlc engine orchestrate park --person-asked`) and end its turn. The page says that the request was sent. When the agent stops, the app types `/clear` and `/aidlc --resume`.
- **FR2.3** While the agent works, Compact sends the same park request; when the agent stops, the app types `/compact <instruction>` and then `/aidlc --resume`. [Q1]
- **FR2.4** When the agent is already idle, the choice is typed at once, as today.
- **FR2.5** When the agent never stops within the existing wait limit, nothing more is typed and the page says so (as today's `notIdle`).

### FR3: US-0037, the intent head shows one clear control per state
- **FR3.1** The active intent, in flight and not parked, shows Resume and Park side by side, the same height, aligned, with padding around their labels.
- **FR3.2** A parked intent shows the parked state once, as an LCARS element, and one action, "Unpark and resume at <stage>". There is no separate Unpark button. [Q2]
- **FR3.3** For a parked intent, the progress row says it is parked at its stage, not "In progress".
- **FR3.4** The step shows once, in the progress row; the resume button names only the stage. The sidebar's stage count is labelled as done stages.
- **FR3.5** The sidebar's cost fits its column at its normal size, without wrapping into large lines.
- **FR3.6** In a narrow window the head wraps cleanly, with Park next to Resume.

### FR4: US-0040, the intent list puts open work first
- **FR4.1** Sorted by date, intents in flight or parked come first, the active one at the top, then the finished ones; each group newest first by creation time.
- **FR4.2** Creation time is the time in the intent's `uuid` (UUID v7); two intents from the same day sort by it, whatever their names.
- **FR4.3** An intent with no `uuid` (on disk, not in `intents.json`) sorts by its folder date, after the same day's indexed intents.
- **FR4.4** Sorting by cost and by name is unchanged. No new sort option is added. [Q3]

## Non-functional requirements

- **NFR1** Every new user-facing text goes through `t()`, with the same keys in `sv.json` and `en.json`.
- **NFR2** All UI follows the LCARS interface.
- **NFR3** Each story has a test that fails without its fix and passes with it; the full suite, ESLint and Prettier stay green, and line coverage stays at or above 80%.
- **NFR4** Commands typed into an agent session are fixed text per harness; only the existing compact instruction is filled in (US-0213 NFR4).

## Constraints

- One Unit, branch and squash-merged pull request per story (team Way of Working). When two stories are open from the same `main`, the later branch merges `main` and reruns the suite before its Build and Test is approved (project rule).
- US-0037 and US-0040 both touch the intents view; US-0040 is built after US-0037.

## Assumptions

- Claude Code accepts a line typed while the agent is working and delivers it to the running turn, so the park request in FR2.2 reaches AI-DLC. [assumption] Reason: the app already types answers into busy sessions; Code Generation checks it against opencode too.
- Handing back the gate question (FR2.1) uses the existing close path, which already returns an empty answer to the waiting hook. [assumption]

## Out of scope

- A hard interrupt (Esc) mid-turn: it can cut a file write short.
- A "Last activity" sort. [Q3]
- Docs-only stories; none are in v0.2.14.

## Open questions

None.
