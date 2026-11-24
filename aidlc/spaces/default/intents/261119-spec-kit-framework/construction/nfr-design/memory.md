<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-11-20T04:08:00Z — u2: NFR3.3 said drop __proto__/constructor/prototype keys; the design keeps every key with spread instead, because BR2.3 says to keep them and spread never sets the prototype. This follows the NFR review's minor findings, which the design addresses (recheck in expect, a cap on the bytes read, RangeError counts as unreadable, U2's own no-write test, the version shown only as a safe integer, no backup because git has it).
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
- 2026-11-24T11:10:00Z — [unit u10-speckit-agent-status] no cache for agents:progress: the event list is in memory and the features read is one call, so a cache would only add invalidation on the same two pushes. Fixed the IPC branch order (Spec Kit first, then dir name) to settle the NFR review's open point. No questions asked.
- 2026-11-24T12:04:00Z — [unit u4-framework-choice] settled the NFR review's findings in the design: an exported `locateTool` (stale saved path counts as not found, `specify` always a bare PATH lookup), 300 ms aimed for with a 1 s CI test bound, the person's confirm overwrites a file that appeared after the scan, and no main-side lock because the same-content atomic write is harmless twice. No questions asked.
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

- 2026-11-24T16:20:00Z — [unit u5-speckit-commands] answered the NFR review's double-click point with a per-button `sending` flag rather than waiting for the tab to show busy; added a failed-send note, strip of all `\p{Cc}` plus U+2028/2029, and kept the module name `speckitCommands.js` from the functional design. No questions asked.

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
