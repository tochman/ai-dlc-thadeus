# Requirements: v0.2.9 release

## Intent

Ship v0.2.9 ("Less waste"): the eleven stories in `docs/releases/0.2.9.md`, all ✅ Done and merged into `main` (last: US-0214, #71). The release follows team.md § Deployment. Answers: `requirements-analysis-questions.md` Q1–Q3.

## Functional requirements

- **FR1 Release pull request.** Branch `release/v0.2.9` from `main` bumps `package.json` (and `package-lock.json`) from 0.2.8 to `0.2.9`. It merges as `release: v0.2.9 (#NN)` once CI is green.
  - **FR1.1** CI on the release PR passes: `verify` (suite, coverage ≥ 80%, ESLint, Prettier), `build-mac` and `build-linux`.
- **FR2 Hand checks before the tag (Q1: A).** Every owed hand check is done in the built app before the tag. A failure becomes an EPIC-00 fix story shipped in this release, before the tag.
  - **FR2.1** US-0213/US-0026: resume at a gate after `/clear`, the PreCompact instruction, real opencode events, the LCARS look.
  - **FR2.2** US-0214: Agent progress shows live hook rows for the main chat and a dispatched agent; the legend toggles hide/show series and rescale the y-axis.
  - **FR2.3** US-0210: the model-profile question shows within 2 s.
  - **FR2.4** US-0303: the Velocity view shows intent, story and project metrics.
- **FR3 The `.dmg` check (Q2: A).** The `.dmg` comes from the release PR's `build-mac` CI artifact (`gh run download <run> -n mac`). The person installs it, opens it, and About shows 0.2.9.
- **FR4 Tag and publish.** After the merge, tag `v0.2.9` on the merge commit of `main` and push it. `release.yml` publishes a regular release marked latest, with the `.dmg`, the `.deb` and `SHA256SUMS.txt`.
- **FR5 The manual-download note (Q3: A).** The note goes at the top of the GitHub release notes, edited in after publishing, and in `docs/releases/0.2.9.md`. It says users on v0.2.8 or earlier must download v0.2.9 by hand once, because the app moved to `ai-dlc-thadeus` (US-0027).
- **FR6 Feature docs.** Every story in the slice gets marked "Released in v0.2.9": its status marker, its epic's `**Status (…)**` line and its `FEATURES.md` row. The release checklist in `docs/releases/0.2.9.md` gets ticked. `tests/main/featureDocsStatus.test.js` passes.
- **FR7 Smoke test.** After publishing: all three files are present; a v0.2.9 install reports itself current; About shows 0.2.9. An earlier install is not offered the update across the rename, and FR5's note covers that.

## Non-functional requirements

- **NFR1** No story code changes in the release PR, only the version bump, unless an FR2 failure adds a fix story.
- **NFR2** Rollback is fix forward: a broken release is marked as a prerelease (`gh release edit v0.2.9 --prerelease`), the fix ships as v0.2.10, and the tag stays.

## Constraints and assumptions

- There is no staging environment. The gates run in this order: hand checks and `.dmg` check, then green CI, the merge and the tag.
- The hand checks are the person's own. I prepare the build and list what to check, and I wait for their result.

## Out of scope

- New stories, and US-0215.
- Automating the hand checks.
