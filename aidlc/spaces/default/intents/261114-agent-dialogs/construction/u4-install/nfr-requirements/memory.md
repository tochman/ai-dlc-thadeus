<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- [unit u4-install] 2026-11-14T17:34:21Z — ARTIFACT-ONLY run, no questions; targets carried from NFR1, NFR3–NFR8, with sub-IDs that continue after the highest u1–u3 numbers (NFR1.14, NFR3.24, NFR4.9, NFR5.25, NFR6.7, NFR7.5, NFR8.8). NFR2 is N/A: no answer passes through the installer.
- [unit u4-install] 2026-11-14T17:34:21Z — NFR1 read for this Unit as "the installer never costs the dialog's latency": isCurrent is in-memory (NFR1.14), and status detection on open or change is bounded (NFR1.15, NFR1.16).
- [unit u4-install] 2026-11-14T17:34:21Z — FD review R-01 to R-03 resolved here: preview state per apply outcome (NFR5.32, changedSincePreview → superseded, partiallyWritten → refused); a file with a reason shows no Install/Update/Remove (NFR5.31); kind extraction rule with test rows (NFR5.30).

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- [unit u4-install] 2026-11-14T17:34:21Z — plugin path is .opencode/plugins/thadeus-dialog.js, not the FD's .ts, following u1 D4, C6 and u2/u3 (tech-stack D4); the FD's functional-spec, BR7.3, BR7.13 and entities still say .ts.
- [unit u4-install] 2026-11-14T17:34:21Z — the FD state machine's "changed since preview → refused" arrow is replaced by NFR5.32's table (→ superseded), which matches BR7.14 and W6.
- [unit u4-install] 2026-11-14T17:34:21Z — NFR6 and NFR7 placed in performance-requirements.md, as u1 did; the stage has no usability file.

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- [unit u4-install] 2026-11-14T17:34:21Z — own span finder with a JSON.parse + deep-equal post-check over adding jsonc-parser (D3): no new dependency, and a scanner bug becomes a refusal, never a damaged file; jsonc-parser is the upgrade path if comments must be kept.
- [unit u4-install] 2026-11-14T17:34:21Z — atomic write moved into a shared writeAtomic helper rather than bypassing writeFileSafe's engine-owned rule (D1); no fsync, same as the editor, named as an accepted limit.
- [unit u4-install] 2026-11-14T17:34:21Z — time-based test bounds (200 ms status, 300/500 ms preview/apply, 1.5 s change push) set about 10x the expected cost so CI does not flake; they are check tolerances, not speed promises.

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- [unit u4-install] 2026-11-14T17:34:21Z — for NFR Design: confirm Claude Code 2.1.325 deduplicates identical hook commands across settings files (accepted risk for copies in settings.local.json or user settings, FD review R-04).
- [unit u4-install] 2026-11-14T17:34:21Z — for NFR Design: record the concurrent-write window (≤ 50 ms between the last digest compare and the rename, NFR5.27) and its recovery through the watcher; no cross-process lock exists.
- [unit u4-install] 2026-11-14T17:34:21Z — for NFR Design: resolveInRoot needs an existing path (fs.realpath), so new files and folders are checked through their deepest existing folder (NFR3.24).
