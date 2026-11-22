# Rollback Runbook: v0.2.14

The project fixes forward (team.md § Deployment).

- **Trigger:** the release is broken, or the smoke test fails after publishing.
- **Stop the updater offering it:** `gh release edit v0.2.14 --prerelease`; v0.2.13 becomes the latest again.
- **Fix:** add an EPIC-00 story, fix it on a `fix/<story>` PR, ship it as v0.2.15.
- **Keep:** the tag `v0.2.14` is not deleted.
- **Before the tag:** a red release PR is not a rollback; fix it on `release/v0.2.14` (or as an EPIC-00 story) before it merges.
- **One story at fault after merge:** its commits are kept on `main`; revert them through a PR, rerun the suite, and move the story to the next release.
- **Escalation:** the person (maintainer of `tochman/ai-dlc-thadeus`) decides.
