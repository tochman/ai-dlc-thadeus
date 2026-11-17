# CD Configuration

No pipeline change. This work ships through the existing `.github/workflows/release.yml`:

- **On a pull request into `main`:** the `verify` job runs the test suite. The story PR `feat(US-0606, US-0607): …` must be green before the squash merge.
- **On a `vX.Y.Z` tag:** the workflow checks that the tag equals `package.json`, builds the macOS universal `.dmg` and the Linux `.deb`, and publishes a GitHub release marked latest with `--generate-notes` and `SHA256SUMS.txt`.
- **Target release:** v0.2.9. US-0606 and US-0607 are already planned for it in `docs/releases/0.2.9.md`. The release itself runs as its own workflow, after the other v0.2.9 stories.
- **New runtime dependency at the user's end:** `git` (already required). `gh` is optional: without it, a protected `main` falls back to a pull request opened by hand.
