# Deployment Log: US-0801 Choose the harness per project

| Step | Result |
|------|--------|
| Feature docs: EPIC-08 status line, US-0801 marked 🚧 Built, merged to main, not released, its 7 acceptance criteria ticked, the EPIC-08 row in `docs/FEATURES.md`; EPIC-09 added | Done |
| Branch `feat/us0801-harness-choice` created from `origin/main` (b2f89e6, the PR #13 merge) | Done |
| Commit `5e83d38` feat: EPIC-08 US-0801 (code, tests, docs) | Done |
| Commit `970f0e9` chore: AI-DLC records (this intent, the refreshed code map, the US-0701 deployment records) | Done |
| PR #14 opened: https://github.com/tochman/aidlc-dash/pull/14 | Done |
| CI on PR #14: verify pass (48 s), build-mac pass (1m23s), build-linux pass (1m54s), release skipped (no tag) | Green |
| PR #14 merged with a merge commit, `a19b0b42` on `main` | Done |

- **No tag:** none was asked for.
- **Rollback:** `operation/deployment-pipeline/rollback-runbook.md`, which reverts `a19b0b42` with `-m 1`.
