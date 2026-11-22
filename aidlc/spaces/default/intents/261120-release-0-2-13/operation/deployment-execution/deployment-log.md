# Deployment Log: v0.2.13 (2026-11-20)

## Story merges (Q1: B, then held back the record; Q2: A)

1. US-0609 committed on `feat/US-0609` (9aa5d8e) with the codekb, memory, `intents.json`, the hotfix audit and the spec-kit record. This release's own record and token log are held back for the intent-close commit on `main`: committed on a branch, they make `featureDocsStatus` fail until every story in the release is marked done.
2. Each story's feature docs marked ✅ Done, for v0.2.13, with its criteria ticked, on its own branch.
3. Squash-merged in build order. Before each later story merged, `main` was merged into its branch (FEATURES.md rows and the EPIC-00 status line conflicted; each story's line was kept) and the full suite, ESLint and Prettier were rerun:

| PR | Story | Merge commit | CI before merge |
|---|---|---|---|
| #88 | US-0035 | aede4d5 | green |
| #89 | US-0036 | 5f09bb6 | green |
| #90 | US-0609 | f34a6fa | green |
| #91 | US-0510 | e2ab7e0 | not waited for (the person's call) |
| #92 | US-0415 | 6bf42aa | not waited for (the person's call) |

## After all five merged (`main` at 6bf42aa)

Full suite: 2,071 passed, 1 skipped, 1 failed. ESLint 0 errors, Prettier clean. The one failure is `featureDocsStatus`: US-1102 and US-1103 still say 📋 Planned, read from this release's uncommitted record. It clears when those two docs stories are done. Nothing else needs fixing.

## Docs stories and release

4. US-1103 and US-1102 in docs PR #93 (README rewrite, six screenshots, animated GIF), merged without waiting for CI (the person's call). Repository topics `electron`, `ai-agents`, `developer-tools`, `aidlc` set on the person's word.
5. Release PR #94 `release: v0.2.13`: `package.json` 0.2.13, all seven stories "Released in v0.2.13". The running app reset `docs/releases/0.2.13.md` on the branch, so it was committed by blob. Merged as 137ee2d without waiting for CI and without the `.dmg` hand check: the person chose to ship and fix any bug in the next release.
6. Tag `v0.2.13` on 137ee2d. Run 44737806692: verify, build-mac, build-linux and release all succeeded. Published: https://github.com/tochman/ai-dlc-thadeus/releases/tag/v0.2.13

Rollback if needed: `gh release edit v0.2.13 --prerelease`; fix forward as v0.2.14 (`rollback-runbook.md`).
