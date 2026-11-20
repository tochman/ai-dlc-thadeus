# Rules: U6 u6-speckit-features

Source-of-truth rules for U6, story US4.1 (US-1402). Sources:
- U6 in `unit-of-work.md` and its row in `unit-of-work-story-map.md`;
- FR6, NFR3, NFR5 and NFR7 in `requirements.md`;
- contract C5 in `contract-summary.md`;
- a throwaway project made with `specify init` (Spec Kit 1.4.3), which settles C5's open question (see `functional-spec.md`).

```yaml
rules:
  - id: BR6.1
    statement: Each direct subfolder of `specs/` is one feature. Its number and name come from the folder name.
    category: calculation
    applies_to: Feature list
    trigger: speckit:features
    logic: IF the name matches YYYYMMDD-HHMMSS-<name> THEN number = the timestamp; ELSE IF it matches <3+ digits>-<name> THEN number = the digits; ELSE number = null and name = the whole folder name. Features are sorted by folder name.
    violation: none; an unrecognised folder is still listed, under its folder name
    source: FR6.1
  - id: BR6.2
    statement: The active feature is the folder that `.specify/feature.json` names in `feature_directory`.
    category: validation
    applies_to: Active feature
    trigger: speckit:features
    logic: Read `feature_directory` (relative, or absolute under the project root). IF it resolves to an existing folder directly under specs/ THEN that feature is active ELSE active = null.
    violation: a missing file gives active null with no error; an unreadable or invalid file, or one naming a missing folder, gives active null plus an errors entry with the reason
    source: FR6.1
  - id: BR6.3
    statement: The flow steps are worked out from the files, and the view says so.
    category: calculation
    applies_to: Feature flow
    trigger: speckit:features
    logic: spec = spec.md exists; clarify = spec.md has a `## Clarifications` heading; plan = plan.md exists; tasks = tasks.md exists; implement = tasks.md has at least one task outside Convergence phases and all of them are ticked; converge = at least one Convergence phase exists and all its tasks are ticked.
    violation: none; a step that cannot be read shows as not done and the file goes in errors
    source: FR6.2
  - id: BR6.4
    statement: tasks.md is read as phases of task lines. A Convergence phase is a round.
    category: calculation
    applies_to: Task list
    trigger: speckit:features
    logic: A phase starts at `## Phase <n>: <title>`. A task line is `- [ ]` or `- [x]`/`- [X]`, then an ID T<digits>, an optional `[P]`, an optional `[US<n>]`, then text. A phase titled Convergence gets round 1, 2, ... in file order; other phases get round null. done and total count every task; tasks before the first phase heading go in a phase with an empty name.
    violation: a line that starts with `- [` but does not match is skipped and counted in skipped
    source: FR6.3
  - id: BR6.5
    statement: Every file of a feature is listed and opens in the artifact reader.
    category: policy
    applies_to: Feature files
    trigger: speckit:features, then a click in the detail view
    logic: List the regular files in the feature folder and one level of subfolders (contracts/, checklists/), as root-relative paths, sorted. Symbolic links are left out. A click opens the path in the existing artifact reader, read-only.
    violation: a folder that cannot be listed goes in errors; the other features still show
    source: FR6.4
  - id: BR6.6
    statement: U6 never writes under `.specify/` or `specs/`.
    category: constraint
    applies_to: All U6 main-process code
    trigger: any U6 call
    logic: The reader uses read and list calls only. A test runs every U6 reader on a fixture project with a write spy and asserts no write there.
    violation: a test failure; there is no write path to fall back to
    source: NFR3
  - id: BR6.7
    statement: A change under `specs/` or to the feature or version file reaches the open view within 2 seconds.
    category: policy
    applies_to: Watcher
    trigger: a file change
    logic: Watch `.specify/feature.json`, `.specify/init-options.json` and each feature folder with its subfolders through `watchFiles` (debounce 300 ms, at most 800 ms). On a change, push `speckit:changed { projectId, paths }` and rebuild the watch paths, so a new feature folder is watched from then on.
    violation: a watcher error is logged; the view still shows the last read and refreshes on reopen
    source: FR6.5, NFR7
  - id: BR6.8
    statement: With no feature folders, the view says there are no features yet and offers `/speckit-specify`.
    category: policy
    applies_to: Empty state
    trigger: features = []
    logic: IF specs/ is missing or has no subfolder THEN show the empty text and a button that sends `/speckit-specify ` to the agent terminal through C7; nothing runs without the click.
    violation: none
    source: FR6.1, FR5.4
  - id: BR6.9
    statement: A Spec Kit version other than v1.4.x is named in a warning.
    category: validation
    applies_to: Version note
    trigger: speckit:features
    logic: found = `speckit_version` in `.specify/init-options.json`, else `version` in `.specify/integrations/speckit.manifest.json`, else null. supported = found is 1.4.x. IF not supported THEN the view shows a warning naming the version, or saying it is unknown, and still reads everything it can.
    violation: none; the warning is the outcome
    source: NFR5
  - id: BR6.10
    statement: What cannot be read is named with the reason, and never hides the rest.
    category: policy
    applies_to: Errors
    trigger: any failed read
    logic: Each failed read adds { path, reason } to errors. The view lists them under the features.
    violation: none
    source: NFR5
```

| Rule | In short |
|---|---|
| BR6.1 | Folder name gives number (or timestamp) and name |
| BR6.2 | `feature.json` names the active feature |
| BR6.3 | Flow steps from files, said so |
| BR6.4 | tasks.md phases, tasks, skipped lines, rounds |
| BR6.5 | Every file opens in the artifact reader |
| BR6.6 | No writes under `.specify/` or `specs/` |
| BR6.7 | Change shows within 2 s |
| BR6.8 | Empty state offers `/speckit-specify` |
| BR6.9 | Version warning outside v1.4.x |
| BR6.10 | Unreadable files named with the reason |
