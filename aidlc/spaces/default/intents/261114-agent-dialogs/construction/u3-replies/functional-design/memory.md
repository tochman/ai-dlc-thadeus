<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- [unit u3-replies] 2026-11-14T16:35:06Z — "answered in the terminal" (M4) is detected as any input the person types into that tab's pty through pty:write after the reply arrived (BR6.6); no extra hook such as UserPromptSubmit was added.
- [unit u3-replies] 2026-11-14T16:35:06Z — AC3.1.3 says the strip shows the reply "rendered as Markdown", M5 says "first line, plain text, ellipsis"; reconciled as the first non-empty line rendered as inline Markdown on one line, with Show/Answer for the full rendering (BR6.16).
- [unit u3-replies] 2026-11-14T16:35:06Z — the strip's four looks (empty, waiting, answered, session ended) map to "no LatestMessage" plus three stored statuses; a tab that moved on counts as answered.

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- [unit u3-replies] 2026-11-14T16:35:06Z — on tab exit a shown reply goes stale (keeps text, session-ended line) instead of ending, as M4 and M5 require; BR6.7 narrows u1 BR2.3's "end every event of the session" for the reply kind only.
- [unit u3-replies] 2026-11-14T16:35:06Z — added to u1's contracts, additively: states dismissed and stale, message.empty, agentEvents.latest output fields eventId/truncated/empty, new bridge member agentEvents.reopen, and an in-process terminal-input signal from IpcRouter's pty:write handler to the store.

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- [unit u3-replies] 2026-11-14T16:35:06Z — the reply answer is typed as one line: newlines and tabs become spaces, other control characters are removed (BR6.11); safe against early submits and escape injection, at the cost of multi-line answers (bracketed paste not used).
- [unit u3-replies] 2026-11-14T16:35:06Z — a sent reply ends at once rather than waiting in "sent" for a closing event, because no hook reports that the typed input was taken; the LatestMessage keeps the record as answered.
- [unit u3-replies] 2026-11-14T16:35:06Z — an empty last message still opens the dialog with an app placeholder line, keeping "every reply opens the dialog" (FR2.7) over hiding blank turns.

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- [unit u3-replies] 2026-11-14T16:35:06Z — Q1 = B (replies turn red after 20 s, BR6.17) contradicts the approved AC5.1.1, which limits red to questions and permission prompts; u5-notifications needs its story text aligned.
- [unit u3-replies] 2026-11-14T16:35:06Z — BR6.2 assumes the opencode plugin can tell a top-level session from a sub-agent session; check against a recorded session.status and ctx.session.context payload in Code Generation.
- [unit u3-replies] 2026-11-14T16:35:06Z — when another Stop hook blocks the stop, the reply event arrives while Claude continues; the next event marks it stale, but a Send before that types into a running turn. Accepted as a known limit.
- [unit u3-replies] 2026-11-14T16:35:06Z — BR6.8 (replies after questions and permissions) may overlap u2's ordering rule in BR5; merge into one rule when both are built.
