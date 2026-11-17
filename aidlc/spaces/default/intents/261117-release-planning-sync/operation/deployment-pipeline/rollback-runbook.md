# Rollback Runbook

**Trigger:** the planning sync pushes something wrong, loops, or blocks the release list after v0.2.9 is out.

1. Mark the release as a prerelease so the updater stops offering it: `gh release edit v0.2.9 --prerelease`. Do not delete the tag.
2. Add an EPIC-00 story for the fix and ship it as the next patch version (fix forward).
3. **Repair the data at the user's end, if needed:**
   - A wrong planning commit on `main` is undone with `git revert <sha>` on `main` (docs only, so it may go straight to `main`).
   - A wrong commit on the docs branch is fixed the same way on that branch.
   - The local record is `<userData>/planning/<hash>.json`. Deleting it drops the pending actions. Remove the temporary worktrees with `git worktree prune`, and the app's branch with `git branch -D dash/planning`.
4. **Verify:** the release list shows no pending changes, and `git status` in the checkout matches what it showed before.
