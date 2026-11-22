# CD Config: v0.2.14

The pipeline is `.github/workflows/release.yml`, unchanged in this release (ultra-express: no CI Pipeline or Infrastructure Design stage; this is the existing pipeline).

| Trigger | Jobs | Output |
|---|---|---|
| Release PR `release/v0.2.14` into `main` (all ten stories as their own commits, plus README, screenshots, version bump and Released markers) | `verify` (gitleaks, suite with coverage, ESLint, Prettier, built-app e2e), then `build-mac` and `build-linux` | Run artifacts only; `release` is skipped |
| Tag `v0.2.14` | the same jobs, then `release` | GitHub release marked latest, `--generate-notes`, the `.dmg`, the `.deb` and `SHA256SUMS.txt` |

`verify` checks the tag equals the `package.json` version (0.2.14), and `featureDocsStatus.test.js` refuses "for v0.2.14" markers once the tag exists, so the Released markers go in the release PR. No feature flags.
