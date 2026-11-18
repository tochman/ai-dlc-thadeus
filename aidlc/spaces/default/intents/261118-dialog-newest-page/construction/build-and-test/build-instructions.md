# Build Instructions — US-0031

- **Dependencies:** `npm ci` (Node from `.nvmrc`). No new dependency in this change.
- **Environment:** none beyond the repository; tests need no env vars or services.
- **Build check:** `npx electron-vite build` bundles main, preload and renderer into `out/`. The packaged `.dmg` (`npm run build`) is the release step, checked by hand before a tag.
- **Lint and format (changed files):** `npx eslint <files>` and `npx prettier --check <files>`.
- **Tests:** `npx vitest run tests/ --coverage` (full suite, 80% line floor in `vitest.config.mjs`).
- **Troubleshooting:** `tests/main/agentHooksGuard.test.js` times real `sh` hook runs against a 100 ms limit and fails on a heavily loaded machine; rerun it when the load is lower.
