# CD Config: v0.2.15

The pipeline is `.github/workflows/release.yml`. The only change since v0.2.14 is that the lint step now runs `npx eslint . --max-warnings 0` (US-0043, #116). No CI Pipeline or Infrastructure Design stage ran (ultra-express), so this describes the existing pipeline as read from the workspace.

| Trigger | Jobs | Output |
|---|---|---|
| Story pull requests into `main` (#114, #115, #116), all merged | `verify` (gitleaks, suite with coverage, ESLint, Prettier, built-app e2e) | Checks only |
| Release pull request `release/v0.2.15` (#117) | `verify`, `build-mac`, `build-linux` | Run artifacts; `release` is skipped |
| Tag `v0.2.15` | the same jobs, then `release` | A GitHub release marked latest, `--generate-notes`, with the `.dmg`, the `.deb` and `SHA256SUMS.txt` |

On a tag, `verify` checks that the tag equals the `package.json` version (0.2.15). There are no feature flags: each story is on once merged.
