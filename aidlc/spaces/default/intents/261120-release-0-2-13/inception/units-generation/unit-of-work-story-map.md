# Story Map: Release v0.2.13

| Story | Unit ID | Directory |
|---|---|---|
| US1.1 | U1 | u1-login-path |
| US2.1 | U2 | u2-main-planning-read |
| US3.1 | U3 | u3-thadeus-sync |
| US4.1 | U4 | u4-park-unpark |
| US5.1 | U5 | u5-fold-list |

## Cross-cutting

NFR1 (texts through `t()`), NFR2 (LCARS, `data-testid`), NFR3 (TDD, suite green, coverage ≥ 80%), NFR4 (AI-DLC only through its CLI) and NFR5 (timeouts) apply to every Unit. No story spans two Units.

## Order within each Unit

- **U1**: ExecRunner's read (AC1.1.1, AC1.1.2, AC1.1.4), then the scan refresh (AC1.1.3), then the row (AC1.1.5).
- **U2**: GitReader's file-at-ref, then the loader's source and overlay (AC2.1.1–AC2.1.3), then the stale-entry drop (AC2.1.4), then the label (AC2.1.5).
- **U3**: record kind and capture (AC3.1.1), worktree commit (AC3.1.4), batching (AC3.1.5), rebase and merge (AC3.1.6), harness splice and drift (AC3.1.2, AC3.1.3), setup rule (AC3.1.7), waiting count (AC3.1.8).
- **U4**: parked state (AC4.1.1, AC4.1.6), Park (AC4.1.2, AC4.1.5), Unpark (AC4.1.3), Resume (AC4.1.4).
- **U5**: the hook and settings key (AC5.1.3), the toggle and strip (AC5.1.1, AC5.1.4), then each view (AC5.1.2).

## Coverage

All 5 stories are assigned, and every Unit has a row.
