<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-11-24T09:44:50Z — [unit u7-constitution] took the extensions.yml shape from the installed Spec Kit tool (hooks keyed before_/after_<command>, enabled/optional defaulting true); the feasibility note had flagged it as unchecked.

## Deviations
- 2026-11-24T09:44:50Z — [unit u7-constitution] added `target` and `skipped` to contract C6 (additive, U7 owns it); C6 had no field for the command a hook runs before or after, which AC4.2.2 asks for.
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-11-24T11:55:55Z — [unit u4-framework-choice] Carry the review's findings into NFR Design and the code plan: the `project:chooseFramework` handler must re-detect, push `project:detected`, close the setup watcher and start the space or Spec Kit watcher after a write (Major: the setup watcher fires once and returns on a null framework); FrameworkChoice wraps ProjectView's `onApplied` rather than replacing it; an invalid file with both found falls back to AI-DLC silently; C4's `file` and `next` overlap, and the write-failure text needs a key.
