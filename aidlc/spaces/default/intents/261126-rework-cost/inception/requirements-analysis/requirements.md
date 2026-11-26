# Requirements — US-1301 Rework cost

## Sources

- Initial description: US-1301 story text and acceptance criteria in `docs/features/epic-13-insights.md` [desc]
- Workflow-selected scope: ultra-express [scope]
- This stage's answers: [Q1] B, a jump back throws away what it invalidated; [Q2] B, per release goes to US-1303; [Q3] B, rework inside the existing cost-per-intent chart; [Q4] A, rebuild missing windows from transcripts, labelled an estimate
- Current code: `src/main/parsers/audit.js` (`parseAudit`, `mergeAudits`), `src/main/tokenHistory.js` (`stageWindows`, `rebuildReadings`, `loadTokenHistory`), `src/main/tokenReadings.js`, `src/main/thadeusSync.js` (`mergeReadings`), `src/shared/intentArchive.js` (`isArchived`, `isFinished`), `src/renderer/CostTab.jsx`, `src/renderer/CostPanel.jsx` (`CostChart`)

## Intent

Show what AI spend produced nothing, so it can be cut: per intent, the tokens and cost of every attempt that was thrown away, with its reason and stage, and its share of the whole project's cost.

## Functional requirements

- **FR1 Attempts.** From the merged audit, every intent is split into stage attempts: a window from a stage's start (or unpark) to its approval, rejection, jump, skip, park or the workflow's end, labelled with its stage (and unit when the audit names one).
- **FR2 Thrown-away attempts.** An attempt counts as rework, with one reason:
  - FR2.1 `rejected`: its gate was rejected (`GATE_REJECTED`); the next attempt is the revision.
  - FR2.2 `loop-back`: a backward jump from build-and-test; FR2.3 `jumped back`: any other backward jump. Both throw away the attempts of every stage from the target to the source since that stage's last approval [Q1].
  - FR2.4 `redone`: a `STAGE_JUMPED` REDO throws away the stage's last attempt.
  - FR2.5 `archived unfinished`: an intent archived before it completed counts its whole cost as rework (`isArchived` and not `isFinished`).
- **FR3 Cost of an attempt.** An attempt's tokens and cost are the rise in the intent's timestamped readings across its window, over every machine's readings. Where the readings do not cover the window, it is rebuilt from the transcript calls as US-0215 does, and the figure is marked an estimate with its reason (for example "no readings before 2026-11-15") [Q4].
- **FR4 Intent cost tab.** The intent's cost tab shows a "Rework" section: the total tokens and cost, its share of the intent's cost, and one row per thrown-away attempt with stage, reason, tokens, cost and the estimate mark. With no rework it says so in one line.
- **FR5 Project overview.** The cost panel shows rework as a share of the project's total cost, and the cost-per-intent chart shows each intent's rework as its own part of the bar, in date order [Q3].
- **FR6 Per release.** Not in this story: US-1303 adds rework to its release roll-up [Q2]. The epic file says so.

## Non-functional requirements

- **NFR1** Read only: nothing is written in `aidlc/` or `.thadeus/`.
- **NFR2** The view names the cause, never a person; a rejection is shown as the workflow working.
- **NFR3** Every text goes through `t()` with the same keys in `sv.json` and `en.json`, in the LCARS look.
- **NFR4** Working out rework for an intent adds no noticeable delay to opening its cost tab (it reuses the audit and readings already loaded).
- **NFR5** TDD, with the 80% line-coverage floor kept.

## Constraints

- The ledger has no timestamps and sums attempts per stage, so it cannot split attempts; it stays the source of the intent's total.
- Rework is never larger than the intent's total cost; if the readings say otherwise, the total wins and the figure is marked an estimate.

## Assumptions

- A window's cost from readings belongs to the attempt open in that window; parallel work inside one intent (several units at once) is split evenly between the open attempts and marked an estimate. [assumption]
- No real shard has `WORKFLOW_ARCHIVED` yet, so FR2.5 is tested with fixtures. [assumption]

## Out of scope

- Rework per release (US-1303), savings hints (US-1302), quality signals (US-1305), export.

## Assumptions & Open Questions

None.
