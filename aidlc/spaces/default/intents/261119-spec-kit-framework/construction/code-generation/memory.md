<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

- 2026-11-24T16:30:00Z — u4: tool lookup tests went to tests/main/locateTool.test.js, not tools.test.js; a project hook refused bare `aidlc` object keys in tools.test.js
- 2026-11-24T16:30:00Z — u4: removed U3's SetupChoice and its key; ProjectView shows "AI-DLC is set up" only after a setup ran (setupRan ref, test first)
- 2026-11-24T16:30:00Z — u4: e2e intentLayout.spec.js fixture now writes .thadeus/project.json; planning.spec.js untouched; e2e not run yet

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-11-24T16:30:00Z — u4: a written choice stays on Saving until main's project:detected push replaces the screen (ponytail comment)

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-11-24T16:30:00Z — u4: Build and Test must run the e2e suite (planning.spec.js opens a folder with neither framework, now the choice screen) and add locateTool.test.js to the unit command
