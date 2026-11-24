# Build Instructions: US-0044

Run everything in the worktree `.claude/worktrees/fix-0044` (branch `fix/US-0044`).

1. **Dependencies:** `npm ci`. Node is pinned by `.nvmrc`.
2. **Environment:** nothing extra. The built-app tests make their own temp project and temp userData (`THADEUS_E2E_USER_DATA`), with tool paths that point nowhere.
3. **Build:** `npx electron-vite build`, which writes `out/main`, `out/preload` and `out/renderer`.
4. **Verify the build:** `npx playwright test`, which opens the built app through Electron.
5. **Troubleshooting:** if the built-app tests time out on launch, rebuild first, because they run `out/main/index.js`. The `scripts` vitest project (the timed `dialog.sh` tests) can miss its timing under heavy load: it retries twice, and passes when run alone.
