# CD Config: v0.2.13

The pipeline is `.github/workflows/release.yml`, unchanged in this release. No CI Pipeline or Infrastructure Design stage ran (ultra-express); this is the existing pipeline, read from the workspace.

| Trigger | Jobs | Output |
|---|---|---|
| Each story PR into `main` (`fix/US-0035`, `fix/US-0036`, `feat/US-0609`, `feat/US-0510`, `feat/US-0415`) | `verify` (gitleaks, suite with coverage, ESLint, Prettier, built-app e2e), then `build-mac` and `build-linux` | Run artifacts only. `release` is skipped |
| Release PR `release/v0.2.13` into `main` | the same jobs | The `.dmg` for the hand check |
| Tag `v0.2.13` | the same jobs, then `release` | GitHub release marked latest, `--generate-notes`, the `.dmg`, the `.deb` and `SHA256SUMS.txt` |

`verify` checks the tag equals the `package.json` version (0.2.13). No feature flags: each story ships on when merged.
