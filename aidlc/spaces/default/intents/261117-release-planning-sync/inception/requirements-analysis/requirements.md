# Requirements: release planning is committed and pushed without disturbing the work (US-0606 + US-0607)

## Intent analysis

Release planning made in the app (adding stories to a release, removing them, creating a release) and feature-doc edits left on `main` must never sit uncommitted and get lost, as happened twice (US-0606, US-0607 background). The fix must not disturb the story being worked on in the checkout, and must not wait for it to finish [Q13]. Both stories ship in one pull request [Q7].

The person's answers change both stories: planning goes straight to `origin/main` when `main` is not protected, otherwise through a per-project docs branch and a pull request the app merges itself [Q1, Q8, Q10]. US-0606's `docs/release-vX.Y.Z` branch and "the app pushes nothing" are replaced.

## Functional requirements

**FR1 Local record first** (US-0607)
- FR1.1 Before changing any file, the app writes each planning action (kind, stories, release, time) to a record per project in the app's own data folder, outside the working tree.
- FR1.2 An action leaves the record only once its change is on `origin/main` (unprotected `main`) or on `origin/<docs branch>` (protected `main`) [Q8].
- FR1.3 At app start, when the release list opens and at each push interval, an action whose change is in neither the remote target nor the checkout is applied again, and the app says so [Q5].

**FR2 Commit without touching the work** (US-0606)
- FR2.1 When the checkout is on a story branch (any branch other than `main` or the docs branch), its branch, index and working tree are left unchanged; the commit is made in a temporary worktree from the remote target [Q4, Q11].
- FR2.2 When the checkout is on `main` or the docs branch, the app writes the files there as today and commits only the planning files there.
- FR2.3 One commit holds every file the action changed (story markers, epic `**Status (…)**` lines, `FEATURES.md` rows, `docs/releases/X.Y.Z.md`), subject `docs: plan US-XXXX[, …] for vX.Y.Z`.
- FR2.4 Adding stories writes them into the slice table of `docs/releases/X.Y.Z.md` (epic, title, priority, complexity, dependencies from the story). Removing a story changes only its markers; the plan file stays [Q2].
- FR2.5 When the checkout is on `main` or the docs branch, uncommitted changes an agent wrote to `docs/FEATURES.md`, `docs/features/` or `docs/releases/` are committed and pushed the same way. On a story branch they stay with the story [Q12, Q13].

**FR3 Push** (US-0607)
- FR3.1 Commits are pushed at an interval set once in the app settings (default 10 minutes), or sooner when the app is idle: no agent running, no question waiting, and online [Q3].
- FR3.2 Unprotected `main`: push to `origin/main`, rebasing the app's commit in its temporary worktree when `main` moved.
- FR3.3 Protected `main`: push to the docs branch named in the project's settings. With `gh` set up, the app opens the pull request and squash-merges it itself, with no shell tab; without `gh`, the release list offers the pull request by hand [Q10].
- FR3.4 No `origin`: commit locally, keep the record, and the release list says there is no remote [Q6].
- FR3.5 Offline, a refused push, or a rebase conflict: nothing is pushed, the record is kept, the conflicting files are named, and the app retries at the next interval with no new dialog each time.

**FR4 What the person sees**
- FR4.1 The release list shows actions not yet pushed ("2 planning changes waiting to be pushed") with a Push now button.
- FR4.2 A failed commit names the reason and the files, and keeps the change in the checkout or the record instead of losing it.
- FR4.3 The interval setting (app settings) and the docs branch setting (project settings under Configuration) follow the LCARS look; every text goes through `t()` in Swedish and English.

## Non-functional requirements

- NFR1 A test proves the checkout's branch, index and working tree are byte-for-byte unchanged after a release change made on a story branch.
- NFR2 A test proves an action survives `git checkout -- <files>` and is applied again.
- NFR3 Git and `gh` run without a shell (argument arrays); a branch name from settings is checked against git's ref rules before use.
- NFR4 TDD, 80% line coverage on the new modules, suite green before merge (team rule).

## Constraints

- Electron main process; git helpers in `src/main/git.js`; writers in `src/main/releases.js`; release list in `src/renderer/FeaturesView.jsx`; settings in `src/main/settings.js`.
- One pull request for both stories: `feat(US-0606, US-0607): …`.

## Assumptions

- [assumption] Protection is detected through `gh api` when `gh` is set up; without it, a push to `main` refused as protected switches that project to the docs branch.
- [assumption] The docs branch setting defaults to `docs/planning` until the person sets one.
- [assumption] "Agent running" and "question waiting" use the app's existing agent and question state.

## Out of scope

- Picking up agent-written doc changes on a story branch [Q13].
- Feature-doc changes outside `docs/FEATURES.md`, `docs/features/` and `docs/releases/`.

## Open questions

None.
