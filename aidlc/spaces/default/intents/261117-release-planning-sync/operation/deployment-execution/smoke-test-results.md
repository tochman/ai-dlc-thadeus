# Smoke Test Results

| Check | Where | Result |
|-------|-------|--------|
| Full suite on the PR (`verify`) | GitHub Actions | pass |
| macOS and Linux packages build | GitHub Actions (`build-mac`, `build-linux`) | pass |
| LCARS look of the pending block, interval field and docs branch field | dev app, checked by the person | looks right |

Still owed, at the `.dmg` check before the v0.2.9 tag (deployment-strategy.md): planning from a story branch reaches the remote with the checkout unchanged, and the `gh` merge on a protected `main`.
