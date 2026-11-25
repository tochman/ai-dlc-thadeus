# Code Generation Plan: archive and unarchive a Spec Kit feature (US-1411)

## Summary

- Builds: Archive and Unarchive in a Spec Kit feature's detail, the "Archived (N)" filter, and one mark file per archived feature in `.thadeus/archived/`
- Touches: new `src/main/speckitArchive.js` and `src/renderer/SpeckitArchive.jsx`; changes in `speckitFeatures.js`, `frameworkSwitch.js`, `ipc.js`, `preload/index.js`, `SpeckitFeatures.jsx`, `SpeckitFeatureDetail.jsx`, `theme.css` and both locale files
- Tests: all built and green (48 new); one repair is left: Step 13 adds `main/speckitArchive.js` to the list in `fileWrite.test.js`, no source change

## Design

**The marks.** `src/main/speckitArchive.js` owns `.thadeus/archived/`:
- `readMarks(root)` gives `{ marked: Set<folder name in NFC>, error: {path, reason}|null }` from one folder listing: regular files ending in `.json`, not starting with a dot; linked ones are ignored. `.thadeus/` and `archived/` must be plain folders: a missing one is no marks, anything else is `error`.
- `addMark(root, dir)` makes the folders when missing, checks them, and writes `{"version": 1}` with `writeAtomic`. `removeMark(root, dir)` removes every mark whose name is the folder's in NFC; one already gone is done. Both refuse a link, or a mark that is not a regular file. Neither knows about Spec Kit, so the features reader can use `readMarks` without a cycle.

**The reader.** `loadSpeckitFeatures` gives each feature `archived` (marked and not active) and the result `activeMarked`. A mark with no folder matches nothing, so it is ignored by itself. It stays read-only. `listedFeatures(root)` (`{ dirs, active }`, the two reads it has today) is exported for main's own check.

**Main.** `speckit:archive` and `speckit:unarchive` (`projectId, dir`) answer `{ ok: true }` or `{ ok: false, error }`, only for a Spec Kit project. Both check `dir` against `listedFeatures`; archive also refuses the active one. `speckit:features` removes the mark after a read that says `activeMarked`, only for a Spec Kit project; a failed removal is one console line. The view reads on mount and on each `speckit:changed`, so that is when "the app sees" it (FR2.3). `SPECKIT_WATCH_PATHS` gets `.thadeus/archived/**`. The commit and push are the present `.thadeus` sync's.

**Interface.** `SpeckitArchive.jsx` holds the Archive pill (or Unarchive, or Archive unavailable with its reason), the confirmation on `LcarsDialog`, and the error. It is not US-0513's `ArchiveDialog`: that one is built around a reason, a run with progress and a commit, and this has none of them. Focus goes to the list (`tabIndex=-1`) when the control that had it is gone. `SpeckitFeatures` filters the rows, counts those not archived, and reloads after each change. `SpeckitFeatureDetail` shows the mark in place of the next command.

## Steps

Data and file access
- [x] **Step 1** Run the existing tests as `unit-test-instructions.md` says, to see the runner green.
- [x] **Step 2 Red** `tests/main/speckitArchive.test.js` on a temporary folder: no folder gives no marks; write, read, remove; the exact content, twice the same; removing what is gone; an odd name (spaces, NFD); `.thadeus` or `archived` linked or a file is refused and is `error` when read; a linked mark; other files ignored; a failed write leaves no mark. FR2.2, FR4.1, FR4.4, NFR1
- [x] **Step 3 Green, refactor** `src/main/speckitArchive.js`.
- [x] **Step 4 Red** `speckitFeatures.test.js`: `archived`, active and marked gives `archived: false` with `activeMarked: true`, a mark without its folder, an unreadable folder shows every feature with the reason, no file is read per mark, the no-write test with marks, the watch paths. FR2.3, FR3.6, FR4.2–4.4, NFR2, NFR3
- [x] **Step 5 Green, refactor** `speckitFeatures.js`.

Business logic
- [x] **Step 6 Red, green** `frameworkSwitch.test.js`: an archived feature with open tasks is not work in progress. FR3.7

App handlers
- [x] **Step 7 Red** `ipc.test.js`, `preload.test.js`: archive and unarchive call the marks; an unlisted folder, `../x`, a non-string, the active one and another framework write nothing; a failed write is an answer; `speckit:features` removes an active feature's mark once and still answers when that fails. FR1.4, FR2.2, FR2.3, NFR1
- [x] **Step 8 Green, refactor** `ipc.js`, `preload/index.js`.

Interface
- [x] **Step 9 Red** `tests/renderer/SpeckitArchive.test.jsx`: offered; the text with none, one and several open tasks; Cancel and Escape send nothing; confirm sends once; a refusal stays with its reason; unavailable for the active feature with its reason, reachable from the keyboard; Unarchive without a question and its refusal; focus to the list. FR1.1–1.4, FR2.1, FR2.2, FR6.2
- [x] **Step 10 Red** `SpeckitFeatures.test.jsx`: list and count without archived ones, the filter only with N ≥ 1, "Archived (N)" and the mark, back to all after the last one, all archived, the detail stays open, no next command and no active note, files still open, live reload. FR2.1, FR3.1–3.6, FR5.1
- [x] **Step 11 Green, refactor** `SpeckitArchive.jsx`, `SpeckitFeatureDetail.jsx`, `SpeckitFeatures.jsx`; texts in `sv.json` and `en.json` (`i18nKeys.test.js` green); LCARS styles in `theme.css`. FR6.1

Close
- [x] **Step 12** The unit's commands green, ESLint and Prettier clean on the changed files; module headers name US-1411 and their requirement.

Repair after Build and Test (loop-back 1)
- [x] **Step 13** `tests/main/fileWrite.test.js`: `main/speckitArchive.js` in SD36's list and test name, with a reason line for US-1411 (it writes only `.thadeus/archived/<listed folder>.json`, its folders checked as plain). The test is red today; this makes it green. No change under `src/`. `unit-test-instructions.md` runs the file from now on. The built-app test Build and Test added in `tests/e2e/speckitLayout.spec.js` stays.

**Nothing to build:** FR4.5 (the sync takes every file under `.thadeus/`; Step 2 checks with `isThadeusPath` that it takes a mark's path) and FR5.2 (no code touches the token log).

**Left to Build and Test:** the full suite with coverage, the Playwright specs, and the story's markers and criteria in the feature docs.

## Story to step

| Requirement | Steps |
|---|---|
| FR1 | 7, 8, 9, 11 |
| FR2 | 2–5, 7–11 |
| FR3 | 4–6, 10, 11 |
| FR4 | 2–5 |
| FR5 | 10 |
| FR6 | 9, 11 |
| NFR1–NFR3 | 2, 4, 7, and test first throughout |

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
