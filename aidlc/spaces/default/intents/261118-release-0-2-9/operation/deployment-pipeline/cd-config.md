# CD Config: v0.2.9

The pipeline is `.github/workflows/release.yml`, unchanged in this release.

| Trigger | Jobs | Output |
|---|---|---|
| PR into `main` (`release/v0.2.9`) | `verify` (suite, coverage, ESLint, Prettier), then `build-mac` and `build-linux` | `.dmg` and `.deb` as run artifacts. `release` is skipped |
| Tag `v0.2.9` | the same jobs, then `release` | GitHub release marked latest, with `--generate-notes`, the `.dmg`, the `.deb` and `SHA256SUMS.txt` |

The `release` job checks that the tag equals the `package.json` version (0.2.9).
