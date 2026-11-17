# Code Generation Plan: release planning sync (US-0606 + US-0607)

## Summary

- Builds: a local record of planning actions, a commit in a temporary worktree (or in place on `main`/docs branch), a timed and idle push to `origin/main` or the docs branch with a `gh` merge, and the release list's "waiting to be pushed" line with Push now
- Touches: new `src/main/planningRecord.js`, `src/main/planningSync.js`; `src/main/releases.js`, `src/main/parsers/releases.js`, `src/main/git.js`, `src/main/settings.js`, `src/main/ipc.js`, `src/preload`, `src/renderer/FeaturesView.jsx`, the Settings view, `sv.json`/`en.json`, feature docs
- Tests: about 32 new tests: 6 record, 14 sync against real temporary git repos (bare origin + clone), 4 parser, 3 settings, 5 renderer

## Design in short

- **Record** (FR1): `<userData>/planning/<sha1(root)>.json`, `{ protectedMain?: boolean, actions: [{ id, kind: 'setRelease'|'createRelease'|'deleteRelease', storyIds, version, at, state: 'pending'|'committed' }] }`. Written atomically (tmp + rename) before any file changes. Actions hold the operation, not the file text, so re-applying is idempotent: an action whose operation changes nothing is already applied.
- **Target** (FR3.2, FR3.3): `main`, or the project's docs branch (`planningBranch` project setting, default `docs/planning`) when `main` is protected. Protection comes from `gh api repos/{o}/{r}/branches/main/protection` (200 means protected), or from a push refused as protected. It is cached in the record.
- **Commit** (FR2): when the checkout is on the target, the app writes the files there and runs `git commit -- <files>`. Otherwise the checkout is not touched: the operation runs in a temporary worktree under `<userData>/planning/wt-<hash>` on the local branch `dash/planning`, based on `origin/<target>` (or the local target with no origin). The commit subject is `docs: plan US-XXXX[, …] for vX.Y.Z`.
- **Push** (FR3): one scheduler in main runs a cycle at the app-wide interval (`planningPushMinutes`, default 10, 1–120). It also runs right after an action, but only when the app is idle: `net.isOnline()`, no agent running and no question waiting, through an injected `isBusy()`. A cycle rebases `dash/planning` onto `origin/<target>`, pushes `dash/planning:<target>` and clears the pushed actions. On a protected target with `gh` set up, it then runs `gh pr create` and `gh pr merge --squash`. Offline, a refused push or a conflict keeps everything as it is and names the files, with no dialog. With no remote, it commits only.
- **Re-apply** (FR1.3): at app start, when the release list opens, and in each cycle. A pending action whose operation still changes `origin/<target>` and the checkout (when the checkout is on the target) is run again, and the app reports `reapplied: n`.
- **Agent edits on `main`** (FR2.5): in each cycle, when the checkout is on the target, uncommitted changes under `docs/FEATURES.md`, `docs/features/` and `docs/releases/` are committed in place and pushed the same way.

## Testing Contract

