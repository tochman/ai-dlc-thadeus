# Test Results: Release v0.2.14

Final run 2026-11-22 on `release/v0.2.14`, which merges every v0.2.14 story (US-0037, US-0038, US-0039, US-0040, US-0041, US-0042, US-0905, US-0417, US-0416, US-1203) plus the new README and screenshots.

| Check | Command | Result |
|-------|---------|--------|
| Unit and component tests | `npx vitest run tests/ --coverage` | 157 files, 2,189 passed, 1 skipped, 0 failed |
| Line coverage (floor 80%) | v8, same run | 92.74% lines, 90.57% statements, 83.78% branches, 88.01% functions |
| Build | `npx electron-vite build` | built |
| End-to-end (built app) | `npx playwright test` | 2 passed (planning on main; planning on a story branch) |
| ESLint | `npx eslint .` | 0 errors, 30 warnings (react-hooks/exhaustive-deps, pre-existing pattern) |
| Prettier | `npx prettier --check .` | clean |

Per branch, before the final merge: each story's own branch ran its targeted tests Red then Green and the full suite green (see `code-summary.md`).

## Found while taking the screenshots

The intent tabs wrapped onto two rows and the pipeline drew over the second row: two parallel builds each defined `.lcars-tile`, and one set a 140 px minimum width. Fixed test-first on `feat/US-0417` (`af6d849`, a CSS test in `theme.test.js`) and carried up the branch chain; the retaken screenshots show one row.

## After merge with main

The story branches were cut from `e7ad18b`, a docs commit the app later rewrote on `main`. Merging them into `feat/US-0417` conflicted only on docs and `.thadeus` files (taken from `main`) and on two CSS blocks in `src/renderer/theme.css` where two branches made the same drawer fix (kept one) or both added rules (kept both). Lesson: branch stories from the current `origin/main` and keep docs out of story branches.

## Not covered by automated tests (manual, before or after the release)

- The LCARS layout in the running app (jsdom has no layout).
- US-0039: a line typed into a busy Claude Code or opencode session reaching the running turn; `/aidlc --resume` showing the gate again after a park.
- US-1203: the GitHub review-thread read (`gh api graphql`) on a real pull request.
- The built macOS `.dmg` (team rule, before the tag).
