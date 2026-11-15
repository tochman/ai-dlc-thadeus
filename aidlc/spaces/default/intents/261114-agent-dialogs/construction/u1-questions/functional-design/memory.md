<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-11-14T16:30:00Z [unit u1-questions] — Claude Code docs list no maximum hook timeout; used the documented default 600 s (waitSeconds 595) for "as long as allowed" [Q1]. Raising it later is a one-line change in the entry.

## Deviations
- 2026-11-14T16:40:00Z [unit u1-questions] — opencode cannot hold its question for the dialog: its form shows in the terminal at once and no plugin answer API is documented. Designed the plugin to reply via the client's session.form.reply (from source, provisional), falling back to keys; the dialog does not take over for opencode (differs from FR3.3), and says so on the page.

## Interpretations
- 2026-11-14T16:30:00Z [unit u1-questions] — Spike done from the Claude Code hooks reference: PreToolUse on AskUserQuestion can answer via permissionDecision allow + updatedInput.answers, so questions go via hook; keys only after a time-out.
- 2026-11-14T16:30:00Z [unit u1-questions] — Added a random suffix to event file names and a toolCallId on events (Contract Design review R-04, R-05); "dismissed" kept as a renderer outcome, not a stored state (R-03); failed sends return to shown and can be retried (R-06).
