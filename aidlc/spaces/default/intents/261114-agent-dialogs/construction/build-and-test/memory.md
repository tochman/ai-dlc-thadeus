<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-11-15T08:14:42Z — NFR8.2 / NFR8.51 "touched code" read as the changed statements, not whole files; App.jsx is 76% as a file but 95.2% of the 62 statements this story changed.
- 2026-11-15T08:14:42Z — rows whose check is "script/unit test; manual: …" are Met when the test measures the expected value; rows whose value only a real-harness run can give are Unverified (15).

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-11-15T08:14:42Z — fixed the flaky wall-clock tests first as EPIC-00 story US-0010 (retry: 2, limits unchanged), as the person chose when parking ("Fix first").
- 2026-11-15T08:14:42Z — renamed u2's code-generation traceability.json key `links` to `coverage` so the cross-unit check can read it; no content change.

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-11-15T08:14:42Z — 166 NFR sub-IDs are missing from u2–u5's code-generation trace files; adding them reopens Code Generation (records only).
