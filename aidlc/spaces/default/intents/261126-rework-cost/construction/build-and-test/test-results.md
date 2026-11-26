# Test Results: US-1301 Rework cost

Branch `feat/US-1301`, with `origin/main` merged in (`d407177`), 2026-11-26.

| Check | Command | Result |
|---|---|---|
| Story tests | `npx vitest run tests/main/rework.test.js tests/renderer/CostTab.test.jsx tests/renderer/CostPanel.test.jsx tests/main/i18nKeys.test.js tests/main/featureDocsStatus.test.js` | 56 passed |
| Full suite with coverage | `npx vitest run tests/ --coverage` | 3,067 passed, 1 skipped, 1 failed (see below); the coverage floor held (no threshold error) |
| Feature docs, rerun | `npx vitest run tests/main/featureDocsStatus.test.js` | 10 passed |
| ESLint | `npx eslint .` | clean |
| Prettier | `npx prettier --check .` | clean |

`src/main/rework.js`: 100% line coverage (code-summary.md).

## After merge with main

- **What was wrong:** merging `main` into the branch conflicted in `docs/features/epic-13-insights.md`, `docs/FEATURES.md` and the token log. The full-suite run then failed `featureDocsStatus.test.js`, because the EPIC-13 row stood twice in `docs/FEATURES.md`.
- **Cause:** while the merge was unresolved, the app's planning sync read `docs/FEATURES.md` with its conflict markers. It committed and pushed that text to `main` (`f56b8f7`), then wrote its own 🚧 EPIC-13 row back into the branch's working tree. The sync checks for neither a merge in progress nor conflict markers. The conflict in FEATURES.md was missed at first because only the last lines of git's output were read.
- **Fix:** the branch keeps its ✅ text for the epic file. The token logs were merged as one sorted list (the 27 readings on `main` were all among the branch's 47). The duplicate row was removed. `main` was fixed in `6597203` (markers removed, US-0056 added as the fix story).
- **New results:** the feature-docs test passes, 10 of 10. All other files passed in the full run.
- **Lesson:** read git's whole merge output, and resolve a merge quickly while the app is open, until US-0056 makes the sync wait.
