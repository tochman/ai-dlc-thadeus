# Build Instructions

- **Prerequisites:** Node from `.nvmrc`, `npm ci`, and git on PATH. `gh` is optional: without it, a protected `main` falls back to a pull request opened by hand.
- **Build the bundles:** `npx electron-vite build`, which writes `out/main`, `out/preload` and `out/renderer`.
- **Package (release only):** `npm run build:mac` or `npm run build:linux`.
- **Verify:** `npm run coverage` (full suite plus coverage), `npm run lint` (0 errors required) and `npm run format:check`.
- **Troubleshooting:** `planningSync.test.js` uses real git repos in the OS temp folder and runs serially (the `TIMED` list in `vitest.config.mjs`). The "cloned an empty repository" warnings come from its fixtures and are expected.
