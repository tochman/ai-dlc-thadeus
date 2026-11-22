# Code Generation Plan: U6 u6-speckit-features (US4.1 / US-1402)

## Summary

- Builds: the read-only Spec Kit features reader (`specs/*`, `feature.json`, `tasks.md`), its live watcher, and the features list and detail view in the Spec Kit shell
- Touches: `src/main/parsers/speckitTasks.js` and `src/main/speckitFeatures.js` (new), `src/main/watcher.js`, `src/main/fileWrite.js`, `src/main/ipc.js`, `src/preload/index.js`, `src/renderer/SpeckitShell.jsx`, `SpeckitFeatures.jsx` and `SpeckitFeatureDetail.jsx` (new), `ArtifactReader.jsx`, the sv/en locales
- Tests: about 45 tests: parser (8), reader (14), read-only guard (3), watcher (3), editor read-only (4), IPC (3), renderer (10)

**Branch:** `feat/US-1402`, created from `feat/US-1401` (U6 needs only U1's framework detection and shell). The US-1408 work still uncommitted on `feat/US-1408` is committed there first, so it does not travel to this branch. The pull request opens after US-1401 is merged, then rebases on `main`, and is squash-merged as `feat(US-1402): the Spec Kit features view`.

**Sources:** `functional-spec.md`, `rules.md` (BR6.1–BR6.10), `frontend-components.md`, `performance-design.md`, `security-design.md`, contract C5. Each step's criteria are in brackets.

## Steps

- [x] **Step 1: Branch and story status.**
  - `git switch -c feat/US-1402 feat/US-1401`.
  - Set US-1402 to 🚧 In progress, "for v0.3.0", in its epic marker, the epic's Status line and its FEATURES.md row.
- [x] **Step 2: Runner check.** Run the unit-scoped commands from `unit-test-instructions.md` on the unchanged tree and record the baseline (the new test files do not exist yet).
- [x] **Step 3: Tasks parser, Red.** `tests/main/speckitTasks.test.js`: `parseTasks(text)` gives phases from `## Phase <n>: <title>`; tasks with ID, `[P]`, `[USn]`, `[ ]`/`[x]`/`[X]`; Convergence phases get rounds 1, 2 in file order, others `null`; tasks before the first phase in a phase named `''`; a malformed `- [` line skipped and counted; an empty file gives zeros. Record the failing output. [AC4.1.3, BR6.4]
- [x] **Step 4: Tasks parser, Green.** `src/main/parsers/speckitTasks.js`, one pass with prebuilt regular expressions. Header names `US-1402 FR6.3`.
- [x] **Step 5: Tasks parser, Refactor** with the tests green.
- [x] **Step 6: Features reader, Red.** `tests/main/speckitFeatures.test.js` on real `fs.mkdtemp` fixtures, `loadSpeckitFeatures(root)` gives the C5 shape:
  - numbered (`001-name`), timestamped (`20261120-101500-name`) and unnumbered folders, sorted by folder name [BR6.1];
  - active from a relative and an absolute `feature_directory`; `feature.json` missing (no error), invalid, naming a missing folder, pointing outside the root, or through a link (active `null` plus an error) [BR6.2, NFR3.3, NFR3.4];
  - each flow step on and off, including `## Clarifications`, implement with only Convergence tasks left, converge with a ticked round [BR6.3];
  - files listed root-relative with one subfolder level, sorted, symbolic links left out; a linked `specs/` or feature folder named in errors [BR6.5, NFR3.4];
  - version 1.4.3 supported, 1.5.0 and 1.3.0 not, the manifest fallback, missing gives `found: null` [BR6.9];
  - an unreadable `tasks.md`, a file over 1 MB, and a non-UTF-8 file go in errors while the other features show [BR6.10, NFR5.1];
  - 50 features with a 500-line `tasks.md` each read within 500 ms [NFR7.3].

  Record the failing output.
- [x] **Step 7: Features reader, Green.** `src/main/speckitFeatures.js` with `loadSpeckitFeatures(root)`, using only `readFile`, `readdir`, `lstat`, `stat` and `realpath`, and `Promise.all` across features. `ponytail:` comment on the `SPECIFY_FEATURE_NO_PERSIST` ceiling. Header names `US-1402 FR6`.
- [x] **Step 8: Read-only guard, Red then Green.** A test spies on every `fs` write call (`writeFile`, `rename`, `mkdir`, `rm`, `unlink`, `appendFile`, `copyFile`, `open` with a write flag) and runs the reader and the watcher on a fixture: no call [BR6.6, NFR3.1]. It passes once Step 7 and Step 13 exist; it is written before Step 13.
- [x] **Step 9: Features reader, Refactor** with the tests green.
- [x] **Step 10: Watcher, Red.** In `tests/main/watcher.test.js`: a `specs/**` target sees a file change two levels down and a new feature folder within 2 s; depth stops at 3 levels below the folder; the existing `.md`-only folder targets behave as before. Record the failing output. [AC4.1.5, BR6.7, NFR7.1, NFR7.2]
- [x] **Step 11: Watcher, Green.** `watchFiles` accepts a target ending in `/**`: any file or folder below it matches, depth capped at 3 with a `ponytail:` comment naming the cap and the move to one recursive `fs.watch`.
- [x] **Step 12: IPC and editor guard, Red.**
  - `tests/main/ipc.test.js`: `speckit:features` returns the reader's result for a Spec Kit project; a Spec Kit project gets a watcher on `['specs/**', '.specify/feature.json', '.specify/init-options.json']` that pushes `speckit:changed { projectId, paths }`; an AI-DLC project gets none.
  - `tests/main/fileWrite.test.js`: with `framework: 'speckit'`, `readForEdit` gives `readOnly: 'speckit'` for files under `specs/` and `.specify/`, and `writeFileSafe` throws `errors.speckitReadOnly`; `.specify/memory/constitution.md` stays editable; with `aidlc` or no framework a `specs/` file is editable as today.

  Record the failing output. [NFR3.2, security-design §1]
- [x] **Step 13: IPC and editor guard, Green.**
  - `ipc.js`: register `speckit:features`; start and close the Spec Kit watcher where the space watcher starts for AI-DLC (replacing U1's "Spec Kit's comes with U6" note); pass the project's `framework` to `readForEdit` and `writeFileSafe` in `file:read` and `file:write`.
  - `fileWrite.js`: `resolveEditable(root, rel, { framework })` adds the `speckit` case.
  - `preload/index.js`: `speckitFeatures(projectId)` and `onSpeckitChanged(cb)`.
  - Add `errors.speckitReadOnly` and the reader's reason keys to `sv.json` and `en.json`.
- [x] **Step 14: IPC and editor guard, Refactor** with the tests green.
- [x] **Step 15: Views, Red.** `tests/renderer/SpeckitFeatures.test.jsx` (and the existing `SpeckitShell.test.jsx` updated):
  - the list with number, name and the active mark; the selection kept after a refresh while the folder exists, else the active feature [AC4.1.1];
  - the detail with the six steps and the "worked out from the files" note [AC4.1.2];
  - tasks by phase with rounds, ID, `[P]`, `[USn]`, tick, the done/total count and skipped lines [AC4.1.3];
  - a file click opens it in the artifact reader with no edit button [AC4.1.4, NFR3.2];
  - a refresh on `speckit:changed`, and the listener removed on unmount [AC4.1.5, NFR7.4];
  - the empty state with the `/speckit-specify` button that writes `/speckit-specify ` to the agent terminal only on click; the version warning naming the version or saying unknown; the errors list [AC4.1.6, BR6.8–BR6.10];
  - a `<script>` line in a Markdown file shows as text [NFR5.2].

  Record the failing output.
- [x] **Step 16: Views, Green.** `SpeckitFeatures.jsx` and `SpeckitFeatureDetail.jsx` in the LCARS frame with the test ids in `frontend-components.md`; `SpeckitShell.jsx` renders `SpeckitFeatures`; `ArtifactReader` gets an `editable` prop (default `true`) that hides `artifact-reader-edit`. The empty-state button uses the terminal context's `run` on the agent tab (C7's `speckitCommand` replaces it when U5 lands). Add the `speckit.features.*` keys to `sv.json` and `en.json`.
- [x] **Step 17: Views, Refactor** with the tests green; run ESLint and Prettier on the changed files.
- [x] **Step 18: Documentation and traceability.**
  - Write `code-summary.md`, `source-manifest.json` and `traceability.json`.
  - Set US-1402 to ✅ Done, tick its criteria, keep "for v0.3.0", and update the FEATURES.md row.

## Story-to-step map

| Story / AC | Steps |
|---|---|
| US4.1 AC4.1.1 (list, number, active) | 6, 7, 15, 16 |
| AC4.1.2 (flow worked out from files) | 6, 7, 15, 16 |
| AC4.1.3 (tasks by phase, count, skipped) | 3, 4, 15, 16 |
| AC4.1.4 (files open in the reader) | 6, 7, 15, 16 |
| AC4.1.5 (change within 2 s, nothing written) | 8, 10–13, 15 |
| AC4.1.6 (empty state, version warning) | 6, 7, 15, 16 |

## Testing Contract

```json
{
  "version": 1,
  "methodology": "tdd",
  "source": "team",
  "ordering": "For each behaviour, write a failing test first, then the code that makes it pass, then refactor with the suite green.",
  "scope": "classic",
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
  "input_sha256": "sha256:36dbd137c1dafd3e8f4a29e23917b2a23c6dca6c2eacae2219e2473d1661458b",
  "contract_sha256": "sha256:bfe3fc216905988409d5a13f51ed4ab2709768afac7dac9ce951c1faa1c86abd"
}
```

Layers: the tasks parser is the data layer (3–5), the features reader the data-access layer (6–9), the watcher and IPC the endpoint layer (10–14), the views the frontend (15–17). There is no separate business-logic layer and no build configuration change.
