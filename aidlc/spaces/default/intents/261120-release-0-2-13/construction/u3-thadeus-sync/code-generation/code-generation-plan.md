# Code Generation Plan: U3 u3-thadeus-sync (US-0609)

## Summary

- Builds: a new ThadeusSync that records every changed file under `.thadeus/` and the app's harness hook files, and on its own scheduler commits them as one `chore: sync .thadeus` commit in a worktree on the app's branch, rebases with token readings merged, and pushes to `main` (or the docs branch); plus the setup rule, the commit after a hook install, and the waiting count
- Touches: new `src/main/thadeusSync.js`, `src/main/planningRecord.js` (a `thadeus` entry kind), `src/main/planningSync.js` (helpers exported), `src/main/agentHooks.js` (records after apply), `src/main/setup.js`, `src/shared/costRules.js` (the rule line), `src/main/ipc.js` (scheduler, watcher, status), `src/renderer/FeaturesView.jsx` and `SetupAidlc.jsx`, the locales, their tests; `tests/main/fileWrite.test.js` (Step 16, the fix from Build and Test)
- Tests: 16 new tests (9 in the new `thadeusSync.test.js`, 2 in `planningRecord.test.js`, 1 each in `agentHooksInstaller.test.js`, `setup.test.js`, `costRules.test.js`, `FeaturesView.test.jsx`, `SetupAidlc.test.jsx`), test first

Story: US3.1 (US-0609), AC3.1.1–AC3.1.8; FR3.1–FR3.8; NFR1–NFR5. Design: ADR-002, ADR-003 (`../../../inception/domain-design/decisions.md`). Builds on U2 (`fix/US-0036`).

## Design

