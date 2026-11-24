# Build Instructions: US-0045

Run in the worktree `.claude/worktrees/fix-0045` (branch `fix/US-0045`).

1. **Dependencies:** `npm ci`. Node is pinned by `.nvmrc`.
2. **Environment:** nothing extra. The tests use fakes for the hook channel and `window.bridge`.
3. **Build:** `npx electron-vite build`.
4. **Verify:** `npx playwright test`, the built-app tests.
5. **Troubleshooting:** the timed `scripts` tests can miss their timing under heavy load. They retry twice and pass when run alone.
