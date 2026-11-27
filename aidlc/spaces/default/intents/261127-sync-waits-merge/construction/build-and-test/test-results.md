# Test Results — US-0056

Run 2026-11-27 on `fix/US-0056` (base `origin/main` a38e42f).

| Check | Command | Result |
|---|---|---|
| Full suite + coverage | `npx vitest run tests/ --coverage` | 208 files; 3,200 passed, 1 skipped, 0 failed |
| Line coverage | v8, `src/**` | 94.13% (floor 80%); `planningSync.js` 96.75% |
| ESLint | `npx eslint .` | clean |
| Prettier | `npx prettier --check .` | clean |
| Build | `npm run build` | built (`dist/THADEUS-0.3.1-universal.dmg`, unsigned) |
| Traceability | `aidlc engine sensor-traceability --stage build-and-test` | pass, 3 of 3 AC covered |

## New tests (7)

- `tests/main/planningSync.test.js`, US-0056 block (real git, bare origin): merge, rebase and cherry-pick in progress give `error.kind 'merge'`, record nothing, push nothing and leave the conflicted file alone (AC1); markers on `main` and a replayed editor save with markers give `error.kind 'markers'` naming `docs/FEATURES.md`, with no commit (AC2); after the merge is finished the next cycle runs without error and leaves the merged file as it is (AC3).
- `tests/renderer/FeaturesView.test.jsx`: the merge sentence, and the markers sentence with the file name.

Red before the fix: merge and cherry-pick pushed the conflicted file (`pushed: true`), which is the reported bug. The AC3 test passed before the fix too and stays as a guard.