- `planningRecord.js`: a `thadeus` entry is `{id, kind: 'thadeus', file, harness?, at, state}`. It holds only the path, never the file text: the content is read from disk at commit time, because `.thadeus/` is the app's own data. `file` is root-relative without `..`. It sits under `.thadeus/`, or it is one of the harness table's paths. `addThadeus` keeps one entry per file (a newer change replaces it). Planning's `content` entries are unchanged.
- `thadeusSync.js` (new; doc comments name US-0609):
  - `HARNESS_FILES = [{harness: 'claude', path: '.claude/settings.json', splice: true}, {harness: 'opencode', path: '.opencode/plugins/thadeus-dialog.js', splice: false}]`. A later harness joins by one row (FR3.2).
  - `isThadeusPath(rel)` is true for files under `.thadeus/`, except `.DS_Store`, `*.swp`, `*~` and `.#*`.
  - `watchThadeus(root, onChange)` follows `.thadeus/` and the harness files with chokidar (300 ms debounce, as `watcher.js`) and records each change.
  - `syncCycle(ctx)` runs, through planningSync's per-root `serial`, only when entries wait:
    1. Fetch.
    2. In `withWorktree` on `dash/thadeus` (new at `origin/<target>`), copy each waiting `.thadeus` file from disk. A token log (`.thadeus/tokens/*.json`) is merged with the worktree's copy: readings united by `at`, sorted, capped at `MAX_READINGS` (FR3.6).
    3. Write a harness row's file as `splice(<origin target's version>, 'update')` from `agentHooks.js` when `splice` is set (only the app's spans change, ADR-003), else as the app's own file. The working tree's other edits stay where they are and are named in the result (FR3.2).
    4. Make one commit, `chore: sync .thadeus` (FR3.5). Rebase onto origin, and push `HEAD:<target>` through planningSync's push path. On the docs branch, this includes the protection detection and the pull request (FR3.1).
    5. A rebase conflict in any file that is not a token log keeps the record, names the file, and pushes nothing (FR3.6).
    6. On success, the pushed entries leave the record, and `dash/thadeus` is deleted.
  - The story's checkout, index and branch are never touched (FR3.4).
- `planningSync.js`: export `serial`, `withWorktree`, `targetOf`, `targetRef`, and the push path (`pushFrom`, `pushAll`, `detectProtection`, `openPull`), parametrised by branch where they name `dash/planning`. Its behaviour is unchanged for planning.
- `ipc.js`:
  - On `project:open`, start `watchThadeus` and a second `createScheduler` (key `thadeus`, the same push interval and idle rule as planning) running `syncCycle`.
  - `features:planningStatus` adds `thadeus: <waiting count>`, and `waitingList` includes the `thadeus` entries (FR3.8).
  - `ipc.js` and `watcher.js` are also the Spec Kit work's files: only these lines change.
- `agentHooks.js`: after a successful install or update, the installer records a `thadeus` entry for each changed harness file. A fresh clone's existing "not installed" status and Install offer (US-0214) then end in a commit (FR3.3).
- `costRules.js` (`COST_RULES_PACK`) gets the line: "`.thadeus/` is committed and never git-ignored; THADEUS commits and pushes it." It reaches projects through the existing rule pack (US-0032), so setup gives the project the rule (FR3.7). `setup.js` `getSetupInfo` adds `thadeusIgnored` from `git check-ignore -q .thadeus/x`. `SetupAidlc.jsx` shows one line when it is true.
- `FeaturesView.jsx` (`PlanningSync`): the waiting list shows `.thadeus` entries with their file names. The pending count includes them.

## Steps

- [x] **Step 1** (setup): from `fix/US-0036`, create the branch `feat/US-0609`, since it builds on U2. Set US-0609 to 🚧 In progress, for v0.2.13, in its marker in `docs/features/epic-06-feature-docs.md`, in that epic's **Status** line and in its `docs/FEATURES.md` cell. Run `npx vitest run tests/main/featureDocsStatus.test.js`.
- [x] **Step 2** (runner): run `npx vitest run tests/main/planningRecord.test.js tests/main/planningSync.test.js tests/main/agentHooksInstaller.test.js tests/main/setup.test.js tests/main/costRules.test.js tests/renderer/FeaturesView.test.jsx tests/renderer/SetupAidlc.test.jsx` on the unchanged code and record that it is green.
- [x] **Step 3** (data, Red): in `tests/main/planningRecord.test.js`, add: a `thadeus` entry under `.thadeus/` or on a harness path is kept, and a newer change of the same file replaces it; a path outside those, or one with `..`, is refused. Run `npx vitest run tests/main/planningRecord.test.js` and record the failing output.
- [x] **Step 4** (Green): the kind and `addThadeus`. Run it green.
- [x] **Step 5** (Refactor) with `npx vitest run tests/main/planningRecord.test.js tests/main/planningSync.test.js` green.
- [x] **Step 6** (data access, Red): new `tests/main/thadeusSync.test.js`, with temporary repositories, a bare origin, a story branch and an injected clock:
  - `isThadeusPath` skips `.DS_Store` and swap files (AC3.1.1);
  - on a story branch, a waiting `.thadeus` file ends up in one `chore: sync .thadeus` commit on `origin/main`, and the story's branch, index and working tree are unchanged (AC3.1.1, AC3.1.4);
  - 50 readings added to a token log between two cycles go in one commit (AC3.1.5);
  - when `origin/main` has newer readings in the same token log from another clone, the push keeps every reading from both (AC3.1.6);
  - a real conflict in another `.thadeus` file keeps the record, names the file, and pushes nothing (AC3.1.6);
  - a harness row commits `origin/main`'s `.claude/settings.json` with only the app's spans changed, while another edit in the working tree stays and is named (AC3.1.2);
  - the opencode row commits the plugin file whole;
  - with a protected `main`, the commit goes to the docs branch (AC3.1.1);
  - with no entries waiting, the cycle does nothing (no fetch).

  Run `npx vitest run tests/main/thadeusSync.test.js` and record the failing output.
- [x] **Step 7** (Green): `thadeusSync.js` and the planningSync exports. Run it green, plus `npx vitest run tests/main/planningSync.test.js`.
- [x] **Step 8** (Refactor) with the tests green.
- [x] **Step 9** (business logic, Red): add:
  - `agentHooksInstaller.test.js`: after an install, a `thadeus` entry for `.claude/settings.json` is recorded (AC3.1.3);
  - `setup.test.js`: a `.gitignore` that hides `.thadeus/` gives `thadeusIgnored: true` (AC3.1.7);
  - `costRules.test.js`: the shipped pack holds the `.thadeus` line (AC3.1.7).

  Run the three files and record the failing output.
- [x] **Step 10** (Green): the installer hook-up, `thadeusIgnored`, the pack line, and the `ipc.js` scheduler, watcher and status. Run them green, plus `npx vitest run tests/main/ipc.test.js`.
- [x] **Step 11** (Refactor) with the tests green.
- [x] **Step 12** (frontend, Red): `FeaturesView.test.jsx`: waiting `.thadeus` entries show in the waiting list with their file names (AC3.1.8). `SetupAidlc.test.jsx`: `thadeusIgnored` shows its warning line (AC3.1.7). Run both and record the failing output.
- [x] **Step 13** (Green): the two views, and `features.planning.thadeus` and `setup.thadeusIgnored` in `sv.json` and `en.json`. Run them and `npx vitest run tests/main/i18nKeys.test.js tests/renderer/noNativeTitle.test.jsx` green.
- [x] **Step 14** (Refactor) with the tests green.
- [x] **Step 15** (checks): this Unit's command from `unit-test-instructions.md`, then `npx eslint` and `npx prettier --check` on the changed files.
- [x] **Step 16** (fix from Build and Test, loop-back 1): `tests/main/fileWrite.test.js` SD36 fails because `src/main/thadeusSync.js` now imports `writeAtomic`. Red: run `npx vitest run tests/main/fileWrite.test.js` and record the failing output. Green: add `'main/thadeusSync.js'` to SD36's expected list, a `// US-0609 FR3.5 adds thadeusSync.js: it writes only paths isThadeusPath or the harness table accept, resolved in its worktree root.` line beside the others, and `thadeusSync.js` to the test's name. Run it green, then this Unit's command (now with `fileWrite.test.js`), ESLint and Prettier on the changed file.

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
      "text": "- **Methodology**: tdd\n- **Methodology evidence**: Decided at the practices interview (test first for new work), carried over from the baseline. Git history cannot show test-first ordering, so this is not re-proven from evidence.\n- **Ordering**: For each behaviour, write a failing test first, then the code that makes it pass, then refactor with the suite green.\n- **Runner**: vitest 5.1.0 with three projects: `main` (node, `tests/main/**`, 98 files), `scripts` (the timed hook-script tests, run after the others, retried twice), and `renderer` (jsdom, `tests/renderer/**`, 53 files, Swedish locale).\n- **End-to-end**: Playwright 1.65 drives the built app through Electron (`tests/e2e`, US-0608). This is new since the baseline.\n- **Test count**: about 1,630 `it`/`test` lines by a static grep (1,136 in `main`, 497 in `renderer`). The baseline's 353 was out of date. Not counted by running the suite.\n- **Coverage floor**: 80% line coverage, v8, over `src/**` and the app's opencode plugin. Some agent and dialog files each hold 80% on their own. Set up in `vitest.config.mjs` and checked in CI. Current percentage not measured here.\n- **Suite green before merge**: the full suite (`npx vitest run tests/ --coverage`) runs in CI on every pull request into `main` and on every version tag.\n- **Manual check**: the built macOS `.dmg` is still checked by hand before a release tag. The built-app Playwright tests in CI do not replace this check."
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
  "input_sha256": "sha256:62e0e9fa98cd86fbefaed196456b1ab91473689ff98919dd339561dd96d35b90",
  "contract_sha256": "sha256:b4ae8e1ec7217b124511fee47f9c29395d19f01a4e3b3abd23c00abd3e6afb59"
}
```
