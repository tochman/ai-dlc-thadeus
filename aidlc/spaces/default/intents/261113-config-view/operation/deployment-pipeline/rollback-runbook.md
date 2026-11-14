# Rollback Runbook: US-0901 See a project's AI-DLC configuration

- **Before the merge:** close the PR.
- **After the merge:** run `git revert -m 1 <merge-sha>` on a branch from `main`, then `npm ci && npx vitest run tests/`, then open and merge the revert PR once CI is green.
- **Data:** the view writes nothing, in the app's settings or in a project, so there is nothing to clean up.
- **Who decides:** the repository owner.
