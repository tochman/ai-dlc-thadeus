# Build Instructions — v0.2.10 release

- **Dependencies:** `npm ci` (Node from `.nvmrc`); none added.
- **Tests:** `npx vitest run tests/ --coverage` (80% line floor in `vitest.config.mjs`); run with nothing heavy alongside, because the hook timing test (`tests/main/agentHooksGuard.test.js`) is load-sensitive.
- **Packages:** CI builds them on the release PR (`build-mac` universal `.dmg`, `build-linux` `.deb`). The `.dmg` for the hand check is the PR's artifact: `gh run download 44469193059 -n mac`.
- **Release:** after the merge, the tag `v0.2.10` drives `.github/workflows/release.yml` (checks the tag against `package.json`, builds, publishes with `--generate-notes`).
