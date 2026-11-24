# Code Generation Plan: U4 u4-framework-choice (US2.2 / US-1406)

## Summary

- Builds: the first-open framework choice screen: detection asks when `.thadeus/project.json` is missing, `project:frameworkScan` and `project:chooseFramework`, and the LCARS `FrameworkChoice` screen that saves the choice or runs the missing framework's setup first
- Touches: `src/main/frameworkChoice.js` (new), `src/main/projectService.js`, `src/main/tools.js`, `src/main/ipc.js`, `src/preload/index.js`, `src/renderer/FrameworkChoice.jsx` (new), `src/renderer/ProjectView.jsx`, the sv/en locales, feature docs
- Tests: about 40 tests: detection (6), tool lookup (6), scan (7), choose (8), IPC (5), renderer (10), timed scan (1)

**Branch and precondition:** U4 reuses U3's setup panel and its `specify` tool row, so it builds on `main` after US-1405 (`feat/US-1405`, not yet merged) is merged. Before Step 1: US-1404 (U7) and US-1410 (U10), uncommitted on `feat/US-1404`, are committed on their branches, and US-1405 is merged into `main`. Then `git switch -c feat/US-1406 main`. The intent record changes travel with it and are committed on it.

**Sources:** `functional-spec.md`, `rules.md` (BR4.1–BR4.8), `frontend-components.md`, `security-design.md`, `performance-design.md`, `logical-components.md`, contracts C1, C2, C4. The NFR reviews' findings are settled in Steps 4, 6, 10 and 12. Each step's criteria are in brackets.

## Steps

- [x] **Step 1: Branch and story status.** `git switch -c feat/US-1406 main` once the precondition holds. Set US-1406 to 🚧 In progress, "for v0.3.0", in its epic marker, the epic's Status line and its FEATURES.md row.
- [x] **Step 2: Runner check.** Run the unit-scoped commands from `unit-test-instructions.md` on the unchanged tree and record the baseline. No new dependency. [NFR8.2]
- [x] **Step 3: Detection, Red.** `tests/main/projectService.test.js`: with no file, one, both or neither folder found gives `framework: null, source: 'ask'`; a valid file is followed; an unreadable, invalid or unknown-version file keeps U2's detection with its reason; `foundFrameworks(root)` returns the same `found` as detection. Rewrite the `askWhenBoth` tests for the new rule. Record the failing output. [BR4.1, AC2.2.1]
- [x] **Step 4: Detection, Green and Refactor.** In `projectService.js`: export `foundFrameworks(root)` (moved out of `detectProject`); rename the private `chooseFramework` to `pickFramework` so it no longer shares a name with U4's function; return `ask` when `read.reason === 'missing'`; drop the `askWhenBoth` option. Existing AI-DLC projects without the file now see the screen once (Q1 = A).
- [x] **Step 5: Tool lookup, Red.** `tests/main/tools.test.js`, `locateTool(name, { searchPath })`: saved and executable gives the saved path; saved but deleted, or not executable, gives null; no saved path uses the bare name on the PATH; not on the PATH gives null; `specify` uses its saved path from U3's tool row the same way; nothing is run (injected `exec` never called). Record the failing output. [NFR4.1, NFR4.4]
- [x] **Step 6: Tool lookup, Green.** Export `locateTool` from `tools.js`, built on the existing `isExecutable` and `resolveOnPath`. The Tools section's `toolRow` is unchanged.
- [x] **Step 7: Scan, Red.** `tests/main/frameworkChoice.test.js` on `fs.mkdtemp` fixtures: `found` and `cli` for each case; a throwing lookup gives `false`; proposal for one, both and neither [BR4.2, BR4.3]; a write spy shows no fs write call [BR4.7, NFR3.1]. Record the failing output.
- [x] **Step 8: Scan, Green.** `src/main/frameworkChoice.js`, `frameworkScan(root)`: `foundFrameworks` plus two `locateTool` calls in parallel over one `readLoginPath()`. Header names `US-1406 FR4`.
- [x] **Step 9: Choose, Red.** Same file: an unknown framework (`''`, `'AIDLC'`, `'../x'`, an object) rejects before any file access [BR4.8, NFR3.2]; found writes through `writeProjectFile` and returns `{ ok: true, file: '.thadeus/project.json', next: 'none' }` [BR4.5]; not found writes nothing, runs nothing and returns `file: null` with `next: 'setupAidlc'` or `'setupSpeckit'` [BR4.6, NFR4.2]; U2's `{ ok: false }` (write failure, newer version) rejects with its translated message; a file that appeared after the scan is overwritten with the choice, its other keys kept. Record the failing output.
- [x] **Step 10: Choose, Green and Refactor.** `chooseFramework(root, framework)` in `frameworkChoice.js`, as `security-design.md` orders it.
- [x] **Step 11: IPC, Red.** `tests/main/ipc.test.js`: `project:frameworkScan` and `project:chooseFramework` resolve the project by id and reject an unknown id; extra arguments are ignored; after a found choice the project record's framework is set, the setup watcher is closed, the space or Spec Kit watcher starts, and `project:detected` is sent with the chosen framework within 2 s [NFR3.3, NFR7.1]; a not-found choice changes none of these. Record the failing output.
- [x] **Step 12: IPC, Green and Refactor.** Extract the body of `watchForSetup`'s `onFound` into `applyDetection(projectId)` and call it from both `onFound` and the `project:chooseFramework` handler after a write, so the switch has one owner. Preload: `frameworkScan(projectId)`, `chooseFramework(projectId, framework)`.
- [x] **Step 13: Timed scan.** A test in the retried `scripts` project: `frameworkScan` with a stubbed PATH returns within 1 s (300 ms is the aim). [NFR4.3]
- [x] **Step 14: Screen, Red.** `tests/renderer/FrameworkChoice.test.jsx` (and `ProjectView.test.jsx` for the mount): Scanning, scan failed with Retry, choosing; found and PATH status for each option; the proposal preselected and one click confirms; both or neither found, Confirm waits for a pick; Confirm disabled while saving and a double click sends one call [NFR7.2]; a missing framework shows its setup panel, Back returns with no call, a successful setup saves, a failed or closed setup saves nothing; a save failure shows its reason; `ProjectView` renders the screen for `framework === null` in place of U3's choice; texts through `t()`. Record the failing output. [AC2.2.1–AC2.2.3, BR4.4, BR4.6]
- [x] **Step 15: Screen, Green and Refactor.** `FrameworkChoice.jsx` in the LCARS frame with the test ids in `frontend-components.md`, reusing `SetupAidlc` and `SetupSpeckit`; `ProjectView.jsx` swaps U3's simple choice for it. Add the `frameworkChoice.*` keys and the reject reasons to `sv.json` and `en.json`. Run ESLint and Prettier on the changed files. [NFR1.1, NFR2.1]
- [x] **Step 16: Documentation and traceability.**
  - Update C4 in `contract-summary.md`: `file` is `.thadeus/project.json` or null (additive, as `functional-spec.md` says).
  - Write `code-summary.md`, `source-manifest.json` and `traceability.json`.
  - Set US-1406 to ✅ Done, tick its criteria, keep "for v0.3.0", and update the FEATURES.md row.

## Story-to-step map

| Story / AC | Steps |
|---|---|
| US2.2 AC2.2.1 (what was found and which tools are on the PATH) | 3–8, 14, 15 |
| AC2.2.2 (one found is proposed and confirmed in one click; both: the chosen one only) | 7–12, 14, 15 |
| AC2.2.3 (neither or missing: setup first; nothing written before Confirm) | 9–12, 14, 15 |

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
