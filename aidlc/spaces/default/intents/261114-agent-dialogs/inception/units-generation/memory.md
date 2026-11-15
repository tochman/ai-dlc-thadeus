<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-11-14T15:55:00Z — Q1 (per story) and Q2 (about 8, per component) conflicted; asked Q3, person chose per story, 5 Units in a chain. U1 is XL; U2 and U3 share files, so parallel work needs a careful merge.
- 2026-11-14T15:55:00Z — Folded Domain Design review R-01 (hook kind passed as an argument, stop hook exits at once) into U1 and U3 notes rather than leaving it open.

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
