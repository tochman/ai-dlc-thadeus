# Rollback Runbook: v0.2.15

The project fixes forward (team.md § Deployment).

- **Trigger:** the release is broken, or the smoke test fails after publishing.
- **Stop the updater from offering it:** `gh release edit v0.2.15 --prerelease`. v0.2.14 becomes the latest again.
- **Fix:** add an EPIC-00 story, fix it on a `fix/<story>` pull request, and ship it as v0.2.16.
- **Keep:** the tag `v0.2.15` is not deleted.
- **Before the tag:** a failed `.dmg` hand check is not a rollback. Fix it as an EPIC-00 story first, then tag.
- **Tag CI fails before publishing:** nothing is published. Fix it on `main` through a pull request, delete the unpublished tag, and set it again on the fixed commit, as was done for v0.2.9. Only with the person's OK.
- **Escalation:** the person, maintainer of `tochman/ai-dlc-thadeus`, decides.
