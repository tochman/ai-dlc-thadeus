# Rollback Runbook: US-0030

Rollback is fix forward (team.md).

1. **Before the merge:** close the pull request; `main` is untouched.
2. **After the merge, before a tag:** revert the squash commit on `main` through its own pull request (`git revert <sha>`), or fix forward on a new `fix/` branch.
3. **After the v0.2.10 tag:** mark the release as a prerelease so the updater stops offering it: `gh release edit v0.2.10 --prerelease`. Write the fix as an EPIC-00 story and ship it as v0.2.11. Do not delete the tag.
4. **Check:** an installed earlier version is no longer offered v0.2.10; the next patch passes the manual `.dmg` check.

Who decides: the person (tech lead and product owner are the same here).
