# Build Instructions: release v0.2.13

## The five stories together
The five stories (U1 US-0035, U2 US-0036, U3 US-0609, U4 US-0510, U5 US-0415) each have their own branch. Build and Test runs them merged in one worktree, `.claude/worktrees/v0213-assembled`:
1. `git worktree add --detach .claude/worktrees/v0213-assembled HEAD` (on `feat/US-0609`, which holds U2).
2. Merge `fix/US-0035`, `feat/US-0510`, `feat/US-0415` one at a time. Only the feature-doc status lines conflict (`docs/FEATURES.md`, `docs/features/epic-00-fixes.md`): keep each story's 🚧 line.
3. Apply U3's uncommitted changes from the main checkout (its diff, plus `src/main/thadeusSync.js` and `tests/main/thadeusSync.test.js`).
4. Link `node_modules` from the main checkout.

## Dependencies and environment
Node from `.nvmrc`; `npm ci` in a fresh clone. `git` on PATH (the planning and sync tests make temporary repositories). No env vars or services.

## Build
`npx electron-vite build` (the `build` script also packages a `.dmg`; that stays the manual release check).

## Checks
- `npx vitest run tests/ --coverage` (80% line floor, `vitest.config.mjs`)
- `npx eslint .` and `npx prettier --check .`

## Troubleshooting
- A merge conflict outside the feature-doc status lines is a real clash between stories: stop and look.
- Vitest writes no coverage report when a test fails; fix the test first.
