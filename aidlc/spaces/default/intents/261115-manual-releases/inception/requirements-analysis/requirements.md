# Requirements: US-0605, create a release by hand in the release list

## Intent analysis

The person plans what ships when before any story is marked for a release. Today a release exists only through a story's "for vX.Y.Z" marker or a git tag, so an empty release cannot be planned. The release list in the Features view should let them create a release, fill it with stories one at a time, remove stories, and delete an empty release. Enhancement across main (parser, file store, IPC) and renderer (release list). Depth: Minimal.

## Functional requirements

- **FR1 Create a release.** Under the Releases delivery setting, "New release" in the release list asks for a version `vX.Y.Z`.
  - **FR1.1** The next patch, minor and major after the latest `vX.Y.Z` tag are suggested (today `releaseOptions()` offers only patch and minor).
  - **FR1.2** A version not shaped `vX.Y.Z`, or one that already exists (a tag, a story marker or a plan file), is refused with a message.
  - **FR1.3** The release is stored as `docs/releases/X.Y.Z.md` (no `v` in the file name, as the existing `0.2.3.md` and `0.2.4.md`), containing only the heading `# Release plan vX.Y.Z` [Q1].
- **FR2 Plan files are releases.** Every `docs/releases/X.Y.Z.md` counts as a release, the existing ones too [Q1].
  - **FR2.1** A plan file's release shows in the release list (planned when untagged, released when tagged), merged with the same version from markers and tags, and is offered in every story's release picker.
  - **FR2.2** It survives an app restart, and the view reloads when a file in `docs/releases/` is added, changed or removed.
- **FR3 Add and remove stories.** From a planned release in the list, a story not yet in it can be added, one at a time [Q2].
  - **FR3.1** Adding writes the story's "for vX.Y.Z" marker the same way as from the story (US-0603 FR2.2, `setStoryRelease`).
  - **FR3.2** A story in the release can be removed there too, which clears its marker as the story's own picker does.
  - **FR3.3** The next add waits until the view has reloaded, so a write never goes out with stale file hashes.
- **FR4 Delete.** A planned release with no stories, no tag and a plan file that holds only its heading can be deleted, which removes the file [Q3].
  - **FR4.1** A release with stories, a tag, or text beyond the heading in its plan file shows no delete action (or a disabled one that says why).
- **FR5 Continuous deployment.** With the Continuous delivery setting, New release, add, remove and delete are hidden, as the rest of the release list is.
- **FR6 Translations.** Every new text goes through `t()` in `sv.json` and `en.json`.

## Non-functional requirements

- **NFR1 Safe writes.** Creating a plan file never overwrites an existing file; deleting refuses a file that changed since it was read; all paths stay inside the project root (`resolveInRoot`).
- **NFR2 No new dependency.**
- **NFR3 Errors are said.** A failed create, delete or marker write shows one sentence in the release list and leaves the files as they were.

## Constraints

- Brownfield: reuse `buildReleases()`, `releaseOptions()`, `setStoryRelease`/`setReleaseMarker`, `writeAtomic`, `featureWatchPaths`.
- The plan files are the person's documents: the app only ever creates a heading-only file and deletes a heading-only file.

## Assumptions

- [assumption] The plan file's heading is `# Release plan vX.Y.Z`, as in the existing files; a file whose name is not `X.Y.Z.md` is ignored. Reason: Q1 keeps the existing folder's convention.
- [assumption] `ReleasesView` gets the project id (it lacks it today) to call the new actions. Reason: scan finding.
- [assumption] "Remove from release" clears the marker, the same as choosing no release in the story's picker. Reason: US-0603 behaviour.

## Out of scope

- Editing a release plan's text in the app (US-1001's file editor can open it).
- A goal or target date per release (the story notes room for it later).
- Adding several stories in one action (Q2).

## Open questions

None.

## Sources

- Initial description: US-0605 in `docs/features/epic-06-feature-docs.md` [desc]
- Workflow-selected scope: express [scope]
- Answers in `requirements-analysis-questions.md` [Q1] [Q2] [Q3]
- Code scan: `inception/reverse-engineering/developer-scan.md`, codekb `aidlc/spaces/default/codekb/aidlc-dash/`
