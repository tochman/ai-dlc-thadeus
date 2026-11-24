<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
- 2026-11-20T04:05:00Z — u2: chose fixed path + lstat over resolveInRoot; resolveInRoot needs the path to exist and allows in-root symlinks, which BR1.1 refuses. No questions asked: functional design settled every target.
- 2026-11-24T09:53:00Z — [unit u7-constitution] added NFR3.3 (command names must match Spec Kit's dotted form) beyond the functional design: U5 types these names into the terminal, so an extension manifest could otherwise inject a shell line. No questions asked: functional design settled the file shapes.
- 2026-11-24T11:05:00Z — [unit u10-speckit-agent-status] put the 300 ms timing test in the retried `scripts` project with a 1 s bound, after u7's review called a bare 300 ms CI bound flaky; added NFR5.1's 200-character cut so a hook body cannot flood the readout. No questions asked.
- 2026-11-24T11:59:04Z — [unit u4-framework-choice] made the `cli` flags a PATH lookup with no `--version` run (NFR4.1), so the choice screen starts no program; reused u10's 1 s timed-test bound in the `scripts` project. NFR5 and NFR6 are N/A for this Unit. No questions asked: functional design settled every target.
- 2026-11-24T15:56:26Z — [unit u5-speckit-commands] put the typed-text safety (safe names, one-line description, one Enter) under NFR4 as the closest inception parent, since a terminal line acts like a shell; `speckitCommand` re-checks names U7 already filters. No scalability, reliability or observability files: the unit is UI-kind. No questions asked.
- 2026-11-24T18:19:59Z — [unit u9-feature-token-log] asked two questions to settle the functional design review's two Major points: calls before the first seen turn go to the project bucket (Q1 A), and the opencode plugin is extended now (Q2 A). Put reserved-key and cursor rules under NFR3; library kind, so only security and tech-stack files.
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
