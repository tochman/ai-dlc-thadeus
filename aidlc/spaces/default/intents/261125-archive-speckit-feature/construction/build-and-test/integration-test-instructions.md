# Integration test instructions

- **Setup:** vitest with real files in temporary folders, and Playwright on the built app (Electron's Chromium). Nothing is installed.
- **Marks and features reader together:** `npx vitest run tests/main/speckitArchive.test.js tests/main/speckitFeatures.test.js`
- **Handlers:** `npx vitest run tests/main/ipc.test.js tests/main/preload.test.js`
- **Round trip in the built app:** `npx electron-vite build`, then `npx playwright test tests/e2e/speckitLayout.spec.js`. The test named `US-1411` archives and unarchives from the keyboard, checks the mark on disk, where focus goes, the filter, the layout, and a mark that appears as after a pull.
- **Test data:** a temporary Spec Kit project made by the spec; no agent, network or real project.
- **Coverage:** the project's 80% line floor, from `npx vitest run tests/ --coverage`.
