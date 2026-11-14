<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- [unit u1-questions] 2026-11-14T17:02:30Z — ARTIFACT-ONLY run; the questions file has no questions, so the targets are NFR1–NFR8 from requirements.md split into NFRx.y rows, each with its check (test, recorded payload, or the manual run on the release Mac).
- [unit u1-questions] 2026-11-14T17:07:27Z — NFR1's "keys reach the pty within 1 s of the click" read for the hand-back path as 1 s from the later of click and picker seen, since C2 allows up to 3 s for the picker to show (NFR1.3).
- [unit u1-questions] 2026-11-14T17:07:27Z — THADEUS_WAIT_SECONDS read as the full wait (595), with the 5 s margin applied once in main; C1's "minus 5 s" would otherwise apply it twice (NFR5.2).
- [unit u1-questions] 2026-11-14T17:07:27Z — NFR2 scenarios 6 and 7 left to u2 and u3, per the stories' scenario table; this Unit covers 1–5 on both harnesses.

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- [unit u1-questions] 2026-11-14T17:07:27Z — event file names are <epoch-s>-<pid>.evt, not the functional spec's <ms>-<pid>-<rand>: POSIX sh on macOS has no ms clock or $RANDOM; arrival time comes from mtimeMs in main (tech-stack D3).
- [unit u1-questions] 2026-11-14T17:07:27Z — opencode plugin as .js, not the spike table's .ts; repo has no TypeScript and C6 already says .js (tech-stack D4).
- [unit u1-questions] 2026-11-14T17:07:27Z — NFR6 and NFR7 placed in performance-requirements.md (the ui-side file); the stage's five files have no usability file.

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- [unit u1-questions] 2026-11-14T17:07:27Z — liveness by alive-file content change instead of stat (macOS and Linux stat flags differ); wait deadline by date +%s instead of poll counting (counting drifts past the 600 s timeout).
- [unit u1-questions] 2026-11-14T17:07:27Z — time-based script tests carry 0.5 s slack (NFR5.1 2.0–2.5 s, NFR1.5 300 ms) so CI on ubuntu-latest is not flaky; the slack is a check tolerance, not a new target.

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- [unit u1-questions] 2026-11-14T17:07:27Z — whether 3 s is enough for the picker to show after a hand-back (C2 open question) is settled by the manual run on the release Mac (NFR1.3).
- [unit u1-questions] 2026-11-14T17:07:27Z — node:fs in opencode's plugin runtime is inferred, not documented; the manual opencode run confirms it (NFR5.7).
- [unit u1-questions] 2026-11-14T17:10:55Z — carried to NFR Design from the review (Major): `date +%s` has 1 s resolution, so the 2 s liveness rule must count 3 unchanged seconds (real gap ≥ 2 s) or NFR5.1 fails and a ~1 s main stall gives up early.
- [unit u1-questions] 2026-11-14T17:10:55Z — carried to NFR Design from the review (Major): C1 must be amended for THADEUS_WAIT_SECONDS as the full wait (595) and seconds-based file names ordered by mtimeMs; u2 and u3 share the script. Also from review (Minor): dash has no ERR trap, use `exec 2>/dev/null` and `|| exit 0`; run script tests under dash too.
