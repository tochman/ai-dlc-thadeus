# Rollback Runbook: v0.2.9

The project fixes forward (team.md, NFR2).

- **Trigger:** the release is broken, or a smoke test (FR7) fails after publishing.
- **Stop the updater offering it:** `gh release edit v0.2.9 --prerelease`. v0.2.8 becomes the latest again.
- **Fix:** add an EPIC-00 story, fix it on a `fix/<story>` PR, and ship it as v0.2.10.
- **Keep:** the tag `v0.2.9` is not deleted.
- **Before the tag:** a failed hand check is not a rollback. It is fixed in this release before step 4 of the deployment strategy.
- **Escalation:** the person (maintainer of `tochman/ai-dlc-thadeus`) decides.
