# Code Generation Plan: US-0608, every planning change is kept until it is on the target

## Summary

- Builds: a planning record that holds every feature-doc change (actions and file content) until it is on the target, a per-story split on story branches, replay and conflict choices, 30-second grouped commits, a live waiting list, and the assignment-error fix
- Touches: `src/main/planningRecord.js`, `planningSync.js`, `releases.js`, `parsers/features.js`, `ipc.js`, `src/preload/index.js`, `src/renderer/FeaturesView.jsx`, `useFeatures.js`, `sv.json`/`en.json`, `.github/workflows/release.yml`, `package.json`, new `tests/e2e/`
- Tests: about 14 vitest tests (main and renderer, one per requirement) and 2 Playwright end-to-end tests of the built app

Zero-Unit, brownfield, express. Inputs: `requirements.md`, `stories.md`, `developer-scan.md`. "Target" is `origin/main`, or `origin/<docs branch>` when `main` is protected.

## Design decisions

- **D1 Record entries.** `planningRecord.js` keeps today's three action kinds and adds `content`: `{file, baseHash, content, storyIds, by: 'editor'|'watcher'}`. The record stays in `userData/planning/<sha1(root)>.json`. An entry leaves only when its change is on the target (FR2.3).
- **D2 Own-write echo.** Every app write (action or editor save) remembers the hash it wrote, per file, in memory. A watcher event whose file hash equals the last app-written hash is not recorded again (AC1.2.2, the open question).
- **D3 Assignment error root cause.** Main accepts a renderer hash that the app itself replaced: if the given hash is the "from" of the app's last write to that file and the disk is its "to", fresh hashes are used. The renderer keeps its lock until a `features` load whose hashes differ from the ones it sent, `loadDocs` drops out-of-order replies (a sequence number), and `ReleasePicker` shares the view's lock (FR1.1, FR1.2).
- **D4 Split per story block.** New `storyBlocks(text)` in `parsers/features.js` cuts an epic file into story blocks by id (and the overview into rows). On a story branch, a changed block or row of an own story stays in the tree; any other changed block, row or release file is recorded, written onto `dash/planning` from the target, and reset to `HEAD` in the story's tree and index (FR3). Own stories: the branch name's id plus every id in the active intent's description (FR3.1).
- **D5 Replay and conflicts.** Each cycle checks every waiting entry against the tree: an action runs again (it is idempotent); a `content` entry is written again when the file still has `baseHash`; if the file or target moved on, the file keeps the target's text, the record keeps the app's, and the entry is marked `conflict` (FR4, FR5.2). Choices: Use mine (write record content, new base), Keep theirs (drop the entry), Open both (the file and a read-only copy of mine in the editor).
- **D6 Grouped commits.** Writes happen at once; the commit is debounced per project to 30 s after the last change, one commit per burst with the FR6.2 subject. The push still follows US-0607's rules.
- **D7 Live list.** Every cycle result, also a failed one, is sent to the renderer (`features:planningChanged`); the block lists each waiting entry with its stories, its target and "Push now", and shows in the Releases tab and beside the story-detail picker (FR7).

## Testing Contract

```json
{
  "version": 1,
  "methodology": "tdd",
  "source": "team",
  "ordering": "For each behaviour, write a failing test first, then the code that makes it pass, then refactor with the suite green.",
  "scope": "express",
  "test_strategy": "minimal",
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
    "strategy": "minimal",
    "strategy_volume": [
      "One verifiable test per requirement at the narrowest effective level.",
      "At least one happy-path unit test per component.",
      "Unit tests are the default; a bugfix/security scope floor may require an integration or E2E regression when that is the narrowest level that reproduces the defect."
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
  "input_sha256": "sha256:3a3e99f1e55b225dce936715ddd095cabaceeab0e44cf8ec6eeab8daf73e4d52",
  "contract_sha256": "sha256:c203aae185bed3ce09c3c921ca1ec08a65e296b2cff7f7791c1a0522e7468af4"
}
```

## Steps

Every Red step records the failing output of the targeted command in `unit-test-instructions.md` before its Green step.

