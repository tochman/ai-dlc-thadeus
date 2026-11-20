# Functional Spec: U6 u6-speckit-features (US4.1 / US-1402)

This spec implements US4.1 in `stories.md` (AC4.1.1–AC4.1.6), assigned to U6 in `unit-of-work-story-map.md` and described in `unit-of-work.md`. It covers FR6, NFR3, NFR5 and NFR7 in `requirements.md` and provides contract C5 (`speckit:features`, push `speckit:changed`) in `contract-summary.md`. The rules are in `rules.md` (BR6.1–BR6.10). Domain Design was skipped, so the boundaries follow the code: U6 fills the empty `SpeckitShell.jsx` that U1 left in the left arm.

## What the test project settled (C5's open question)

A project made with `specify init --integration claude` (Spec Kit 1.4.3) shows:
- `.specify/feature.json` is `{"feature_directory":"specs/001-name"}`; the path may be absolute.
- Feature folders are `NNN-name` (3 or more digits) or `YYYYMMDD-HHMMSS-name`.
- `/speckit-clarify` adds a `## Clarifications` section to `spec.md`. `/speckit-analyze` writes nothing. `/speckit-checklist` writes `checklists/*.md`, which are listed as files, not as a flow step.
- `/speckit-implement` ticks tasks with `[X]`. `/speckit-converge` only appends `## Phase N: Convergence`, or leaves `tasks.md` unchanged when nothing is left.
- The version is in `.specify/init-options.json` (`speckit_version`).
- Claude Code gets skills named `speckit-<name>`, so C7's `/speckit-<name>` form holds for Claude Code.

## Workflow: read the features

1. The project view opens a Spec Kit project, and `SpeckitFeatures` (in place of the shell's empty text) calls `speckit:features(projectId)`.
2. The main side reads the version (BR6.9) and `feature.json` (BR6.2), then each folder under `specs/` (BR6.1).
3. For each feature it reads which files exist and `tasks.md` (BR6.3, BR6.4), and lists the files (BR6.5).
4. It returns the C5 shape. Every failed read goes in `errors` (BR6.10). Nothing is written (BR6.6).
5. The view shows the list, the active mark, the version warning when there is one, and the errors.
6. A click on a feature opens its detail: the flow with the note that it is worked out from the files, the tasks by phase with the count, and the files. A click on a file opens it in the artifact reader.
7. A change under `specs/` or in the watched `.specify/` files pushes `speckit:changed` (BR6.7), and the view calls step 1 again. The open feature stays selected while its folder still exists.

## Flow state per feature

The flow is not a state machine Spec Kit keeps. It is read from the files each time (BR6.3):

| Step | Done when |
|---|---|
| spec | `spec.md` exists |
| clarify | `spec.md` has `## Clarifications` |
| plan | `plan.md` exists |
| tasks | `tasks.md` exists |
| implement | every task outside Convergence phases is ticked (at least one task) |
| converge | at least one Convergence phase, and all its tasks ticked |

```mermaid
flowchart LR
  spec --> clarify --> plan --> tasks --> implement --> converge
  converge -->|new round appended| implement
```

Text fallback: the steps run spec, clarify, plan, tasks, implement, converge. A converge that appends tasks sends the feature back to implement for that round.

## Main-side modules

- `src/main/parsers/speckitTasks.js`: `parseTasks(text)` gives `{ done, total, skipped, phases }` (BR6.4). A pure function, so most tests need no files.
- `src/main/speckitFeatures.js`: `loadSpeckitFeatures(root)` gives the C5 result, and `speckitWatchPaths(result)` gives the paths for BR6.7. It uses the existing read and list helpers only.
- `ipc.js` registers `speckit:features` and starts the watcher the same way `syncFeaturesWatch` does, for a project whose framework is `speckit`. The preload exposes `speckitFeatures(projectId)` and `onSpeckitChanged(cb)`.

## Assumptions

- A clean `/speckit-converge` leaves no trace, so converge shows done only after a round was appended and ticked. The view's "worked out from the files" note covers this.
- A new feature folder is seen through `feature.json`, which `/speckit-specify` writes, and then watched. With `SPECIFY_FEATURE_NO_PERSIST` set, it shows at the next reopen. `ponytail:` comment in the code names this ceiling.
- The empty state's `/speckit-specify` goes through C7 (U5). If U6 merges first, it sends the same `/speckit-specify ` text through the existing terminal send.

## Tests (written first)

- **Tasks parser:** phases and rounds, `[P]`, `[USn]`, `[ ]`/`[x]`/`[X]`, a malformed line skipped and counted, tasks before the first phase, an empty file.
- **Features reader:** numbered, timestamped and unnumbered folders; active from a relative and an absolute path; `feature.json` missing, invalid, and naming a missing folder; each flow step on and off; files with subfolders and a symbolic link left out; version 1.4.3, 1.5.0, 1.3.0 and missing; an unreadable `tasks.md` in errors while the other features show.
- **Read-only:** every reader run on a fixture with a write spy; no write under `.specify/` or `specs/` (BR6.6).
- **Watcher:** a change in a feature folder pushes `speckit:changed` within 2 s; a new folder named in `feature.json` is watched after the change.
- **Renderer:** list with the active mark, detail with flow note, tasks and count, file click opens the artifact reader, empty state with the `/speckit-specify` button, version warning, errors list, and a refresh on `speckit:changed`.
