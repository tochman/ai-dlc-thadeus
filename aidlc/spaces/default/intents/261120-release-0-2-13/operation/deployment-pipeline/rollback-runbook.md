# Rollback Runbook: v0.2.13

The project fixes forward (team.md § Deployment).

- **Trigger:** the release is broken, or the smoke test fails after publishing.
- **Stop the updater offering it:** `gh release edit v0.2.13 --prerelease`. v0.2.12 becomes the latest again.
- **Fix:** add an EPIC-00 story, fix it on a `fix/<story>` PR, ship it as v0.2.14.
- **Keep:** the tag `v0.2.13` is not deleted.
- **Before the tag:** a failed hand check or a red story PR is not a rollback. Fix it on that story's branch (or as an EPIC-00 story in this release) before the release PR merges.
- **One story at fault after merge:** revert its squash commit on `main` through a PR, rerun the suite, and move the story to the next release.
- **Escalation:** the person (maintainer of `tochman/ai-dlc-thadeus`) decides.
