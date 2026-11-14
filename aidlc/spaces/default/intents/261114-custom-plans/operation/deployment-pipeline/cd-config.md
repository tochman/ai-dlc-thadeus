# CD configuration: v0.2.4

## Pipeline

The existing pipeline, `.github/workflows/release.yml`, is used as it is. v0.2.4 changes nothing in it: the five stories are app code, and the Monaco editor is bundled by `electron-vite build`, which both build jobs already run.

| Job | Runs on | Trigger | Does |
|-----|---------|---------|------|
| `verify` | ubuntu-latest | PR to `main`, tag `v*.*.*` | On a tag, checks that the tag equals the `package.json` version. Then `npm ci` and `npx vitest run tests/`. |
| `build-mac` | macos-latest | after `verify` | `npm run build:mac`, unsigned (`CSC_IDENTITY_AUTO_DISCOVERY=false`), uploads `dist/*.dmg`. |
| `build-linux` | ubuntu-22.04 | after `verify` | `npm run build:linux` and `scripts/check-glibc.mjs` (glibc 2.35 / GLIBCXX_3.4.30), uploads `dist/*.deb`. |
| `release` | ubuntu-latest | tag only | Writes `SHA256SUMS.txt` over the `.dmg` and `.deb`, then `gh release create` with the three files and `--generate-notes`. |

## Feature flags

None. It is a desktop app with no backend. Anyone who does not want the update can skip it in the updater.

## Environment promotion

| Step | Where | Gate |
|------|-------|------|
| Local build | your Mac (`npm run build:mac`, `dist/THADEUS-0.2.4-universal.dmg`) | you check the four views [Q1] |
| Release PR | GitHub Actions, PR run of `release.yml` | tests green, both platforms build |
| Release | GitHub Releases in `tochman/aidlc-dash`, "latest" | tag equals `package.json`; your check after publishing |

There is no staging. The PR run is the automatic gate before anything is published.

## Security

- `permissions: contents: read` everywhere. Only the `release` job gets `contents: write`.
- No secret besides `github.token`. The build is unsigned because it is internal and the repo is private.
- `SHA256SUMS.txt` lets the updater reject a corrupt or swapped download. It does not protect against someone who can write to the repo.
- No change to permissions, secrets or signing in this release, so there are no new security implications.
