# Build and Test Summary: US-1301 Rework cost

- **Built:** `src/main/rework.js` (stage attempts, thrown-away attempts, window pricing, rework per intent); IPC `intent:rework` and `getRework` in the preload; rework per intent in the project overview, with the ledger fallback; a Rework section in the cost tab; rework's share and its own part of each bar in the cost panel. The texts are in both locales, in the LCARS look.
- **Verified:** 56 story tests; the full suite (3,067 passed after the docs fix); ESLint and Prettier clean; the coverage floor held. Details in `test-results.md`.
- **Requirements:** FR1–FR5 and NFR1–NFR5 are covered by tests (see `../code-generation/traceability.json`). FR6 (per release) moves to US-1303, as decided.
- **Deviation from the plan:** `STAGE_REVISING` also opens an attempt, since the audit writes no `STAGE_STARTED` after a rejection.
- **Found:** the planning sync committed conflict markers to `main` during the merge. `main` is fixed, and the fault is story US-0056.
- **Not done here:** the running app was not checked by hand, and the built-app end-to-end tests were not run locally. They run in CI on the pull request.
