# Requirements: US-0608, every planning change is kept until it is on the target

## Intent

No planning change is ever lost or found inside an unrelated pull request. Every change to the feature docs (`docs/FEATURES.md`, `docs/features/`, `docs/releases/`) is held in the app's record from the moment it is written until it is on `origin/main`, or on `origin/<docs branch>` when `main` is protected, whatever branch is checked out and whoever made it. Source: the story and its criteria in `docs/features/epic-06-feature-docs.md` (US-0608), the answers in `requirements-analysis-questions.md`, and the causes found in `codekb/aidlc-dash/code-quality-assessment.md` ("Brownfield Notes for US-0608").

"Target" below means `origin/main`, or `origin/<docs branch>` when `main` is protected (US-0607).

## Functional requirements

**FR1 Assigning a story to a release always works** (AC1)
- FR1.1 A test reproduces the intermittent assignment error before the fix: two assignments in a row on `main`, the second with the hashes read before the first. It fails before the fix and passes after.
- FR1.2 Assign, move and remove succeed many times in a row, quickly one after another, and while a push is running. The view keeps its lock until the reload that belongs to its own action, ignores out-of-order replies, and the story-detail release picker has the same lock.
- FR1.3 An error that can still happen (a file changed outside the app) names the reason and the file, and the change stays in the record.

**FR2 Every planning change is recorded** (AC3)
- FR2.1 A change to the three paths is recorded whoever makes it: a release-list action, a save in the app's editor, or a write from a terminal session in the app (noticed by the docs watcher).
- FR2.2 The record lives outside the working tree (`userData/planning/`). Release-list actions and editor saves are recorded before the file is written; watcher-seen writes as soon as they are seen.
- FR2.3 A recorded change leaves the record only once it is on the target.

**FR3 On a story branch, only the story's own changes stay** (AC4, Q1)
- FR3.1 The story's own stories are the story id in the branch name (`feat/US-0608` → US-0608) plus every story id the active intent's description names.
- FR3.2 A change to an own story's block in its epic file, or its row in `FEATURES.md`, stays in the story's tree.
- FR3.3 Every other planning change (a new story, another story's markers or criteria, a release file) is committed on the app's branch `dash/planning`, made from the target, and is not left in the story's working tree or swept into its commit.

**FR4 Changes survive a discard or restart** (AC5)
- FR4.1 After `git checkout -- <files>`, `git stash`, a branch switch or an app restart, every recorded change not yet on the target is applied again.
- FR4.2 The release list says that changes were applied again.

**FR5 Free-text edits and conflicts** (AC6, Q4)
- FR5.1 A change that cannot be replayed as an action (free text edited in the editor or by an agent) is recorded as the file's new content with the hash it was based on.
- FR5.2 On a conflict, the target's version stays in the file and the app's version stays in the record. Neither is overwritten.
- FR5.3 The release list names the conflicting file and offers "Use mine", "Keep theirs" and "Open both in the editor".

**FR6 Grouped commits** (AC7, Q2)
- FR6.1 Changes made within 30 seconds of each other go out as one commit, 30 seconds after the last change.
- FR6.2 The subject is `docs: plan US-XXXX, US-YYYY for vX.Y.Z` for release assignments and `docs: update US-XXXX` for edits.

**FR7 Waiting changes are visible** (AC2, AC8)
- FR7.1 The release list shows each change still waiting, with its stories and its target, where it is seen without looking for it, and a "Push now" button.
- FR7.2 The list updates live after every cycle, including a failed one, and a change disappears once it is on the target.

**FR8 Tests** (AC9): tests prove each case: a change made on a story branch, a discarded working tree, a restart, a conflicting edit, and grouped commits.

**FR9 End-to-end tests of the built app** (AC10, Q3)
- FR9.1 The tests launch the built Electron app against a real git repository with a local bare `origin` and drive the release list as a person does: create a release, assign stories, move one, take one out, see the waiting changes, push, and find the commit on `origin/main`.
- FR9.2 The same run with a story branch checked out proves its branch, index and working tree are unchanged.
- FR9.3 They run in CI in the `verify` job on Linux under `xvfb-run`, and in a macOS job against the built app, and fail the build if the flow breaks.

## Non-functional requirements

- **NFR1** Every new text goes through `t()` with keys in both `sv.json` and `en.json`, in the LCARS look (AC11).
- **NFR2** Every `git` and `gh` call uses fixed arguments with no shell, as in US-0607.
- **NFR3** New behaviour is written test first; line coverage stays at or above 80%, and ESLint and Prettier pass in CI.

## Constraints

- Builds on `planningRecord.js`, `planningSync.js`, `fileWrite.js` and `FeaturesView.jsx` (US-0606, US-0607, US-1001).
- The app never writes AI-DLC's engine-owned files.

## Assumptions

- The 30-second window decides when the commit is made. The push still follows US-0607's rules (idle, push interval, Push now). Reason: those rules keep the push from racing a running AI-DLC stage.
- The split in FR3 is made per story block, so one epic file can hold an own change that stays and another change that goes to the app's branch.
- Playwright's Electron support is the end-to-end tool, as the story notes suggest; the design confirms it.

## Out of scope

- The app's own `.thadeus/` files and harness settings (US-0609).
- Two app instances on the same repository (a dev build and the installed app); noted in the code notes as a risk, not fixed here.

## Open questions for later stages

- How a watcher-seen write is told apart from the app's own write, so it is not recorded twice (Code Generation).
