# Code Summary: US-0209 an intent's cost counts every machine

All 19 plan steps were built test first. The full suite `npx vitest run tests/` passes: 118 files, 1459 tests.

## Files

- **New:**
  - `src/main/parsers/auditCost.js`: rollup parsing, last row per shard/stage/Unit, merge.
  - `src/main/usageSnapshot.js`: snapshot build, write, read, local clone.
- **Changed:**
  - `src/main/projectService.js`: `loadCrossMachineCost`.
  - `src/main/ipc.js`: `project:cost` uses it and writes the snapshot.
  - `src/main/watcher.js`: shard and `.thadeus/usage` changes set `costChanged`.
  - `src/renderer/CostTab.jsx`: `MachinesLine`.
  - `src/renderer/CostPanel.jsx`.
  - `src/shared/locales/sv.json`, `en.json`.
- **Tests:**
  - New: `tests/main/auditCost.test.js`, `usageSnapshot.test.js`, `crossMachineCost.test.js`, `tests/renderer/CostTab.test.jsx`.
  - Extended: `tests/main/ipc.test.js`, `watcher.test.js`, `fileWrite.test.js`, `tests/renderer/CostPanel.test.jsx`.
  - Fixtures: `tests/fixtures/cost/`.

## Key decisions

- **One cost shape.** Shard rows, snapshots and the merge all use the ledger's own shape. `loadCrossMachineCost` builds a combined ledger and runs the existing `summarizeLedger` on it, so the scope breakdown, timeline and `perIntent` shape stay as they were and `ledger.js` is unchanged.
- **`MachinesLine` sits in `CostTab.jsx`, not `CostPanel.jsx`.** `CostPanel` already imports from `CostTab`, so the planned placement would have made a circular import.
- **`project:cost`:**
  - It answers `available: true` when there are audit rows but no ledger.
  - It writes the snapshot only when there is both a ledger and a clone id, without waiting for the write, and only when the content changed.
  - Token readings still come from the local ledger only.
- **Snapshot or shard rows for another machine:** the larger total wins, and a tie keeps the snapshot.
- **An intent without a uuid** is matched by its folder name.
- **Watcher:** the ledger workaround became a helper, `watchFilesIn`, which watches from two folder levels up because `.thadeus/` can be missing at start.

## Deviations from the plan

- Step 5 did not export `costOf`/`addCost`; the shared ledger shape made that unnecessary.
- `tests/main/fileWrite.test.js` lists the modules allowed to call `writeAtomic`. `usageSnapshot.js` was added to it, the same way US-0208 added `tokenReadings.js`.

## Loop-back 1 (from Build and Test)

- **`src/main/ipc.js`:** the unused `_reason` binding is gone. The code now copies `rest` and deletes `reason` from the copy, and `project:cost` returns the same answer as before.
- **Prettier:** `prettier --write` was run on `auditCost.js`, `usageSnapshot.js`, `projectService.js` and `auditCost.test.js`.
- **Results:**
  - `npx eslint .`: 0 errors, 24 existing warnings.
  - Scoped tests: 94 passed.
  - Full suite: 1459 passed.
  - `npx prettier --check .`: it now flags only the three untracked `.thadeus/tokens/*.json` readings the running app wrote on this machine. They are not in this work's diff and are not in a CI checkout.

## Shortcuts (`ponytail:`)

- **Cache writes:** the audit's `Cache Write` has no 5m/1h split, so all of it counts as 5m.
- **Host name:** with no shard yet, it comes from `os.hostname()`, lowercased. If that differs from AI-DLC's own host naming, one clone could end up with two snapshot files. Reading resolves them by the larger total.

## Tests not executed here

- **Coverage floor:** the 80% floor was not measured. Build and Test runs `npx vitest run tests/ --coverage`.
- **Built app:** no test opens the built app. The machines line, the "partial" tag, and the snapshot file appearing and then staying unchanged across reloads are checked by hand before the release.
