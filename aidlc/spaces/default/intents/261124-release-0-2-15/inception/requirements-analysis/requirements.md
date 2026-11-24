# Requirements: release v0.2.15

## Intent analysis

Publish v0.2.15 with its five merged stories: US-0044, US-0045, US-0046, US-0508 and US-0043 [desc]. The release adds no new code [desc].

## Functional requirements

- **FR1** A release pull request from `release/v0.2.15` [desc]:
  - **FR1.1** It bumps `package.json` and `package-lock.json` to `0.2.15`.
  - **FR1.2** It marks every slice story "Released in v0.2.15": the story marker, the epic `**Status (…)**` line, the `FEATURES.md` row, and the table and Progress line in `docs/releases/0.2.15.md`. The plan's table also sets US-0508 and US-0043, which are still shown as 📋 Planned, and the Progress line reads 5 of 5 [memory].
  - **FR1.3** It adds a release checklist to `docs/releases/0.2.15.md`, as v0.2.14 has, and ticks it.
  - **FR1.4** It carries `docs/releases/0.2.15.md`, staged by blob if the app strips it from the branch, so the squash merge cannot delete it from `main` [memory].
- **FR2** The built macOS `.dmg` is checked by hand before the tag. It is built locally from the release branch with `npm run build:mac`, and the person opens it and confirms the app starts and its About shows 0.2.15 [Q1].
- **FR3** The release pull request is squash-merged as `release: v0.2.15 (#NN)` without waiting for its CI [Q3]. The tag's own `verify` run still checks it.
- **FR4** The tag `v0.2.15` is set on the merge commit on `main` and pushed. The `release.yml` run (verify, build-mac, build-linux, release) completes, and the GitHub release has the `.dmg`, the `.deb` and `SHA256SUMS.txt` [memory].
- **FR5** The intent record and the token log are committed to `main` afterwards as `chore: close the v0.2.15 release record` [memory].

## Non-functional requirements

- **NFR1** `tests/main/featureDocsStatus.test.js` and `releaseVersion.test.js` pass with the tag present. No "for v0.2.15" marker is left behind [memory].

## Constraints

- On `main`, the app commits feature-doc edits itself. The markers therefore go on the release branch [memory].
- Rollback is fix forward: mark the release as a prerelease and ship v0.2.16.

## Assumptions

- No README screenshot refresh: the only visible change is the rename field [Q2].

## Out of scope

- New screenshots or a GIF [Q2].
- The Spec Kit intent, which is picked up after this release [desc].

## Open questions

None.