```json
{
  "version": 1,
  "methodology": "tdd",
  "source": "team",
  "ordering": "For each behaviour, write a failing test first, then the code that makes it pass, then refactor with the suite green.",
  "scope": "ultra-express",
  "test_strategy": "standard",
  "project_type": "brownfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nBuild and Test verifies defined coverage floors and affirmed quality targets;\nthey may not be weakened to make a step pass.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    },
    {
      "layer": "team",
      "text": "- **Methodology**: tdd\n- **Methodology evidence**: Decided by the person at the practices interview (Q1: test first, TDD, for new work). Earlier Code Generation plans recorded the framework default `test-after`; the affirmed choice replaces it for new work.\n- **Ordering**: For each behaviour, write a failing test first, then the code that makes it pass, then refactor with the suite green.\n- **Runner**: vitest 5.1.0 with two projects, `main` (node, `tests/main/**/*.test.js`) and `renderer` (jsdom, `tests/renderer/**/*.test.jsx`, Swedish locale). Currently 353 `it`/`test` call sites by static count; the knowledge base's \"about 490\" is not reconciled.\n- **Coverage floor**: 80% line coverage, checked in CI with `@vitest/coverage-v8` (Q2). Not set up yet; it is to be added to the repository and to the `verify` job of `.github/workflows/release.yml`. No coverage is measured today.\n- **Suite green before merge**: the full `npx vitest run tests/` suite must pass before any story pull request merges. CI runs it on every pull request into `main` and on every version tag.\n- **Manual check**: the built macOS `.dmg` is checked by hand before a release tag. Jsdom tests do not run the built app."
    }
  ],
  "obligations": {
    "strategy": "standard",
    "strategy_volume": [
      "Five to eight tests per component.",
      "Unit tests plus integration tests for key boundaries.",
      "Add E2E, performance, or security tests when requirements demand them."
    ],
    "scope_floor": [
      "Keep the existing test suite green.",
      "This scope adds no extra new-test floor beyond the selected test strategy."
    ],
    "combination_rule": "Apply every selected-strategy obligation and every scope-floor obligation; neither replaces the other, and a targeted scope regression may add the narrowest necessary test type beyond the strategy default."
  },
  "plan_profile": {
    "methodology": "tdd",
    "runner_step": "Verify the existing test runner/configuration and record the exact unit-scoped command.",
    "runner_ready_before_first_test": true,
    "testable_layers": [
      "Data model / database behavior",
      "Repository / data access",
      "Business logic",
      "API / endpoint",
      "Frontend behavior"
    ],
    "steps": [
      "Project structure and production configuration skeleton.",
      "Verify the existing test runner/configuration and record the exact unit-scoped command.",
      "Data model / database behavior - Red: write the failing tests and record the failing command output.",
      "Data model / database behavior - Green: implement only enough behavior to pass.",
      "Data model / database behavior - Refactor: improve the implementation while tests stay green.",
      "Repository / data access - Red: write the failing tests and record the failing command output.",
      "Repository / data access - Green: implement only enough behavior to pass.",
      "Repository / data access - Refactor: improve the implementation while tests stay green.",
      "Business logic - Red: write the failing tests and record the failing command output.",
      "Business logic - Green: implement only enough behavior to pass.",
      "Business logic - Refactor: improve the implementation while tests stay green.",
      "API / endpoint - Red: write the failing tests and record the failing command output.",
      "API / endpoint - Green: implement only enough behavior to pass.",
      "API / endpoint - Refactor: improve the implementation while tests stay green.",
      "Frontend behavior - Red: write the failing tests and record the failing command output.",
      "Frontend behavior - Green: implement only enough behavior to pass.",
      "Frontend behavior - Refactor: improve the implementation while tests stay green.",
      "Environment/build configuration.",
      "Documentation and traceability."
    ]
  },
  "input_sha256": "sha256:966ae7aa76a3ff867860dd0a2f0ee2fa471dead8c2ee6b26e903919b9f425698",
  "contract_sha256": "sha256:89b142ff38d5934191dfc83fed7aed0fa585c14d568cc2a017bf79391c7e68d1"
}
```

## Steps

