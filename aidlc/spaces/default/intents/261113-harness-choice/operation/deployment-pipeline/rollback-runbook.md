# Rollback Runbook: US-0801 Choose the harness per project

- **Before the merge:** close the PR; `main` is untouched.
- **After the merge:**
  1. Run `git revert -m 1 <merge-sha>` on a branch from `main`.
  2. Run `npm ci && npx vitest run tests/`. The 138 tests from before should pass.
  3. Open the revert as a PR and merge it once CI is green.
- **Data:** the only new stored value is `projectSettings[root].harness` in the app's own `settings.json`. Older builds ignore it, so nothing needs cleaning up.
- **Who decides:** the repository owner.
