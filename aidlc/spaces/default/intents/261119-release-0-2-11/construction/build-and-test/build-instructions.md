# Build Instructions — v0.2.11 release

- **Dependencies:** `npm ci` (Node from `.nvmrc`); none added.
- **Build:** `npx electron-vite build` (exit 0 locally). Packages are built by CI on the release PR (`build-mac` universal `.dmg`, `build-linux` `.deb`).
- **Tests:** `npx vitest run tests/ --coverage` (80% line floor in `vitest.config.mjs`); run with nothing heavy alongside, because the hook timing test (`tests/main/agentHooksGuard.test.js`) is load-sensitive.
- **Lint and format:** `npx eslint .` and `npx prettier --check .`.
- **`.dmg` for the hand check:** the release PR's artifact, `gh run download <run id> -n mac` (PR #83).
- **Release:** after the merge, the tag `v0.2.11` drives `.github/workflows/release.yml` (checks the tag against `package.json`, builds, publishes with `--generate-notes`).
