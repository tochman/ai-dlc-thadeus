# Requirements — US-0603 Releases or continuous deployment

## Intent

Let each project say how it ships, and plan releases in the app: mark stories for a release, see each release with its stories, and keep the story lifecycle rule in every project's AI-DLC memory in step with that choice. Sources: the story in `docs/features/epic-06-feature-docs.md` and the answers in `requirements-analysis-questions.md` (Q1: all nine criteria in v0.2.5).

## Functional requirements

**FR1 Delivery setting.**
- FR1.1 Each project has a setting, **Releases** or **Continuous deployment**, in the project settings dialog. It is stored with the other per-project settings (`PROJECT_DEFAULTS`), and the default is Releases.

**FR2 Mark a story for a release** (Releases only).
- FR2.1 The story detail has a release picker (Q3: A). It lists:
  - the planned releases (versions found in "for vX.Y.Z" markers),
  - the next patch and next minor version after the latest `vX.Y.Z` git tag,
  - **None**.
- FR2.2 Choosing a version writes "for vX.Y.Z" into the story's status line in its epic file. Choosing None removes it. The story's part of the epic's `**Status (…)**` line and of its `FEATURES.md` row changes the same way. Nothing else in the files changes, byte for byte.
- FR2.3 Writes go through the root-confined `writeFileSafe` with the file's last-read hash, so a file changed on disk is refused, not overwritten. A refusal is shown to the person.
- FR2.4 A story that is already released ("Released in vX.Y.Z") cannot be re-marked.

**FR3 Release list** (Releases only).
- FR3.1 A **Releases** view beside Epics in the feature docs view (Q2: A) lists each release with its stories and their status.
- FR3.2 Planned releases come from the story markers. Released ones come from the project's `vX.Y.Z` git tags, with the tag's date. Newest first.
- FR3.3 Clicking a story opens its detail, as in the epic view.

**FR4 Continuous deployment.**
- FR4.1 With Continuous deployment, the release picker and the Releases view are hidden.
- FR4.2 Stories gain a last status, **🚀 Deployed**, after ✅ Done.

**FR5 Lifecycle rule follows the setting.**
- FR5.1 The rule's text depends on the setting:
  - Releases: 📋 → 🚧 → ✅ → "for vX.Y.Z" → "Released in vX.Y.Z" at the tag.
  - Continuous deployment: 📋 → 🚧 → ✅ → 🚀 Deployed at deploy.
- FR5.2 For every project opened in the app, not only at feature-docs setup, the app reads the project's AI-DLC memory. When the rule is missing, is an older version, or belongs to the other setting, the project view shows a notice with a button that types the add-or-update request into the agent tab; the person presses Enter (Q4: A, as in US-0003).
- FR5.3 Changing the setting shows the same notice for the new rule.

**FR6 Views and status check understand 🚀 Deployed.** This covers:
- the parser (`statusOf`),
- the epic and story counts, colours and status filter,
- `tests/main/featureDocsStatus.test.js`.

**FR7 Stale release marker.** A story still marked "for vX.Y.Z" when tag `vX.Y.Z` exists is flagged:
- in the Releases view and the story detail, in the app;
- in `featureDocsStatus.test.js`, in this repository.

**FR8 Language.** Every new text goes through `t()`, with the same keys in `sv.json` and `en.json`.

## Non-functional requirements

- **NFR1** The marker write changes only the marker text: a test compares the files before and after, byte for byte apart from the marker.
- **NFR2** Git tags are read with one `git` command per project load (`git tag --list 'v*' --format=…`), with no network access. A project without git, or without tags, shows planned releases only, with no error.
- **NFR3** Tests are written first (TDD); the full suite stays green and line coverage stays at or above 80%.

## Constraints

- No new dependency and no new data store: the release markers are the docs' own format.
- File writes stay inside the project root (`projectAccess` / `fileWrite`). The app never edits AI-DLC memory files itself; the agent saves the rule through AI-DLC.

## Assumptions

- The rule carries a version tag the app can find, for example `(story-lifecycle: releases v2)`, so "older" and "other setting" can be told apart. A rule without the tag counts as older. [assumption]
- The app reads `aidlc/spaces/<active-space>/memory/project.md` to find the rule. [assumption]
- 🚀 Deployed is set by the person or the agent when deploying, as the rule says. The app does not detect deployments. [assumption]

## Out of scope

- Creating tags or releases from the app (the release workflow does that).
- Filtering stories by release in the epic view (US-0604).

## Open questions

None.
