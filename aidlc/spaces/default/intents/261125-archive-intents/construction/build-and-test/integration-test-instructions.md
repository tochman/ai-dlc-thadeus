# Integration test instructions

- **Setup:** vitest with real git repositories in temporary folders, and Playwright on the built app (Electron's Chromium). Nothing is installed.
- **Commit with the planning sync:** `npx vitest run tests/main/archiveCommit.test.js tests/main/planningSync.test.js`
- **Handlers:** `npx vitest run tests/main/ipc.test.js tests/main/preload.test.js`
- **Layout in the built app:** `npx electron-vite build`, then `npx playwright test`
- **AI-DLC's real commands (NFR3):** `aidlc intent archive` and `aidlc intent unarchive` on one complete intent in a throwaway clone. AI-DLC's checks stop an agent from running them, so the person does.
- **Coverage:** the project's 80% line floor, from `npx vitest run tests/ --coverage`.