- [x] **Step 1** Structure: no new main modules beyond `tests/e2e/`; the split helper lives in `parsers/features.js`. (all)
- [x] **Step 2** Runner: verify `npx vitest run tests/main/planningRecord.test.js` runs green as it stands, and record the commands. (all)
- [x] **Step 3** Data model, Red: `planningRecord.test.js`: a `content` entry with `file`, `baseHash`, `content` is kept, read back, and an invalid one (path outside the docs, missing hash) is dropped. (FR2.2, FR5.1; US1.2, US1.5)
- [x] **Step 4** Data model, Green: add the `content` kind, `conflict` state and `markConflict`/`resolveEntry` to `planningRecord.js` (D1).
- [x] **Step 5** Data model, Refactor while green.
- [x] **Step 6** Data access, Red: `planningSplit.test.js` (new): `storyBlocks` cuts an epic into blocks by id and rows of the overview; `splitChange(head, work, own)` keeps an own block and returns the other block's change (AC1.3.3). (FR3.2, FR3.3; US1.3)
- [x] **Step 7** Data access, Green: `storyBlocks` and `splitChange` in `parsers/features.js` (D4).
- [x] **Step 8** Data access, Refactor while green.
- [x] **Step 9** Business logic, Red, in `planningSync.test.js` (real git, local bare origin), one test each:
  - FR1.1: two assignments on `main`, the second with the hashes read before the first; both succeed.
  - FR1.3: a file changed outside the app is refused with reason and file, and the change stays in the record.
  - FR2.1/FR2.3: an editor save and a watcher-seen write are each recorded once and leave only once on `origin/main`.
  - FR3: on `feat/US-0608`, another story's block and a release file go to `dash/planning` and are gone from the story's tree and index; the own block stays.
  - FR4.1: after `git checkout -- docs/`, `git stash`, a branch switch, and a fresh process reading the record, the next cycle applies every waiting change again.
  - FR5.2: a conflicting edit keeps the target's text in the file and mine in the record; "Use mine" and "Keep theirs" do what they say.
  - FR6: three changes within 30 s give one commit 30 s after the last, with the FR6.2 subject (fake timers).
- [x] **Step 10** Business logic, Green: in `planningSync.js` and `releases.js`, the own-write hash map (D2, D3), `recordContent`, the split on story branches (D4), the replay and conflict step in `runCycle` (D5), and a per-project 30 s commit debounce (D6). Git stays on `runFixed` with fixed arguments (NFR2).
- [x] **Step 11** Business logic, Refactor while green; drop the old ponytail notes that no longer hold.
- [x] **Step 12** API, Red: an `ipc` test (or `planningSync` boundary test) that `file:write` to a docs path records before writing, and that every cycle result, also a failed one, is sent as `features:planningChanged`. (AC1.2.1, FR7.2)
- [x] **Step 13** API, Green: `ipc.js` records editor saves to the three paths, records watcher-seen writes in `syncFeaturesWatch`, sends every cycle result, adds `features:resolvePlanning`; `preload` exposes it and `onPlanningChanged`.
- [x] **Step 14** API, Refactor while green.
- [x] **Step 15** Frontend, Red: `FeaturesView.test.jsx` and `useFeatures.test.jsx`: the view stays locked until a load whose hashes differ from those it sent, and the picker shares that lock (FR1.2); out-of-order loads are ignored; the waiting list shows each entry with its stories, target and "Push now", updates on `onPlanningChanged`, says "applied again", and a conflict offers the three choices (FR4.2, FR5.3, FR7).
- [x] **Step 16** Frontend, Green: `FeaturesView.jsx` (`PlanningSync` as a list, shown in Releases and beside the story-detail picker, shared lock, conflict choices) and `useFeatures.js` (sequence guard). New texts through `t()` in `sv.json` and `en.json`, LCARS classes only (NFR1).
- [x] **Step 17** Frontend, Refactor while green.
- [x] **Step 18** End-to-end, Red then Green: add `@playwright/test` (devDependency) and `playwright.config.mjs`; `tests/e2e/planning.spec.js` launches `out/main/index.js` with `_electron` against a temp repo with a bare origin and a temp `userData`: create a release, assign, move, remove, see the waiting list, Push now, find the commit on `origin/main` (FR9.1); the same run on a story branch leaves its branch, index and tree unchanged (FR9.2). A test-only env var points the app at the temp project.
- [x] **Step 19** Build configuration: `verify` runs `npx electron-vite build` and `xvfb-run -a npx playwright test`; `build-mac` runs `npx playwright test` against its build. Coverage threshold stays 80% (FR9.3, NFR3).
- [x] **Step 20** Docs and traceability: US-0608 story block and FEATURES.md row stay 🚧 until Build and Test; `code-summary.md`, `traceability.json`.

## Story traceability

| Story | Steps |
|---|---|
| US1.1 | 9, 10, 15, 16 |
| US1.2 | 3, 4, 9, 10, 12, 13 |
| US1.3 | 6, 7, 9, 10 |
| US1.4 | 9, 10, 15, 16 |
| US1.5 | 3, 4, 9, 10, 15, 16 |
| US1.6 | 9, 10 |
| US1.7 | 12, 13, 15, 16 |
| US2.1 | 3, 6, 9, 12, 15 |
| US2.2 | 18, 19 |
