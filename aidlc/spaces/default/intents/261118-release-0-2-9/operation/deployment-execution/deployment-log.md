# Deployment Log: v0.2.9 (2026-11-18)

1. Release PR #72 `release: v0.2.9` from `release/v0.2.9`: CI green (verify, build-mac, build-linux). Squash-merged as 839442a.
2. The person installed the `.dmg` from #72's `build-mac` run and checked it by hand: About shows 0.2.9, and every owed check (FR2.1–FR2.4) passed (Q1: A).
3. First tag `v0.2.9` on 839442a. Its run failed in `verify`: `featureDocsStatus` found 11 stories still marked "for v0.2.9" while the tag existed. Nothing was built or published.
   - **Cause:** the plan put the "Released in v0.2.9" markers after the tag. v0.2.8 carried them in the release PR.
   - **Fix (the person chose it):** docs PR #73 marked the 11 stories and ticked the checklist; CI green; merged as 6875687. The unpublished tag was deleted and set again on 6875687.
   - **Lesson:** the release PR carries the "Released in vX.Y.Z" markers.
4. Tag run 44262550889: verify, build-mac, build-linux and release all succeeded. The release is published, marked latest, not a prerelease: https://github.com/tochman/ai-dlc-thadeus/releases/tag/v0.2.9
5. The release notes were edited: the "For users on v0.2.8 or earlier" note is at the top, above the generated changelog (FR5).

Rollback if needed: `gh release edit v0.2.9 --prerelease`; fix forward as v0.2.10 (`rollback-runbook.md`).
