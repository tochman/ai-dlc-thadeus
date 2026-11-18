# Build Instructions: US-0029 release row move

- **Dependencies:** `npm ci` (Node from `.nvmrc`). No new dependencies.
- **Environment:** none needed for the build or the tests.
- **Build:** `npx electron-vite build`, which writes `out/main`, `out/preload` and `out/renderer`. The packaged `.dmg` (`npm run build`) is only needed for the hand check before a release tag.
- **Verify:** the build ends with `✓ built` for all three targets and exit 0.
- **Troubleshooting:** a worktree whose `node_modules` is a symlink can miss packages in a packaged build; use the CI artifact for the `.dmg`.
