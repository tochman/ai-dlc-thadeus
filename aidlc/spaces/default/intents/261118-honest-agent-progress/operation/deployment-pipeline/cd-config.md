# CD Configuration: US-0030

No pipeline change. The existing `.github/workflows/release.yml` carries this work as it is:

| Trigger | Job | What it does |
|---------|-----|--------------|
| Pull request into `main` | `verify` | `npm ci`, the full `npx vitest run tests/` suite; a failure blocks the merge |
| Tag `vX.Y.Z` | `verify`, then `build-mac`, `build-linux`, `release` | Checks the tag equals `package.json`, builds the macOS universal `.dmg` and the Linux `.deb`, publishes a GitHub release marked latest with `--generate-notes`, the packages and `SHA256SUMS.txt` |

For US-0030: the story's pull request from `fix/US-0030` runs `verify`; the change ships with the v0.2.10 tag, cut by the release pull request (`release/v0.2.10`).

Promotion matrix: branch `fix/US-0030` → PR (CI `verify` green) → squash-merge to `main` → (release PR bumps `package.json`, manual `.dmg` check) → tag `v0.2.10` → GitHub release. No staging environment.
