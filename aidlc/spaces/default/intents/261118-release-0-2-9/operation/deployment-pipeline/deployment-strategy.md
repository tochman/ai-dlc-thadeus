# Deployment Strategy: v0.2.9

It's a desktop app, released by tag, with no staging. The gates run in this order (team.md § Deployment, requirements FR1–FR7):

1. Open the release PR `release: v0.2.9` from `release/v0.2.9` and wait for green CI (FR1.1).
2. Download the `.dmg` from the PR's `build-mac` run (`gh run download <run> -n mac`). The person installs it, and About shows 0.2.9 (FR3).
3. The person does every owed hand check in that build: US-0213/US-0026, US-0214, US-0210 and US-0303 (FR2). A failure becomes an EPIC-00 fix in this release before step 4.
4. Squash-merge the PR, then tag `v0.2.9` on the merge commit and push the tag (FR4).
5. When `release` has published, add the rename note to the top of the release notes with `gh release edit v0.2.9 --notes-file …` (FR5).
6. Mark every slice story "Released in v0.2.9" and tick the release checklist (FR6). This goes straight to `main` as a docs commit.
7. Smoke test (FR7): all three files are present and the checksums match; About shows 0.2.9; an install of 0.2.9 reports itself up to date.
