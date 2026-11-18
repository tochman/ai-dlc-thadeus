# User Stories (US-0608)

Breakdown: by workflow step of a planning change (make it, keep it, separate it, recover it, resolve it, ship it, see it), plus the maintainer's proof. "Target" is `origin/main`, or `origin/<docs branch>` when `main` is protected. Requirement IDs are from `inception/requirements-analysis/requirements.md`.

## Group 1: Pia the planner

**US1.1 Assign stories to releases without errors** (Must, FR1)
As Pia, I want every assign, move and remove in the release list to succeed, so that I can plan quickly without retrying.
- AC1.1.1 Given two assignments on `main` where the second carries the hashes read before the first, when both run, then a test fails before the fix and passes after it.
- AC1.1.2 Given I assign, move and remove stories many times quickly, also while a push runs, when each finishes, then every one succeeds and the view and the story-detail picker stay locked until their own action's reload.
- AC1.1.3 Given a file changed outside the app, when an action is refused, then the message names the reason and the file, and the change stays waiting in the record.

**US1.2 Keep every planning change, whoever makes it** (Must, FR2)
As Pia, I want each change to the feature docs kept by the app until it is on the target, so that no planning change is lost.
- AC1.2.1 Given a release-list action or an editor save, when it runs, then it is in the record before the file is written.
- AC1.2.2 Given an agent in an app terminal writes `docs/FEATURES.md`, `docs/features/` or `docs/releases/`, when the watcher sees it, then it is recorded once (not twice for the app's own writes).
- AC1.2.3 Given a recorded change, when it is on the target, then it leaves the record, and not before.

**US1.3 Keep a story branch free of other planning** (Must, FR3)
As Pia, I want planning changes that are not my story's own committed on the app's branch, so that my story's pull request carries only its own work.
- AC1.3.1 Given `feat/US-0608` is checked out and the active intent names US-0608, when US-0608's block or `FEATURES.md` row changes, then the change stays in the story's tree.
- AC1.3.2 Given the same checkout, when another story's markers, a new story or a release file change, then the change is committed on `dash/planning` from the target and is gone from the story's tree and index.
- AC1.3.3 Given one epic file holds both kinds of change, when it is split, then only the other story's block leaves the story's tree.

**US1.4 Get my changes back after a discard or restart** (Must, FR4)
As Pia, I want waiting changes applied again after the tree is discarded or the app restarts, so that nothing waiting is lost.
- AC1.4.1 Given waiting changes, when I run `git checkout -- <files>`, `git stash` or switch branch, then the next cycle applies them again.
- AC1.4.2 Given waiting changes, when the app restarts, then they are applied again on open.
- AC1.4.3 Given changes were applied again, then the release list says so.

**US1.5 Resolve a conflicting edit without losing either version** (Must, FR5, NFR1)
As Pia, I want a conflicting free-text edit to keep both versions and let me choose, so that neither my text nor the target's is overwritten.
- AC1.5.1 Given I edit a story's free text, when it is recorded, then the record holds the new content and the hash it was based on.
- AC1.5.2 Given the target changed the same file, when the app meets the conflict, then the file keeps the target's version, the record keeps mine, and the release list names the file.
- AC1.5.3 Given the conflict is shown, when I pick "Use mine", "Keep theirs" or "Open both in the editor", then that happens and the choice is in Swedish and English in the LCARS look.

**US1.6 One commit per burst of planning** (Should, FR6)
As Pia, I want changes made close together to go out as one commit, so that the history is readable.
- AC1.6.1 Given changes less than 30 seconds apart, when 30 seconds pass after the last, then they are committed as one commit.
- AC1.6.2 Given release assignments, then the subject is `docs: plan US-XXXX, US-YYYY for vX.Y.Z`; given edits, `docs: update US-XXXX`.

**US1.7 See what is waiting and push it now** (Must, FR7, NFR1)
As Pia, I want the waiting changes always visible with a Push now button, so that I know what has not reached the target.
- AC1.7.1 Given changes are waiting, when I open the release list, then each shows its stories and target without my looking for it, with "Push now".
- AC1.7.2 Given a cycle ends, also a failed one, then the list updates at once, and a change disappears when it is on the target.
- AC1.7.3 Every text is in Swedish and English through `t()`, in the LCARS look.

## Group 2: Max the maintainer

**US2.1 Tests prove each case** (Must, FR8)
As Max, I want a test per case, so that a regression fails the suite.
- AC2.1.1 Given the suite runs, then it has tests for a change on a story branch, a discarded tree, a restart, a conflicting edit and grouped commits, each failing first (TDD).

**US2.2 End-to-end tests of the built app in CI** (Must, FR9)
As Max, I want the built app driven against a real repository in CI, so that the flow is proven as a person uses it.
- AC2.2.1 Given a real repo with a local bare `origin`, when the test creates a release, assigns, moves and removes stories, sees the waiting changes and pushes, then the commit is on `origin/main`.
- AC2.2.2 Given a story branch is checked out, when the same run happens, then its branch, index and working tree are unchanged.
- AC2.2.3 Given CI runs, then the tests run in `verify` on Linux under `xvfb-run` and in a macOS job against the built app, and a broken flow fails the build.

## Dependencies and INVEST notes
- US1.2 (the record) comes first; US1.3–US1.7 build on it. US1.1 stands alone and can go first. US2.2 needs US1.7's visible list.
- Each story has its own test target. US1.3 is the largest and the likeliest to split in the code plan (detection, then the split).
