# Requirements: US-0303 Project velocity

## Intent Analysis

The developer or team lead wants to see how fast work moves and where it waits: per intent, per story and for the whole project. Every number is computed from the AI-DLC records and the feature docs that the app already reads. The goal is insight, not reporting: a number the records cannot support is named as missing, never shown as zero. Source: US-0303 in `docs/features/epic-03-audit-timeline.md`; the choices come from the questions file (Q1–Q6).

## Functional Requirements

### FR1 Intent metrics (from the intent's merged audit shards and `aidlc-state.md`)
- **FR1.1** Total time from `WORKFLOW_STARTED` to `WORKFLOW_COMPLETED`. Time between `WORKFLOW_PARKED` and `WORKFLOW_UNPARKED` is left out of the active time and shown as its own "parked" figure (Q2).
- **FR1.2** Time per phase (`PHASE_STARTED` → `PHASE_COMPLETED`/`PHASE_SKIPPED`) and per stage (`STAGE_STARTED` → `STAGE_COMPLETED`/`STAGE_SKIPPED`). These come from the audit, not `runtime-graph.json`, so every clone shows them.
- **FR1.3** Waiting time at the person's approvals: from `STAGE_AWAITING_APPROVAL` to `GATE_APPROVED`/`GATE_REJECTED`, plus Code Generation plan approvals (`PLAN_APPROVAL_*`). Both are summed into one figure per stage and per intent (Q3).
- **FR1.4** Review rounds per stage: the count of `REVIEW_COMPLETED` events per stage, plus the count of `GATE_REJECTED` events per stage.
- **FR1.5** Shown as a "Velocity" tab in the intent detail (Q1).

### FR2 Story metrics (from the feature docs, intents and git)
- **FR2.1** A story's 🚧 start is the start of the earliest intent whose description or label names the story ID. Its ✅ time is the date of the first commit on `main` whose epic file shows the story ✅. Its "Released" time is the creation date of the tag `vX.Y.Z` it names (Q4).
- **FR2.2** When no intent names the story, 🚧 falls back to the first commit on `main` that shows 🚧. A span of zero, or one with no source at all, is shown as "unknown", never as 0.
- **FR2.3** Stories delivered per release: the stories marked "Released in vX.Y.Z", grouped by release.
- **FR2.4** The git history is read with a fixed `git log` over the epic files (no shell, values through `safeArg`).

### FR3 Project metrics
- **FR3.1** Intents and stories finished per week and per month. Weeks are ISO weeks in local time.
- **FR3.2** Average length of the finished intents (active time per FR1.1).
- **FR3.3** The trend as a bar chart per week or per month (switchable) of finished intents and stories, with the average intent length as a line (Q5).
- **FR3.4** Every intent in the active space is counted, archived ones included (Q6).
- **FR3.5** Shown as a new project view "Velocity" with its own LCARS arm block (Q1).

### FR4 Honest numbers
- **FR4.1** An intent that is still running, or never finished, shows its numbers so far, marked "not finished", and is left out of the finished counts and the averages.
- **FR4.2** A missing or unreadable record (no audit folder, a read error, a missing epic file, git unavailable) is named in the view with its path. It is never counted as zero. The loader keeps "missing" apart from "empty".
- **FR4.3** The view lists which records it used: the number of intents and audit shards, the epic files, and the git range.
- **FR4.4** Every number is computed. None is typed in or stored.

## Non-Functional Requirements

- **NFR1** i18n: every text goes through `t()` with ICU placeholders, with the same keys in `sv.json` and `en.json` (`tests/main/i18nKeys.test.js`).
- **NFR2** LCARS look: built with the `Lcars.jsx` primitives and `theme.css` tokens, tooltips only through `Tooltip.jsx`, and status never shown by colour alone.
- **NFR3** Performance: for a project with 100 intents and 20 000 audit events, the project view's metrics load in under 1 s after the cached event read. Live updates reuse the existing `project:changed` debounce.
- **NFR4** Read-only and root-confined: no writes, and every path goes through `resolveInRoot`.
- **NFR5** Testability: the metric calculations are pure functions in `src/main/parsers/`, unit-tested in node (TDD, team rule). The view is tested in jsdom.

## Constraints

- Electron + React 19; no new dependency unless the plan justifies one. Charts are plain SVG or the already installed `@visx/*`.
- Fixed git commands only (`git.js`).
- Follows the team's TDD and coverage rules and ships on `feat/US-0303`.

## Assumptions

- An intent "names" a story when its project description or folder label contains the story ID (for example `US-0303`). Rationale: this is how stories are started today.
- An intent is finished when it has `WORKFLOW_COMPLETED`, or its state says the workflow is complete.
- An archived intent that never finished counts as not finished (FR4.1), not as finished.
- A stage with no `STAGE_COMPLETED` (for example a jump) is shown as open, not given a guessed end.

## Out of Scope

- Cost per run beside velocity (US-0201 already shows cost; this story only places velocity next to it).
- Exporting the metrics, setting targets, and comparisons across projects or spaces.
- Editing any record.

## Open Questions

None.
