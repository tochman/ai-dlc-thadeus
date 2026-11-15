<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-11-14T15:40:00Z — Kept answer check and delivery in one AgentEventStore instead of a separate AnswerRouter, so the session check and the pty write cannot drift apart.
- 2026-11-14T15:40:00Z — Q3 answered "per project"; asked Q5 because mixed Claude Code and opencode tabs made it ambiguous; person chose per project and harness.

## Open questions
- 2026-11-14T15:40:00Z — FR3.6 says keys are sent "while the agent's own picker is showing"; main cannot see the screen. Functional Design must say how main knows the picker is up (timing after hand-back, or a renderer screen check through a named IPC).

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
