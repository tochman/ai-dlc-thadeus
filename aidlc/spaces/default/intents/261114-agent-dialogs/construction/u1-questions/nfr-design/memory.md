<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-11-14T17:44:03Z — [unit u1-questions] ARTIFACT-ONLY run; the questions file has no questions and fixes three points (poll-count liveness, C1 amendment, silent exit). Designing against src/main/pty.js, ipc.js, notify.js, fileWrite.js, projectAccess.js, settings.js as they stand.
- 2026-11-14T17:44:03Z — [unit u1-questions] R-04 read as a delivery-confirmation problem, not only a timing one: main needs a signal that the hook actually took the answer, so the design adds a `.wait` marker and an atomic take by rename (`.ans` to `.took`); the unlink of `.ans` is the tie-breaker when the outcome is unclear.

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-11-14T17:54:06Z — [unit u1-questions] NFR3.3 lists "still .tmp" as a delete case; the design ignores .tmp files instead, since deleting the hook's in-progress file would break a legitimate rename. Folder removal cleans leftovers.
- 2026-11-14T17:54:06Z — [unit u1-questions] NFR5.2's script-test window ("2 to 3 s" for WAIT=2) becomes 1.0 to 3.2 s, and the real exit window is 594 to 596.1 s: both `date +%s` readings are floored. Intent (out before 600 s) unchanged; the .wait marker covers the early side.
- 2026-11-14T17:54:06Z — [unit u1-questions] The opencode plugin names its files <epoch-ms>-<pid> with strictly increasing ms, because its pid is constant per session and seconds-based names would collide; written into the C1 amendment.
- 2026-11-14T17:54:06Z — [unit u1-questions] traceability.json also lists NFR1.7, NFR3.11, NFR3.12 and NFR8.1–NFR8.4, which `--write-upstream` did not pick up; the sensor passes with them.

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-11-14T17:54:06Z — [unit u1-questions] Heartbeat in an inline `worker_threads` worker (eval: true) rather than a main-loop timer: a few lines more, but a main stall no longer looks like "app gone"; no bundler entry needed.
- 2026-11-14T17:54:06Z — [unit u1-questions] An answer taken but not finished within 1 s is reported as sent (ponytail ceiling); only matters if opencode's local form.reply is slow and then fails.
- 2026-11-14T17:54:06Z — [unit u1-questions] An adapter-refused waiting question is handed back at once with an empty answer, so BR1.4's "own picker stays usable" holds without the 595 s wait; BR1.1 refusals get no hand-back because they may be forged.

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-11-14T17:54:06Z — [unit u1-questions] Code Generation confirms that a sandboxed preload sees `additionalArguments` in `process.argv` (OD1's timing flag); a preload test is named for it.
- 2026-11-14T17:58:09Z — [unit u1-questions] Carried to Code Generation from the design review (Major): under dash a failed redirect on the special builtin `:` exits 2 before `|| exit 0` runs (RD4 `: > "$a.wait"`); write markers with a non-special command or check `[ -d answers ]` first, and keep the dash test for a missing `answers/`.
- 2026-11-14T17:58:09Z — [unit u1-questions] Carried to Code Generation from the design review (Major): RD6's start-up wipe of the channel root would destroy a second running instance's live sessions; add `app.requestSingleInstanceLock()` or scope the wipe to this instance's own folders. Minors to fold in: poll loop gives ≥1.9 s (read `last` inside the loop), `sleep 0.1` is not POSIX (check both shells), C1 amendment's `refusals` and `other_versions` lines are stale and the 600 s entry timeout belongs in C1, open event files with O_NOFOLLOW, ignore `alive`/`alive.tmp` in the watcher.
