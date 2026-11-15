<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- [unit u5-notifications] 2026-11-14T17:30:20Z — ui Unit: wrote performance, security and tech-stack files only, as the stage's produces_kinds sets; the one reliability concern (a failing notification must not stop the event) is NFR5.50 in the performance file.
- [unit u5-notifications] 2026-11-14T17:30:20Z — sub-IDs start at .50 in every group: u2 and u3 already share NFR1.8–NFR1.12 and more, and u4 has not numbered yet, so a fixed block avoids a third clash. Tech decisions are D50–D54 for the same reason.
- [unit u5-notifications] 2026-11-14T17:30:20Z — FD review R-01 to R-05 resolved as rows: R-01 NFR6.56 (never switch project on arrival; open-over-current recommended, final rule for NFR Design), R-02 NFR6.57 (project marker button), R-03 NFR6.58 (clicked page shown at once, others keep order), R-04 NFR1.56 and D51 (cap 500), R-05 NFR3.54 and D53.

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- [unit u5-notifications] 2026-11-14T17:32:44Z — NFR3.53 narrows D3's permission body to `what` only, dropping the first line of `detail`, because a command line is where a token most likely sits; flagged for the gate.

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- [unit u5-notifications] 2026-11-14T17:32:44Z — for NFR Design: whether the dialog opens over another project on arrival (NFR6.56, tied to u1's per-project `agentEvents.list`); the Linux markup method (NFR3.57); whether the Settings view counts as "not showing the event's project" for D2 (today `setActiveProject` keeps the project id while Settings is open).
