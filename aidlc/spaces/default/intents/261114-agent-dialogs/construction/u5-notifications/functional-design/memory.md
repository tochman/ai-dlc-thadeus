<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- [unit u5-notifications] 2026-11-14T16:52:56Z — "Line only" and "Off" reuse u3's `dismissed` state (reply accepted straight as dismissed, strip's Answer reopens it) instead of a new state; one pure `alertPlan(kind, settings, inFront)` decides dialog, notification and sound for main and renderer alike.
- [unit u5-notifications] 2026-11-14T16:52:56Z — "Line only" still notifies in the background (AC5.1.2 says only "Off" has no notification); clicking such a notification reopens the reply like the strip's Answer.
- [unit u5-notifications] 2026-11-14T16:52:56Z — settings key named `replyAlerts` (`dialog-notify`, `line`, `off`), mirroring `questionAlerts`; the existing alerts legend and help texts change to cover agent questions and permission prompts, keys kept.

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- [unit u5-notifications] 2026-11-14T16:52:56Z — every kind escalates to red after 20 s, replies included (u3 BR6.17), superseding AC5.1.1's wording for replies; recorded in functional-spec.md D7.
- [unit u5-notifications] 2026-11-14T16:52:56Z — traceability sensor reports pass false: its functional-design check always requires the Unit's own rules.md and BR targets in it, but a ui Unit produces no rules.md (produces_kinds). Rows are OK with u1/u3 rule IDs and spec decisions D1–D9; no rules.md written, per the brief.

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- [unit u5-notifications] 2026-11-14T16:52:56Z — notify decision taken once at arrival (window state then), no later notification on blur and no withdrawal on focus; simpler "once per event id", matches today's notify.js.
- [unit u5-notifications] 2026-11-14T16:52:56Z — no cap on notifications for a burst of events; one per event as FR6.1 says, a cap only if it proves noisy.

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- [unit u5-notifications] 2026-11-14T16:52:56Z — the traceability sensor needs an override or a framework fix for ui Units without rules.md; the orchestrator decides.
- [unit u5-notifications] 2026-11-14T16:52:56Z — u2's permission escalation was not readable here; D7 states red after 20 s for permission pages as this Unit's own decision (unit-of-work: AgentDialog "escalation for every kind").
