# Deployment Strategy: US-0418

1. Squash-merge the story PR into `main`.
2. Open a `release/v0.3.3` PR that bumps `package.json` and marks the stories "Released in v0.3.3". Merge it once CI is green.
3. Tag `v0.3.3` on `main` and push the tag. release.yml publishes the build.

Smoke test: the release has all three files, an earlier install is offered the update, and About shows 0.3.3. The person chose to skip the hand check of the `.dmg` for this release (message d3cb87b3).
