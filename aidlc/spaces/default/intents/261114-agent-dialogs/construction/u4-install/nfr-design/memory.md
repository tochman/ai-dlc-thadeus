<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- [unit u4-install] 2026-11-14T18:34:33Z — ownership is `appKind`: the command runs exactly `.thadeus/hooks/dialog.sh` with one of the four kinds; anything else, also another script in `.thadeus/hooks/`, is not the app's (review R-01, questions file)
- [unit u4-install] 2026-11-14T18:34:33Z — "refuse on doubt" made concrete: UTF-8 round trip, BOM off and on, duplicate or escaped keys in walked objects, then prune(stripApp) deep-equal and the classifier on the result, all at preview time (review R-02)

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- [unit u4-install] 2026-11-14T18:34:33Z — a symlinked `.claude/settings.json` is refused, not written through; narrows NFR3.25's first clause, amendment listed in logical-components.md (review R-04)
- [unit u4-install] 2026-11-14T18:34:33Z — added C4 member `agentHooks.cancel(projectId, previewId)` so Cancel ends the preview in main (review R-05)
- [unit u4-install] 2026-11-14T18:34:33Z — `watchFiles`' isFile pattern must widen to `.sh` and `.js`; today it would treat `dialog.sh` and the plugin as folders and never fire (found in src/main/watcher.js, not in the requirements)

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

- [unit u4-install] 2026-11-14T18:34:33Z — accepted, not built: removal of a pre-existing empty `.thadeus/` (git does not track empty folders), the 4-byte `{}` file left after Install then Remove on the no-file fixture, and the check-to-rename link swap by the same OS user
- [unit u4-install] 2026-11-14T18:34:33Z — final compare moved inside `writeAtomic` just before rename; the 50 ms bound becomes a tolerance and the call-order test is the real check (review R-03)

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- [unit u4-install] 2026-11-14T18:34:33Z — Claude Code 2.1.325 deduplication not run here; added as a step of the NFR8.9 manual run (RD44)
- [unit u4-install] 2026-11-14T18:34:33Z — u1-questions RD4 still has `: > "$a.wait"` (u1 design review R-01); u4's RD31 tripwire fails until u1 fixes it
