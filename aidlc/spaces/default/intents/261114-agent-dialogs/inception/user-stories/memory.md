<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-11-14T15:16:33Z — Q2 (slices per event kind) and Q3 (one story per FR area) conflicted; asked Q5, person chose large vertical slices (about 5). FR6 corners placed inside their slice.
- 2026-11-14T15:16:33Z — Q1 B keeps US-0506 as one feature-doc story; the five stories use internal IDs US1.1–US5.1 and ship in one PR, so the team's one-PR-per-story rule holds at the US-0506 level.

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-11-14T15:16:33Z — US1.1 carries 11 acceptance criteria, above the 3–6 guideline; the person chose large slices, and Units Generation can split it into Units.
- 2026-11-14T15:16:33Z — mob stage ran with the lead alone: collaborators are off for this piece of work, so no support round and no contribution files.

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
