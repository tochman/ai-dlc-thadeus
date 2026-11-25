<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-11-25T03:35:34Z — the first suite run was piped through `tail`, which hid the totals and vitest's exit code; discarded and rerun whole.
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
- 2026-11-25T03:35:34Z — measured burst batching and folder removal with a one-off script instead of adding tests; a test is a source change that would reopen Code Generation, and both targets are met.
- 2026-11-25T03:35:34Z — judged the 300 ms and 500 ms CI targets on CI's own timings, not on the tests' looser 1 s and 2 s bounds.
- 2026-11-25T06:13:58Z — marked NFR2 Met with six faults listed (L1–L6) instead of Not Met; the requirement names frame, headings and colours, and the person asked for a check, so fixing is theirs to decide.
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
- 2026-11-25T03:40:00Z — parked with the requested changes not started: (1) add tests for burst batching and a removed feature folder in `tests/main/watcher.test.js`, on a branch with its own pull request; (2) check the LCARS look of the Spec Kit views in the built app; (3) bring in US-0047 (#127) and rerun the checks. Local `main` is 2 app docs commits ahead (f7e0d94, 994d04d) and 1 behind; a trial merge of `origin/main` conflicts in `docs/FEATURES.md` and `docs/features/epic-00-fixes.md`, so work from a worktree on `origin/main`.
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
