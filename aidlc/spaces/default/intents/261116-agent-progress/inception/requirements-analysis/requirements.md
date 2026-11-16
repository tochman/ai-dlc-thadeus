# Requirements: US-0507 See what the agents are doing and how far they have come

Intent `261116-agent-progress`, express, for v0.2.8. Sources: the story in `docs/features/epic-05-workflow-control.md`, the answers in `requirements-analysis-questions.md`, and the code knowledge base in `aidlc/spaces/default/codekb/aidlc-dash/`.

## Intent analysis

While AI-DLC agents work in the background, the person cannot tell what is happening or how far it has come. They want plain progress lines per running agent, for example "u2-permissions has 6 of 27 steps done and u3-replies has 16 of 42". The progress goes into the existing token detail view (`TokenDetail.jsx`, opened from the small token chart, titled "Tokens · <intent>") as a section of its own. No new view is added. Type: enhancement, two layers (main-process readers, renderer view). Complexity: medium.

## Functional requirements

**FR1 Agent progress section in the token detail view**
- FR1.1 The token detail view has an agent progress section, always shown, for the intent the view is open for.
- FR1.2 Each running piece of agent work gets one row: a Unit's build, a build with no Unit (a single Code Generation), a reviewer, or a design builder.
- FR1.3 Each row shows what it is (the Unit name, or the stage when there is no Unit), its stage, and how long it has run.
- FR1.4 When nothing is running, the section says so in one sentence.

**FR2 Build progress**
- FR2.1 A build row shows steps done out of the plan's steps, counted from the `- [x]` and `- [ ]` lines of that build's `code-generation-plan.md`: in the Unit's worktree for a Unit, in the intent record when there is no Unit.
- FR2.2 A build row shows the subject of the last commit on that build's branch.

**FR3 Review progress**
- FR3.1 A review row shows "review requested" until a verdict exists.
- FR3.2 Then it shows the verdict (`READY` or `NOT-READY`) and the number of findings per severity, read from the review records.

**FR4 Summary sentence**
- FR4.1 One sentence at the top of the section sums up the running work in words, for example "The builds are moving along: u2-permissions has 6 of 27 steps done and u3-replies has 16 of 42."
- FR4.2 Every number in it is computed from the records, never typed in.

**FR5 Live updates and finished work**
- FR5.1 The section updates when the audit log, the runtime graph, a plan file or a review record changes.
- FR5.2 A finished piece of work shows its result (for example "27 of 27 steps, done" or "READY, 0 findings") for about a minute, then its row drops off.
- FR5.3 A worktree, plan or review record that cannot be read is named in its row, never shown as 0.

**FR6 Running Units are recognised**
- FR6.1 A Unit counts as running from `BOLT_STARTED` or `WORKTREE_CREATED` until `BOLT_COMPLETED`, as builds log today, so the Units tab no longer shows a building Unit as pending. (Origin: code scan, `src/main/parsers/units.js` waits for `UNIT_STARTED`, which builds never log.)

## Non-functional requirements

- NFR1 Every text goes through `t()` with ICU placeholders, with the same keys in `sv.json` and `en.json`.
- NFR2 The app only reads AI-DLC's files and never writes engine-owned files. The last-commit read is a read-only git call through the existing `runFixed` with fixed arguments.
- NFR3 A change on disk shows in the section within 2 seconds, through the existing watcher's debounce; no new polling loop.
- NFR4 Rows are reachable by keyboard and state their status in text, not by colour alone.
- NFR5 Each requirement has a test written first (TDD); the full suite stays green.

## Constraints

- The view keeps the LCARS look of the token detail view (US-0208).
- Electron main and renderer split stays: the main process reads and watches, the renderer only renders.

## Assumptions

- Elapsed time shows in minutes ("12 min"), counted from the start event. Seconds would only add noise.
- The plan inside a worktree sits at the same relative record path as in the main checkout (the scan saw this layout but did not confirm it on a live worktree).
- Severity names are taken as the review records spell them; no mapping is added.

## Out of scope

- Hiding the Units tab when an intent has no Units (the person's first answer, given for the Units tab; superseded).
- The summary sentence anywhere other than the top of the section.
- Agent work started outside AI-DLC.

## Open questions

- Where the plan file sits inside a live worktree: confirm at Code Generation against a real build before relying on FR2.1's path.
