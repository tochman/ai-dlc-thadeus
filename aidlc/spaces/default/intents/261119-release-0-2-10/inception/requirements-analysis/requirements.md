# Requirements: v0.2.10 release

## Intent

Ship v0.2.10 ("Clearer views of past and present work"): the six stories in `docs/releases/0.2.10.md` (US-0028, US-0029, US-0215, US-0030, US-0608, US-0031), all ✅ Done and merged into `main` (last: US-0031, #79). The person asked on 2026-11-19: "once this pr is merged, we want to release 0.2.10". The release follows team.md § Deployment and the v0.2.9 release (`261118-release-0-2-9`), whose decisions are reused here (see Assumptions).

## Functional requirements

- **FR1 Release pull request.** Branch `release/v0.2.10` from `main` bumps `package.json` and `package-lock.json` from 0.2.9 to `0.2.10`. It merges as `release: v0.2.10 (#NN)` once CI is green.
  - **FR1.1** CI on the release PR passes: `verify` (suite, coverage ≥ 80%, ESLint, Prettier), `build-mac` and `build-linux`.
- **FR2 Released markers in the release PR.** The same PR marks every slice story "Released in v0.2.10": its status marker, its epic's `**Status (…)**` line, its `FEATURES.md` row and the release-plan table, and ticks the checklist in `docs/releases/0.2.10.md`. This happens before the tag, because the tag's `verify` refuses "for vX.Y.Z" markers (v0.2.9 lesson). `tests/main/featureDocsStatus.test.js` passes.
- **FR3 Hand checks before the tag.** The person checks each story in the built app before the tag. A failure becomes an EPIC-00 fix story shipped in this release, before the tag.
  - **FR3.1** US-0028: a new intent's pipeline view shows no missing-`runtime-graph.json` warning.
  - **FR3.2** US-0029: moving a story to another release takes its row out of the old release plan.
  - **FR3.3** US-0215: a finished intent shows its token history (or the "no time history on this machine" sentence) and the figures strip.
  - **FR3.4** US-0030: Agent progress shows "waiting for <agent>" only while a permission is open, and an agent's task and "seen N ago".
  - **FR3.5** US-0608: a planning change waits visibly until it is on `main`, and is kept across a restart.
  - **FR3.6** US-0031: the dialog opens on a new compact / fresh-session page, not on an old answered message.
- **FR4 The `.dmg` check.** The `.dmg` comes from the release PR's `build-mac` CI artifact (`gh run download <run> -n mac`). The person installs and opens it, and About shows 0.2.10.
- **FR5 Tag and publish.** After the merge, tag `v0.2.10` on the merge commit of `main` and push it. `release.yml` publishes a regular release marked latest with the `.dmg`, the `.deb` and `SHA256SUMS.txt`.
- **FR6 Smoke test.** After publishing: all three files are present; a v0.2.9 install is offered the update; the installed app shows 0.2.10 in About.

## Non-functional requirements

- **NFR1** The release PR carries no story code, only the version bump and the docs, unless an FR3 failure adds a fix story.
- **NFR2** Rollback is fix forward: a broken release is marked as a prerelease (`gh release edit v0.2.10 --prerelease`), the fix ships as v0.2.11, and the tag stays.

## Constraints

- There is no staging environment. The gates run in this order: hand checks and the `.dmg` check, green CI, the merge, the tag.

## Assumptions

- As in v0.2.9 (Q1: A, Q2: A): every hand check is done before the tag, and the `.dmg` is the CI artifact, not a local build. Reason: same team practice, and a local `.dmg` from a worktree can miss packages.
- The hand checks are the person's own. I prepare the build, list what to check, and wait for their result.
- No manual-download note is needed: v0.2.9 already lives at `ai-dlc-thadeus`, so its updater finds v0.2.10.

## Out of scope

- New stories, and the stories moved to v0.3.0 (US-0609, US-0508, US-0804, US-0805).
- Automating the hand checks.

## Open questions

None.
