# Integration Test Instructions: Release v0.2.14

- Full suite (unit, component, main-process integration with real temporary git repos): `npx vitest run tests/ --coverage`
- Built-app end-to-end (Playwright through Electron): `npx electron-vite build && npx playwright test`
- CI runs both on every pull request into `main` and on the version tag (`.github/workflows/release.yml`).

Key boundaries this release touches: the planning sync's rebase and push (US-0038, real git repos in `planningSync.test.js`), the handoff commands typed into agent sessions (US-0039), the project watcher's change payload (US-0041), and the review data from `gh`/`glab`/Bitbucket (US-1203, platform fixtures).
