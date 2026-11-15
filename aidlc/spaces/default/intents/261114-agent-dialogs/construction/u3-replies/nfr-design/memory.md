<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- [unit u3-replies] 2026-11-14T18:14:08Z — NFR3.20's "writes by other app features do not count" read in the fail-safe direction of the questions file: drop, type, sequence and the popup fallback all go through pty:write and are started by the person, so they make a reply stale; only the store's own typed answer (never via pty:write) does not (SD10).
- [unit u3-replies] 2026-11-14T18:14:08Z — any authentic reply that cannot be shown (over 1 MB with a valid header, not JSON, no last-message field) moves the older reply on with staleReason notShown; forged files get nothing, as u1 RD7 (RD11).
- [unit u3-replies] 2026-11-14T18:14:08Z — the shared sanitizer did not exist in u1's design; defined here as LC12 src/shared/agentText.js (Cc, Cf except ZWJ, U+2028/2029) for u2, u3 and u5 (SD8).

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- [unit u3-replies] 2026-11-14T18:14:08Z — NFR4.5 says "no sleep" and NFR5.24 lists one cat and one mv; RD10 adds a background watchdog subshell with sleep 2 and kill to bound an open stdin (review R-04). Not a wait for an answer; recorded in RD10 and SCD10.
- [unit u3-replies] 2026-11-14T18:14:08Z — NFR5.23 "the strip does not change" narrowed: an authentic over-limit reply sets LatestMessage status notShown (review R-01).

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- [unit u3-replies] 2026-11-14T18:14:08Z — text and Enter in one writeSession call by default (the app already does this via withEnter for agent tabs); 30 ms separate-Enter fallback only if the NFR2.5 run shows a stray newline (RD13).
- [unit u3-replies] 2026-11-14T18:14:08Z — classifier is content-only in main; Shift/Ctrl-F3 share CPR's form and leave a reply shown. Accepted (no effect in either TUI), ponytail note with the DSR-correlation upgrade (SD10).
- [unit u3-replies] 2026-11-14T18:14:08Z — a watchdog-cut Stop copy is still published so main refuses it and RD11 moves the older reply on, rather than leaving it answerable.

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- [unit u3-replies] 2026-11-14T18:14:08Z — RD13's harness facts table (chosen write, stray newline) is filled by the NFR2.5 manual run before the release pull request.
- [unit u3-replies] 2026-11-14T18:14:08Z — the traceability tool's upstream list omits NFR1.12, NFR3.22, NFR3.23 and NFR8.5–NFR8.7; they are designed in OD5, OD7, OD8 and OD9 all the same.
