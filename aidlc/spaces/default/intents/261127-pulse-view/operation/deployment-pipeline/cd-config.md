# CD Config: US-0418

No change. The existing `.github/workflows/release.yml` runs when tag `vX.Y.Z` is pushed: `verify` (tag matches package.json, gitleaks, coverage tests, ESLint, Prettier, end-to-end tests), then `build-mac` and `build-linux`, then `release` (SHA256SUMS.txt and a GitHub release).
