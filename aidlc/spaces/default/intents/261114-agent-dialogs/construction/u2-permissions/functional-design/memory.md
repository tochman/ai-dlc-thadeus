<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-11-14T16:34:12Z [unit u2-permissions] Claude Code "Allow always" is one choice applying all permission_suggestions unchanged, mirroring the terminal's single "don't ask again" option; shown only when suggestions are non-empty (BR5.3).
- 2026-11-14T16:34:12Z [unit u2-permissions] Deny maps to behavior deny with interrupt true, read as the closest match to the terminal "No"; to confirm in the NFR2 scenario 6 manual run.
- 2026-11-14T16:34:12Z [unit u2-permissions] u1 rule IDs mentioned in rules.md are listed in traceability reverse as defined by u1-questions, since the sensor counts every BR id in the file.

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-11-14T16:34:12Z [unit u2-permissions] A timed-out permission is not sent as keys (u1 sends timed-out questions as keys, M6 "send from here as keys"): a wrong key would allow a command nobody chose, so choices are disabled and the terminal answers (BR5.9).
- 2026-11-14T16:34:12Z [unit u2-permissions] On open, focus goes to the page title, not the first choice as u1 BR4.5 says, so Enter can never allow by default (M3, BR5.6).

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-11-14T16:34:12Z [unit u2-permissions] opencode uses permission.asked + ctx.permission.reply, not the evaluate hook: evaluate decides in code before the person is asked (FR3.4).
- 2026-11-14T16:34:12Z [unit u2-permissions] A command cut at 64 KB disables the allow choices; Deny, Close and the terminal stay. Safer than allowing something the person cannot read in full (BR5.5).
- 2026-11-14T16:34:12Z [unit u2-permissions] Pager rank puts questions and permissions before replies but keeps u1's no-jump rule, so AC2.1.4 holds when paging from the start rather than by switching the open page (BR5.12).

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-11-14T16:34:12Z [unit u2-permissions] Exact opencode permission.asked field names for type and pattern are to be read from recorded fixtures before the adapter is written.
- 2026-11-14T16:34:12Z [unit u2-permissions] u1 refusals by AgentChannel (BR1.1) leave the hook waiting until its limit; BR5.4 hands back at once only for events that pass the channel. Not changed here.
