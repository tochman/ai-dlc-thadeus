# Integration test instructions

This release changes only the version and the docs, so its boundaries are the release checks and the packaging:

| Boundary | Check | Runs in |
|---|---|---|
| Version ↔ feature docs ↔ release plan | `tests/main/releaseVersion.test.js`, `featureDocsStatus.test.js`, `releasesPlan.test.js`, `releases.test.js` | Node |
| Tag ↔ `package.json` | `release.yml` `verify` job on the tag | CI |
| Built app | Playwright end-to-end in `verify`; `.dmg` hand check before the tag | Electron's Chromium (CI); a real Mac (by hand) |

Run the full suite once: `npx vitest run tests/ --coverage`.
