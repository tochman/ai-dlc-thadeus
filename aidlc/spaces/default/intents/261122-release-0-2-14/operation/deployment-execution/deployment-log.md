# Deployment Log: v0.2.14

| Time (UTC) | Step | Result |
|------------|------|--------|
| 2026-11-22 11:11 | Release PR #95 `release: v0.2.14` from `release/v0.2.14` (all ten stories as their own commits, README and screenshots, version 0.2.14, Released markers) | opened |
| 11:11–11:18 | PR CI: `verify` (3m34s), `build-linux` (1m41s), `build-mac` (2m45s); `release` skipped | green |
| 11:19 | Merged with a merge commit, `aed0e5c release: v0.2.14 (#95)` | merged |
| 11:19 | Tag `v0.2.14` (annotated) on `aed0e5c`, pushed | pushed |
| 11:19–11:25 | Tag CI run 45016718178: verify, builds, `release` | success (6m0s) |
| 11:25 | GitHub release "T.H.A.D.E.U.S. v0.2.14", Latest, not prerelease | published |

Decisions for this release (audit log): one release PR with story commits kept instead of one PR per story; no hand check of the `.dmg` before the tag.
