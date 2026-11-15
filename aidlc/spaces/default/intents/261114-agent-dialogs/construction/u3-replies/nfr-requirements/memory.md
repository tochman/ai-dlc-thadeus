<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- [unit u3-replies] 2026-11-14T17:14:56Z — NFR1's 1 s is written for questions, permission prompts and keys reaching the pty; applied the same 1 s to reply appearance and typed delivery rather than inventing a number (NFR1.8, NFR1.9).
- [unit u3-replies] 2026-11-14T17:14:56Z — sub-IDs continue after u1's (NFR1.8, NFR3.13, NFR5.13 …) so cross-Unit citations do not clash; u1 rows are reused by id, not restated.

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- [unit u3-replies] 2026-11-14T17:18:53Z — a Stop payload over C1's 1 MB limit is refused, not cut to 64 KB as FR6.2 reads; the script cannot cut without parsing JSON (D8, NFR5.23). Recorded as a known limit for the gate.

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- [unit u3-replies] 2026-11-14T17:18:53Z — opencode idle handler does not await ctx.session.context (D9): never holds opencode, at the cost of one pending promise if a read hangs.

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- [unit u3-replies] 2026-11-14T17:18:53Z — u3 FD review R-01 (what counts as the person's terminal input) and R-02 (text plus Enter in one write) are still open in rules.md; stated as checkable targets (NFR3.20, NFR2.5, NFR5.15) for NFR Design to settle.
