# Requirements: v0.2.11 release

## Intent

Ship v0.2.11 ("One committer per feature-doc change, and commit subjects that name only the stories that changed"): the two stories in `docs/releases/0.2.11.md` (US-0032, US-0033), both ✅ Done and merged into `main` (#81, #82). The person asked on 2026-11-19: "we need to release 0.2.11 now". The Spec Kit stories moved to v0.3.0 the same day. The release follows team.md § Deployment and the v0.2.10 release (`261119-release-0-2-10`), whose decisions are reused here (see Assumptions).

## Functional requirements

- **FR1 Release pull request.** Branch `release/v0.2.11` from `main` bumps `package.json` and `package-lock.json` from 0.2.10 to `0.2.11`. It merges as `release: v0.2.11 (#NN)` once CI is green.
  - **FR1.1** CI on the release PR passes: `verify` (suite, coverage ≥ 80%, ESLint, Prettier), `build-mac` and `build-linux`.
- **FR2 Released markers in the release PR.** The same PR marks US-0032 and US-0033 "Released in v0.2.11": each story's status marker, EPIC-00's `**Status (…)**` line, its `FEATURES.md` row and the release-plan table, and ticks the checklist in `docs/releases/0.2.11.md`. This happens before the tag, because the tag's `verify` refuses "for vX.Y.Z" markers. `tests/main/featureDocsStatus.test.js` passes.
- **FR3 Hand checks before the tag.** The person checks each story in the built app before the tag. A failure becomes an EPIC-00 fix story shipped in this release, before the tag.
  - **FR3.1** US-0032: in Configuration › Cost Rules of a project that already has the THADEUS rule pack, the new line "On `main`, NEVER commit `docs/FEATURES.md`, `docs/features/` or `docs/releases/`; THADEUS commits and pushes them." is offered, added with the button, and saved only through the preview. Its AC3 (an agent on `main` that changes a feature doc leaves exactly one commit, the app's) is checked in the same session.
  - **FR3.2** US-0033: after a change to one story's text on `main`, the app's commit subject names that story only (for example `docs: update US-0033`), and a change to more than five stories ends with "and N more".
- **FR4 The `.dmg` check.** The `.dmg` comes from the release PR's `build-mac` CI artifact (`gh run download <run> -n mac`). The person installs and opens it, and About shows 0.2.11.
- **FR5 Tag and publish.** After the merge, tag `v0.2.11` on the merge commit of `main` and push it. `release.yml` publishes a regular release marked latest with the `.dmg`, the `.deb` and `SHA256SUMS.txt`.
- **FR6 Smoke test.** After publishing: all three files are present; a v0.2.10 install is offered the update; the installed app shows 0.2.11 in About.

## Non-functional requirements

- **NFR1** The release PR carries no story code, only the version bump and the docs, unless an FR3 failure adds a fix story.
- **NFR2** Rollback is fix forward: a broken release is marked as a prerelease (`gh release edit v0.2.11 --prerelease`), the fix ships as the next patch, and the tag stays.

## Constraints

- There is no staging environment. The gates run in this order: hand checks and the `.dmg` check, green CI, the merge, the tag.
- The app's planning sync commits feature-doc changes on `main` (US-0608, US-0032). The release markers are written on the release branch, so they travel in the release PR.

## Assumptions

- As in v0.2.9 and v0.2.10: every hand check is done before the tag, and the `.dmg` is the CI artifact, not a local build. Reason: same team practice, and a local `.dmg` from a worktree can miss packages.
- The hand checks are the person's own. I prepare the build, list what to check, and wait for their result.
- Today's docs commits on `main` (for example `ed87b5a`) still name every story because the app running now is v0.2.10; US-0033 is checked in the built v0.2.11 app.

## Out of scope

- New stories, and the stories moved to v0.3.0, v0.3.1 and v0.3.2.
- Automating the hand checks.

## Open questions

None.