- [x] **Step 1. Structure.** Create a feature branch `feat/US-0606-US-0607` from `main`. Set US-0606 and US-0607 to 🚧 in the epic file, the epic's `**Status (…)**` line and `FEATURES.md`. No new dependencies. (US-0606, US-0607)
- [x] **Step 2. Runner.** Verify `npx vitest run --project main tests/main/planningRecord.test.js` runs. The exact commands are in `unit-test-instructions.md`.
- [x] **Step 3. Data model: Red.** `tests/main/planningRecord.test.js`: path per project root; add then read; a corrupt or missing file reads as empty; atomic write leaves no partial file; remove by ids; `protectedMain` is kept. Record the failing output. (FR1.1, FR1.2)
- [x] **Step 4. Data model: Green and Refactor.** `src/main/planningRecord.js`. (FR1.1, FR1.2)
- [x] **Step 5. Parser: Red.** `tests/main/releasesPlan.test.js`: `addPlanRows(planText, stories)` adds slice-table rows (epic, title, priority, complexity, dependencies), creates the table under a heading-only file, skips a story already listed, and leaves the rest of the file unchanged. (FR2.4)
- [x] **Step 6. Parser: Green and Refactor.** `addPlanRows` in `src/main/parsers/releases.js`. `setStoryRelease` also writes the plan file when a version is set. Removing a story leaves the plan file alone. (FR2.4)
- [x] **Step 7. Sync: Red.** `tests/main/planningSync.test.js` against a temporary bare origin and clone, using `runFixed`:
  - on a story branch with uncommitted files, a release change leaves the branch, the index and `git status --porcelain` byte-for-byte unchanged, and the commit is on `origin/main` after a cycle (NFR1, FR2.1, FR3.2)
  - on `main`, the commit is made in place and pushed (FR2.2)
  - several actions in a row go into one push, with the right commit subject (FR2.3)
  - `main` moved: the commit is rebased, then pushed (FR3.2)
  - a rebase conflict: nothing is pushed, the record is kept and the files are named (FR3.5)
  - protected (stubbed `gh`): the commit goes to `docs/planning`, then `pr create` and `pr merge --squash` are called; without `gh`, the branch is pushed and `prOffer` is returned (FR3.3)
  - no origin: a local commit, the record is kept, and `noRemote` is reported (FR3.4)
  - offline or a refused push: the record is kept and the result has no dialog flag (FR3.5)
  - `git checkout -- <files>` after an action: the action is applied again and `reapplied: 1` is reported (NFR2, FR1.3)
  - agent edits under `docs/features/` on `main` are committed and pushed; on a story branch they stay (FR2.5)
  - an action leaves the record only once it is on the remote target (FR1.2)
  - a commit hook refusing: the reason and files are returned and the change is kept (FR4.2)
- [x] **Step 8. Sync: Green.** `src/main/planningSync.js` with `applyAction`, `commitPending`, `runCycle({ root, userData, exec, gh, isBusy, online })` and `reapplyLost`. New `git.js` helpers: `currentBranch`, `worktreeAdd` and `worktreeRemove`, `pushRef`. All run through `runFixed`, without a shell. The branch name is checked with `git check-ref-format --branch` (NFR3).
- [x] **Step 9. Sync: Refactor.** Remove the temporary worktree in a `finally`. Add `ponytail:` notes on the ceilings: one cycle at a time per project, and a fixed-name branch.
- [x] **Step 10. Settings: Red, Green, Refactor.** `tests/main/settings.test.js` additions: `planningPushMinutes` (default 10, out-of-range values rejected) and the project setting `planningBranch` (valid ref only, default `docs/planning`). Implement in `src/main/settings.js`. (FR3.1, FR3.3)
- [x] **Step 11. API: Red, Green, Refactor.** Wire it in `ipc.js`: `features:setRelease`, `createRelease` and `deleteRelease` write the record first, then change files only when the checkout is on the target, then kick the scheduler. New `features:planningStatus` → `{ pending, noRemote, prOffer, error }` and `features:pushPlanning` (Push now, ignores idle). The scheduler starts with the app and runs `reapplyLost` at start. `isBusy` comes from the app's existing agent and question state, wired where ipc already tracks sessions. Preload exposes the two calls. Tests go in `tests/main/planningSync.test.js` through the exported handlers' core functions. (FR1.3, FR3.1, FR4.1)
- [x] **Step 12. Frontend: Red.** `tests/renderer/FeaturesView.test.jsx`: the "N planning changes waiting to be pushed" line, Push now calling `pushPlanning`, the no-remote line, the error line naming the files, and a PR offer with no `gh`. Settings view tests: the interval field and the docs branch field. (FR4.1–FR4.3)
- [x] **Step 13. Frontend: Green and Refactor.** LCARS sub-block in the release list. The interval field goes in the app settings; the docs branch goes in the Project tab. Every text goes through `t()` in `sv.json` and `en.json`, with `data-testid`s such as `planning-pending`, `planning-push-now` and `settings-planning-branch`. (FR4.1–FR4.3)
- [x] **Step 14. Build config.** None needed: no new dependency or build change.
- [x] **Step 15. Docs and traceability.** Update the US-0606 and US-0607 text to match the requirements: the branch rule from Q1/Q8, and that a removed story leaves the plan file. Tick the met criteria, write `code-summary.md` and `traceability.json`. (US-0606, US-0607)

## Story-to-step map

| Story | Steps |
|-------|-------|
| US-0606 (commit without disturbing) | 1, 5–9, 11, 13, 15 |
| US-0607 (record, re-apply, push) | 3–4, 7–13, 15 |
