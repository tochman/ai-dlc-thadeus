# Rollback Runbook: US-0701 i18n foundation and English

## Before the merge

- Close the PR without merging. `main` is untouched.

## After the merge

1. Find the merge commit: `gh pr view <number> --json mergeCommit`.
2. Revert it on a branch: `git checkout -b revert-us0701 main && git revert -m 1 <merge-sha>`. Use `git revert <sha>` without `-m 1` for a squash merge.
3. Run `npm ci && npx vitest run tests/`. The old suite of 116 tests should pass.
4. Open and merge the revert PR once CI is green.

## Data

- The only stored data is `language` in the app's own `settings.json`. Older builds ignore the unknown key, so no clean-up is needed.

## Who decides

- The repository owner, who merges and reverts the PR.
