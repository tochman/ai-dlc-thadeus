<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-11-14T16:53:18Z — [unit u4-install] Entry set taken from u1–u3 as four Claude Code entries (PreToolUse/PostToolUse on AskUserQuestion at 600/10 s, PermissionRequest matcher `*` at 600 s, Stop at 10 s) and six opencode plugin events; u2's "matcher for every tool" read as `*`.
- 2026-11-14T16:53:18Z — [unit u4-install] outOfDate vs editedByHand decided by comparing against canonical content of every app release built into the app; in the first release any difference is a hand edit.
- 2026-11-14T16:53:18Z — [unit u4-install] Settled ADR-005's open consequence here because U4 replaces the source switch: a tab uses hook events only when its harness was current at spawn and still is (BR7.18).

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-11-14T16:53:18Z — [unit u4-install] Plugin path `.opencode/plugins/thadeus-dialog.ts` replaces C6's provisional `thadeus-dialog.js` and M8's `.opencode/plugin/` placeholder; C4 gets additive refusals, a `reason` field and an `agent-hooks:changed` push.
- 2026-11-14T16:53:18Z — [unit u4-install] PostToolUseFailure not installed, matching u1's entry set; a failed question closes on a newer event or tab exit.

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-11-14T16:53:18Z — [unit u4-install] Settings edits splice text at the app's spans instead of re-serialising, to keep other entries byte for byte; costs a span-aware JSON reader, checked by a post-splice value comparison (BR7.10).
- 2026-11-14T16:53:18Z — [unit u4-install] No two-file transaction: script written before entries (reversed on remove) so a partial write is harmless and shows as out of date (BR7.16).

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-11-14T16:53:18Z — [unit u4-install] Teammates on different app releases: a newer release's files show as edited by hand in an older app, and its Update would downgrade them (visible in the preview). A version marker could fix this later.
- 2026-11-14T16:53:18Z — [unit u4-install] Whether Claude Code accepts `*` as PermissionRequest matcher and reads hooks only at session start should be confirmed on the release Mac in Code Generation.
