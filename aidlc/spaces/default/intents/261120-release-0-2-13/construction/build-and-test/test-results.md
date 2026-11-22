# Test Results: release v0.2.13 (run 1, 2026-11-20)

Where: the merged worktree `.claude/worktrees/v0213-assembled` (all five stories, see `build-instructions.md`). Node and jsdom; no real browser.

## Build
`npx electron-vite build`: exit 0.

## Lint and format
- `npx eslint .`: exit 0, 0 errors, 29 warnings (`react-hooks/exhaustive-deps`, all there before these stories).
- `npx prettier --check .`: exit 0.

## Tests
`npx vitest run tests/ --coverage`: exit 1. 155 files: 154 passed, 1 failed. 2,073 tests: 2,071 passed, 1 failed, 1 skipped.

The unit commands from the five `unit-test-instructions.md` files are all subsets of this run on the same tree, so they were not run again. Every test file they name passed.

### Failure
`tests/main/fileWrite.test.js` > writeAtomic (US-0506 u4 RD33) > "is imported only by fileWrite.js, agentHooks.js, … and planningSync.js (SD36)".
`expect(users).toEqual([...])`: the list of importers now also holds `main/thadeusSync.js`.

Cause: U3 (US-0609) writes the `.thadeus` and harness files in its worktree with `writeAtomic` (`src/main/thadeusSync.js:56`), but did not add itself to SD36's allow-list and its reason comment. The unit's own test command does not include `fileWrite.test.js`, so the unit's checks were green.

## Coverage
No report: vitest writes none when a test fails. The 80% floor is Unverified until the suite is green.

## Failure handling
Gated (no autonomy grant). The candidate fix goes to the person: add `main/thadeusSync.js` to SD36's list with a reason line (it writes only paths `isThadeusPath` or the harness table accept, resolved in its worktree root). Loop-backs used: 0/3.

## Run 2 (2026-11-20, after loop-back 1)
Same merged worktree, with US-0609's fix copied in (`tests/main/fileWrite.test.js`).
- `npx vitest run tests/ --coverage`: exit 0. 155 files passed. 2,073 tests: 2,072 passed, 1 skipped.
- Coverage (v8): lines 92.42%, statements 90.26%, branches 83.34%, functions 87.6%. The 80% floor and every per-file floor hold. `thadeusSync.js` 85.71% lines.
- Build, ESLint and Prettier: unchanged since run 1 apart from the fixed test file, which is lint- and format-clean.

## Loop-Back Log

### Loop-back 1 — 2026-11-20T11:05:00Z
- Diagnosis: `fileWrite.test.js` SD36 fails; `src/main/thadeusSync.js` imports `writeAtomic` and is not on the allow-list.
- Root-cause stage: code-generation, unit u3-thadeus-sync (US-0609).
- Planned fix: add `main/thadeusSync.js` to SD36's expected list in `tests/main/fileWrite.test.js`, with a `// US-0609 …` reason line like the others; add `fileWrite.test.js` to U3's unit test command.
- Estimated impact: effort about 10 minutes; financial cost none; risk low. Chosen by the person ("Retry with fix").
