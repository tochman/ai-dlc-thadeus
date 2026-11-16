# Requirements: US-0209 an intent's cost counts every machine

## Intent analysis

A developer who works on one project from several machines sees only this machine's share of an intent's cost. The reason is that the app reads only the gitignored `aidlc/.aidlc-sessions/usage-ledger.json`. The goal is a total that adds up every machine without counting anything twice, and that says where each part came from. This is an enhancement to the existing cost read in main (`loadCost`, `summarizeLedger`) and to the cost views. It is a brownfield change of moderate size.

Sources: US-0209 in `docs/features/epic-02-cost-and-models.md` (issue #56); the focused scan in `codekb/aidlc-dash/architecture.md` ("US-0209 cost sources"); answers Q1–Q3 in `requirements-analysis-questions.md`.

## Functional requirements

**FR1 Cost from the committed audit shards**
- FR1.1 The app reads the cost rollup (`Tokens In`, `Tokens Out`, `Cache Read`, `Cache Write`, `Cost USD`, `By Model`, `By Agent`, `Tokens By Model`, `Tokens By Agent`) from each `STAGE_COMPLETED` row in every shard `<record>/audit/<host>-<clone-id>.md`.
- FR1.2 For each shard, only the last `STAGE_COMPLETED` row per stage counts, and per Unit where the row names one. Earlier rows for the same stage are running totals (Q2). Example: 261113-cost-and-models must give $23.39, not $33.22.
- FR1.3 `WORKFLOW_COMPLETED` totals are never added to the stage rows.
- FR1.4 On a fresh clone with no ledger, an intent's cost equals the sum of FR1.2's rows across all of its shards, and the cost views show it instead of hiding.

**FR2 Merge with this machine's ledger, counted once**
- FR2.1 This machine's clone is the one named in `aidlc/.aidlc-clone-id`. Its shard is the one whose name ends in `-<clone-id>.md`.
- FR2.2 When the ledger has the intent, the ledger replaces this machine's shard rows for that intent. When the ledger lacks the intent, this machine's shard rows count.
- FR2.3 Every other machine counts once, from its snapshot (FR3) or its shard rows. Test: one stage done on machine A and one on machine B, with both shards present and A's ledger present. The total is A's ledger plus B's stage row, nothing more.

**FR3 Per-machine committed snapshot, written by the app (Q1)**
- FR3.1 Whenever the app reads this machine's ledger, it writes `.thadeus/usage/<host>-<clone-id>.json` with this machine's totals per intent: tokens, USD, by stage, by model and by agent. It does not touch AI-DLC's folders. It writes only when the content has changed.
- FR3.2 The first write covers the whole existing ledger, which is the one-time backfill.
- FR3.3 The file holds only token counts, model names, agent names, stage slugs, USD and ids (intent uuid, clone id). It holds no session data, transcript text, paths outside the project, personal data or secrets.
- FR3.4 For another machine's intent, a snapshot entry counts instead of that machine's shard rows, so cost outside stages shows after `git pull` once the snapshot file has been committed and pulled.
- FR3.5 The app never commits the file; the person commits it with their other changes.

**FR4 Show where the cost came from (Q3)**
- FR4.1 One short line under the intent's total and the project's total names the contributing machines by host, with this machine marked.
- FR4.2 A "partial" tag with a tooltip marks a total when any part counts stage rows only. That covers another machine with no snapshot, and this machine with no ledger.
- FR4.3 Every new text goes through `t()` in `sv.json` and `en.json`, and every cost stays labelled as an estimate (EPIC-02 cross-cutting criteria).

**FR5 Live refresh**
- FR5.1 A change to any audit shard or to any `.thadeus/usage/*.json`, a pulled one included, reloads the cost, the same way a ledger change does today.

## Non-functional requirements

- NFR1 Correctness: no USD is counted twice. FR1.2, FR1.3 and FR2.3 each have a unit test with fixture shards, and 261113-cost-and-models' totals are checked in a test.
- NFR2 Privacy: a test asserts that the written snapshot contains only the keys FR3.3 allows.
- NFR3 Robustness: a shard or snapshot that is malformed or half-written is skipped, and the last good value is kept, as for the ledger today. It never blanks the cost view.
- NFR4 Testing posture: TDD (test first), the full vitest suite green, and the 80% line-coverage floor kept.

## Constraints

- The app writes no file under `aidlc/` or `.claude/` (it may edit AI-DLC config only through the CLI).
- The app reads through `projectAccess.js` (root-confined, read-only); the snapshot write goes through the app's own write path, like `.thadeus/tokens/`.
- The one cost summary shape (`perIntent[dir]`) stays, so the views need only the machines line and the partial tag.

## Assumptions

- [assumption] When another machine has both a snapshot and shard rows for an intent, the larger of the two totals counts. A snapshot can be older than the shard if that machine ran stages without the app open. The snapshot normally includes the stage cost, so the two are never added together.
- [assumption] The host name is the part of the shard file name before `-<clone-id>`. For this machine it comes from its own shard, or from `os.hostname()` when it has no shard yet.
- [assumption] The audit's per-model and per-agent token counts are rounded (`71k`, `13.4M`) and its `Cache Write` is not split into 5m and 1h. They are shown as they are, and USD is exact.
- [assumption] The token readings behind "Tokens over time" stay local, taken from the ledger only, so another machine's totals do not show as a jump.

## Out of scope

- Changing AI-DLC's own usage tool or its file formats.
- Committing or pushing the snapshot.
- Per-machine charts or tables beyond the machines line (Q3 chose the short line).

## Open questions

None.
