# Build Instructions: US-0215

- **Dependencies:** `npm ci` (Node from `.nvmrc`). No new dependency in this story.
- **Environment:** none. The rebuild reads `~/.claude/projects/` and the intent's audit files at run time; tests use temp folders of their own.
- **Bundle:** `npx electron-vite build` (main, preload, renderer into `out/`). The packaged `.dmg` (`npm run build`) is the manual release check, not this stage's.
- **Verify:** the bundle exits 0; then `npm run coverage`, `npm run lint`, `npm run format:check`.
- **Troubleshooting:** a Prettier failure is fixed with `npx prettier --write <file>`; a native-module error after a Node change is fixed with `npm ci` (its `postinstall` rebuilds node-pty).
