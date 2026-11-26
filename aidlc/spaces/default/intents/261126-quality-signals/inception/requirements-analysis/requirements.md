# Requirements — US-1305 Quality signals next to cost

## Intent analysis

A developer or team lead wants to see whether cheaper or faster AI work costs quality: each intent's and each release's quality signals shown beside their cost, and a chart where an expensive and troubled intent stands out. Brownfield enhancement of the cost views (US-0209, US-1301, US-1303), reusing US-1304's release figures. Standard depth.

## Functional requirements

**FR1 Quality per intent** [Q2, Q3, Q4]
- FR1.1 Revision cycles per stage: the `GATE_REJECTED` events in the intent's audit, per stage and in total.
- FR1.2 Loop-backs: the `### Loop-back N` entries under `## Loop-Back Log` in the intent's `construction/build-and-test/test-results.md`.
- FR1.3 Review findings: the rows of the findings tables in the intent's committed `**/reviews/review-NN.md` files, counted per severity; a finding counts as fixed when its Status says fixed or resolved (any case), else open.
- FR1.4 Failed test runs: one per loop-back entry (FR1.2), plus one when the final Target Verification Matrix in `test-results.md` still has a `Not Met` or `Unverified` verdict, plus each `SENSOR_FAILED` event in the audit.
- FR1.5 Post-merge findings: each `After merge with main` or `Efter merge med main` section heading in `test-results.md` counts as one.
- FR1.6 Trouble count: revision cycles + loop-backs + open review findings + failed test runs + post-merge findings.
- FR1.7 A signal whose source is missing (no `test-results.md`, no review files) is shown as "no record", never 0.

**FR2 Where it shows** [Q1]
- FR2.1 The intent detail's Cost tab shows FR1.1–FR1.6 beside the intent's cost, with revision cycles per stage.
- FR2.2 The project Cost view's intent rows show the trouble count beside each intent's cost.

**FR3 Quality per release** [Q6]
- FR3.1 Beside each release's cost in Features › Releases: the EPIC-00 fix stories that name it in a `- **Fault in:**` line (count and IDs) and "prerelease" when GitHub marks it, both from US-1304's delivery figures.
- FR3.2 With no platform connection the prerelease part is named missing; the fix stories still show.

**FR4 Cost-and-quality chart** [Q5]
- FR4.1 The project Cost view gets a scatter plot: cost (USD) on one axis, trouble count on the other, one dot per intent with a cost; archived intents included.
- FR4.2 Each dot shows the intent's name, cost and trouble count on hover and keyboard focus, and the same data is in a table for screen readers.

## Non-functional requirements

- NFR1 Read only: nothing is written in `aidlc/` or the docs.
- NFR2 The counting is pure functions (no I/O) with unit tests written first (TDD); file reads stay in `projectService.js`, and a file that cannot be read is named, never breaking the view.
- NFR3 Every text through `t()` in Swedish and English; LCARS look; the chart's meaning is never colour alone.
- NFR4 Line coverage stays at or above 80%; ESLint and Prettier pass.

## Constraints

- Review findings come only from committed review files; the engine's own review records under `.aidlc-engine/` are not kept by git, so they are not read.
- The audit has no test-run event, so failed runs are counted from what FR1.4 names.

## Assumptions

- Review files keep the findings-table shape the reviewer writes today (`| ID | Severity | … | Status |`).
- A release's intents and cost come from US-1303; its fix stories and prerelease from US-1304.

## Out of scope

- A combined quality score with weights.
- Quality over time (trends).
- Per-release sums of the intents' quality figures (Q6 chose reuse only).

## Open questions

None.
