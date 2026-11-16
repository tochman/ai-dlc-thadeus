# Requirements Analysis Questions: US-0209 cost across machines

Context: today an intent's cost comes only from this machine's gitignored `usage-ledger.json`. The committed audit shards (`<record>/audit/<host>-<clone-id>.md`) carry a cost rollup on every `STAGE_COMPLETED`. The scan found that this machine's shard can be told apart from the others through `aidlc/.aidlc-clone-id`, so the plan is: the ledger for this machine, the audit rollups for every other machine.

## Q1. [Product owner] Cost outside stages from other machines (the per-clone snapshot)

The issue proposes a committed per-clone totals file (for example `<record>/usage/<host>-<clone-id>.json`) for cost that no `STAGE_COMPLETED` row carries (skipped stages, work after the workflow), plus a one-time backfill. The app must not write AI-DLC's own files, and today no such file exists. What should this story do about it?

A. Read the snapshot file when it exists, but leave writing it (and the backfill) to AI-DLC: raise it upstream, and until then mark totals from other machines as "stage cost only"
B. Leave the snapshot out of this story entirely; count only stage rollups from other machines and add the snapshot in a later story
C. Have the app write its own committed snapshot outside AI-DLC's folders (for example `.thadeus/usage/<host>-<clone-id>.json`), including the backfill from this machine's ledger
X. Other (please specify)

[Answer]: C (2026-11-16, **Mode:** guided)

## Q2. [Developer] A stage that completed more than once

When a stage completes more than once (after a Request Changes, for example), each `STAGE_COMPLETED` row seems to carry the running total, not just the extra cost. In 261113-cost-and-models, adding every row gives $33.22, taking only the last row per stage gives $23.39, and `WORKFLOW_COMPLETED` says $23.86. How should repeated rows for the same stage in one shard count?

A. Take only the last `STAGE_COMPLETED` per stage (and per Unit, where the row names one) in each shard, treating the rows as running totals
B. Add every row, treating each as the cost of that attempt only
C. Take the last row per stage, but check it against AI-DLC's documentation or code first and change the rule if that says otherwise
X. Other (please specify)

[Answer]: A (2026-11-16, **Mode:** guided)

## Q3. [Designer] How the cost view shows where the cost came from

The story asks the cost view to say which machines contributed and to mark a total as partial when only the local ledger was there. Where should that show?

A. One short line under the intent's and the project's total: the machines by host name, with "this machine" marked, and a "partial" tag with a tooltip when it applies
B. Only in the info tooltip next to the total
C. A small per-machine breakdown table (host, source, USD, tokens) in the intent's cost tab, plus the partial tag on the totals
X. Other (please specify)

[Answer]: A (2026-11-16, **Mode:** guided)
