# Unit Test Instructions: US-0209

## Framework

vitest 5.1.0, already set up in `vitest.config.mjs` with two projects: `main` (node) and `renderer` (jsdom, Swedish locale). Nothing new to install.

## Runnable before the first Red step

```bash
npx vitest run tests/main/ledger.test.js
```

## This work's tests

```bash
npx vitest run tests/main/auditCost.test.js tests/main/usageSnapshot.test.js tests/main/crossMachineCost.test.js tests/main/ipc.test.js tests/main/watcher.test.js tests/renderer/CostPanel.test.jsx tests/renderer/CostTab.test.jsx tests/main/i18nKeys.test.js
```

About 14 new tests, one per requirement plus a happy path per component:

- `auditCost.test.js`: rollup parsing with rounded token counts (FR1.1); last row per stage and Unit (FR1.2); `WORKFLOW_COMPLETED` ignored (FR1.3); the 261113-cost-and-models fixture gives $23.39 (NFR1).
- `usageSnapshot.test.js`: backfill of the whole ledger (FR3.2); only the allowed keys (FR3.3, NFR2); no rewrite of an unchanged file (FR3.1); a malformed file is skipped (NFR3).
- `crossMachineCost.test.js`: no ledger (FR1.4); A's ledger plus B's shard, counted once (FR2.2, FR2.3); a snapshot counts instead of the shard, the larger total (FR3.4); `machines` and `partial` (FR4.2).
- `ipc.test.js` and `watcher.test.js`: `project:cost` without a ledger, and the snapshot write (FR1.4, FR3.1); shard and snapshot changes set `costChanged` (FR5.1).
- `CostPanel.test.jsx` and `CostTab.test.jsx`: the machines line (FR4.1); the partial tag and tooltip (FR4.2). `i18nKeys.test.js` covers both locales (FR4.3).

## Expected coverage

The 80% line-coverage floor is set for the whole project. Build and Test checks it on the full suite (`npx vitest run tests/ --coverage`). A scoped run does not judge it.

## Mocking and test data

- Fixtures go in `tests/fixtures/cost/`: two shards (`hosta-aaaaaaaaaaaa.md`, `hostb-bbbbbbbbbbbb.md`) with `STAGE_COMPLETED` cost rows, a ledger, a snapshot, and a copy of the 261113-cost-and-models shard's cost rows. They contain no real personal data.
- File tests write to a temporary project folder under `tests/.tmp/` (as the existing token-readings tests do) and clean up after themselves.
- `os.hostname()` is stubbed with `vi.spyOn` where the host fallback is tested.
- Renderer tests pass a `perIntent` object with `machines` and `partial` directly; no IPC is mocked.
