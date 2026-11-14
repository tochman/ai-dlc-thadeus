<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- [unit u5-notifications] 2026-11-14T18:32:33Z — Q1 B keeps D3: permission body is `what` plus the first line of `detail`; NFR3.53's `what`-only narrowing is recorded as superseded (SD52), with the token-on-first-line exposure as an accepted risk.
- [unit u5-notifications] 2026-11-14T18:32:33Z — C3 fixes no event-id format (the `<digits>-<digits>` shape is C1's file name); the 64-character bound is justified by u1 SD4 instead, plus a store test on minted ids (SD53).
- [unit u5-notifications] 2026-11-14T18:32:33Z — NFR6.56 rule chosen: dialog opens over the current view naming the event's project; W2 step 3 amended (PD56).

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- [unit u5-notifications] 2026-11-14T18:32:33Z — one sanitizer module `src/shared/agentText.js` for u1, u2, u3, u5: u2's `visibleText` moves into it and u3's `escapeUnsafe` becomes `visibleText(s, { multiline: true })`; removing functions keep ZWJ, the escaping one shows it.
- [unit u5-notifications] 2026-11-14T18:32:33Z — decided set kept at 500 but refreshed on each re-offer, so a pending audit question only falls out if 500 other ids are decided between two recomputes of its project (R-04).
- [unit u5-notifications] 2026-11-14T18:32:33Z — overdue screen-reader cover: one polite `role="status"` announcement per shown page rather than none (R-06).
- [unit u5-notifications] 2026-11-14T18:32:33Z — Linux body escapes `&`, `<`, `>`; a daemon without markup would show entities literally (ponytail limit).

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
