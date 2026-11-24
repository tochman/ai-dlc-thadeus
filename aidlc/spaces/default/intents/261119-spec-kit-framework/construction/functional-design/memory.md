<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-11-24T09:44:50Z — [unit u7-constitution] took the extensions.yml shape from the installed Spec Kit tool (hooks keyed before_/after_<command>, enabled/optional defaulting true); the feasibility note had flagged it as unchecked.
- 2026-11-24T15:36:22Z — [unit u5-speckit-commands] settled C7's open question O1 from Spec Kit 1.4.3's code: Claude skills `/speckit-plan` (dots to hyphens for extensions), opencode commands `/speckit.plan`. Not yet seen in a run; the manual release check confirms it.
- 2026-11-24T15:36:22Z — [unit u5-speckit-commands] asked no questions: the stories, C5–C7 and the tool's code answered them. Read "a click runs it" as type plus Enter, and offered the next command only for the active feature, because Spec Kit's commands act on that one.

## Deviations
- 2026-11-24T09:44:50Z — [unit u7-constitution] added `target` and `skipped` to contract C6 (additive, U7 owns it); C6 had no field for the command a hook runs before or after, which AC4.2.2 asks for.
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-11-24T15:36:22Z — [unit u5-speckit-commands] formed the command from the agent tab's harness, not from the project's installed Spec Kit files; simpler, and the agent names an unknown command itself. Marked with a ponytail note in the spec.
- 2026-11-24T15:36:22Z — [unit u5-speckit-commands] wrote rules.md although the kind `ui` does not require it, so traceability can name BR targets, as U4 and U7 did.
- 2026-11-24T18:11:30Z — [unit u9-feature-token-log] readings driven by the existing hook events (Claude Stop with transcript path, opencode usage) rather than a timer; the session cursor kept in the app's user data, not `.thadeus/tokens/`, because thadeusSync treats every JSON there as a reading list and the cursor is machine-local.

- 2026-11-24T19:22:00Z — [unit u8-framework-switch] built on U4's `chooseFramework` flow (open PR #122, read from feat/US-1406): the switch re-checks the folder and writes through U2; setup reuses US-0503 and C3. One confirm covers setup and write, tagged as an assumption. No questions asked.

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-11-24T15:38:30Z — [unit u5-speckit-commands] Carry the review's five Minor findings into the code plan: an empty or unreadable tasks.md must not offer converge (offer tasks); button text, busy state and target all come from the one agent tab the command goes to; strip a leading `speckit.` to get the stem, as Spec Kit does; note in C7 that O1 is settled and codex (`$speckit-…`) is out of scope; with SPECIFY_FEATURE_NO_PERSIST no feature is active, so say so instead of showing nothing.
- 2026-11-24T11:55:55Z — [unit u4-framework-choice] Carry the review's findings into NFR Design and the code plan: the `project:chooseFramework` handler must re-detect, push `project:detected`, close the setup watcher and start the space or Spec Kit watcher after a write (Major: the setup watcher fires once and returns on a null framework); FrameworkChoice wraps ProjectView's `onApplied` rather than replacing it; an invalid file with both found falls back to AI-DLC silently; C4's `file` and `next` overlap, and the write-failure text needs a key.
