# Rollback Runbook: US-0802 Set up AI-DLC for another harness

- **Before the merge:** close the PR.
- **After the merge:** run `git revert -m 1 <merge-sha>` on a branch from `main`, then `npm ci && npx vitest run tests/`, then open and merge the revert PR once CI is green.
- **Data:** the app stores nothing new. Any harness the app installed in a project is AI-DLC's own files. They are removed with AI-DLC's tools or `git checkout` in that project, not by this revert.
- **Who decides:** the repository owner.
