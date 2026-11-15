<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- [unit u2-permissions] 2026-11-14T18:12:18Z — Q1 A read as: opencode Allow always only when the request carries a non-empty always-pattern list (field name from the recorded fixture); Claude Code Allow always only when every suggestion is addRules (behavior allow) or addDirectories with no unknown key (SD11)
- [unit u2-permissions] 2026-11-14T18:12:18Z — "hook no longer waiting" is u1's .wait marker through u1 RD3 hookWaits; the store's clock never decides it (SD10, RD10)

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- [unit u2-permissions] 2026-11-14T18:12:18Z — NFR5.19's "answered event marked failed" carried by u1's .nack marker instead (one failure mechanism, same outcome)
- [unit u2-permissions] 2026-11-14T18:12:18Z — a cut what or cwd also disables both allow choices (stricter than NFR3.16, which names detail only)
- [unit u2-permissions] 2026-11-14T18:12:18Z — NFR5.14/NFR5.15 bounds taken from u1 RD1 (poll-count liveness 2.0-2.3 s; deadline 594-596.1 s, script test window 1.0-3.2 s)

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- [unit u2-permissions] 2026-11-14T18:12:18Z — 500 ms input guard swallows keys in flight (they reach neither the page nor the terminal); losing half a second of typing beats a stray answer
- [unit u2-permissions] 2026-11-14T18:12:18Z — unknown suggestion keys or types drop Allow always rather than guess; a newer Claude Code loses the dialog's Allow always until fixtures are re-recorded
- [unit u2-permissions] 2026-11-14T18:12:18Z — residual permission.reply window (R-06) accepted: opencode applies the first decision; replied-during-reply test

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- [unit u2-permissions] 2026-11-14T18:12:18Z — the traceability tool does not extract NFR1.12, NFR3.20, NFR3.21, NFR8.6 from the u2 requirements; they are designed in OD5, OD7, OD8, OD9 but not in traceability.json
- [unit u2-permissions] 2026-11-14T18:12:18Z — opencode always-pattern field name (expected `always`) and Claude Code suggestion shapes to confirm from recorded fixtures before the adapter is written
