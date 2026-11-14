<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-11-14T17:18:47Z — [unit u2-permissions] numbered u2's detailed NFRs after u1's (NFR1.8+, NFR3.13+, NFR5.13+ and so on) so every NFRx.y ID is unique in the intent and "as u1 NFRx.y" references cannot be confused.
- 2026-11-14T17:18:47Z — [unit u2-permissions] stated the four u1 review corrections (R-01 liveness, R-02 wait variable and order, R-03 silent exit, R-07 dash tests) as assumed targets in u2 rows (NFR5.14, NFR5.15, NFR5.22, NFR4.5, NFR8.5); their design stays with NFR Design.

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-11-14T17:18:47Z — [unit u2-permissions] NFR3.16 widens BR5.5's escaping from control characters to Unicode bidi and zero-width format characters (Trojan Source style hiding in commands); the functional rule should pick this up.
- 2026-11-14T17:18:47Z — [unit u2-permissions] NFR5.14's hand-back window is 2.0–3.5 s, per the corrected 1 s liveness rule; FR6.3's "within 2 seconds" is read as "gone after a 2 s gap".

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-11-14T17:18:47Z — [unit u2-permissions] NFR1.13 adds an `agentConfirmed` timing stamp so opencode's NFR1.10 is measurable; NFR Design to confirm the shape with u1 NFR1.6.
- 2026-11-14T17:18:47Z — [unit u2-permissions] gates before Code Generation: deny with `interrupt: true` (D8, NFR2.5), opencode `permission.asked` fixtures (D9), and the Allow always label for suggestions without rule text (FD review R-03, NFR3.17).
