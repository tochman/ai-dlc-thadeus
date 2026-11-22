# Code Generation Plan: U3 u3-speckit-setup (US2.1 / US-1405)

**Branch:** `feat/US-1405`, created from `feat/US-1401`.
- U3's setup entry point sits in the no-framework view that U1 reworked. Building on U1 avoids a conflict with U1's changes.
- The pull request opens after US-1401 is merged, then rebases on `main`. It is squash-merged as `feat(US-1405): set up Spec Kit in a project`.

**Sources:**
- `functional-spec.md` (including "Settled after the design review")
- `rules.md` (BR3.1–BR3.9)
- `frontend-components.md`
- contract C3

Checked against `specify` 1.4.3. Each step's acceptance criteria are named in brackets.

## Steps

- [x] **Step 1: Branch and story status.**
  - `git switch -c feat/US-1405` from `feat/US-1401`.
  - Set US-1405 to 🚧 In progress, "for v0.3.0", in four places: its marker in the epic file, the epic's Status line, the epic's FEATURES.md row, and the epic-file text.
- [x] **Step 2: Runner check.** Run the unit-scoped command on the unchanged tree and record the baseline.
- [x] **Step 3: Tool path, Red then Green.**
  - Red: `tests/main/tools.test.js` (or the existing settings test) expects `specify` in `TOOL_IDS`.
  - Green: add it in `src/main/tools.js`. [AC2.1.1]
- [x] **Step 4: Business logic (preview), Red.** In `tests/main/speckitSetup.test.js`, test that:
  - a missing `specify` gives `specifyOnPath: false` and the install hint, with no throw;
  - when `specify` is found, its version is read;
  - harness detection handles none, claude, opencode and both;
  - the preview records `harness`, the exact command, and the "folder not empty" note.

  [AC2.1.1, AC2.1.2]
- [x] **Step 5: Business logic (preview), Green.** Write `getSpeckitSetupInfo(root, { harness, exec })` in `src/main/speckitSetup.js`. Its header names `US-1405 FR3`.
- [x] **Step 6: Business logic (run), Red.** In the same test file, test that:
  - an unknown harness, a missing preview, a preview for another harness, and a second parallel run are each refused;
  - success returns the output;
  - a non-zero exit returns `failed`, and a timeout returns `timeout`;
  - the exact argument list is `init --here --force --non-interactive --integration <h>`;
  - a write spy shows no U3 write under `.specify/` or `specs/`.

  [AC2.1.1, AC2.1.3, AC2.1.4]
- [x] **Step 7: Business logic (run), Green.** `runSpeckitSetup(root, { harness }, info, { exec })`, using `runFixed` with a 120 s timeout.
- [x] **Step 8: Business logic, Refactor.** Refactor with the tests green.
- [x] **Step 9: API, Red then Green.**
  - Red: the ipc test checks `speckit:setupPreview` and `speckit:setup` (it stores the preview per project and refuses without one).
  - Green: wire them up in `ipc.js` and `preload/index.js`. [AC2.1.1]
- [x] **Step 10: Frontend, Red.** In `tests/renderer/SetupSpeckit.test.jsx`, test:
  - the missing-CLI hint and Retry;
  - the harness picker for 0 or 2 harnesses;
  - the command shown before confirm;
  - Run, then the output on success and on failure.

  In the setup view test, the choice between AI-DLC and Spec Kit shows. [AC2.1.1–AC2.1.3]
- [x] **Step 11: Frontend, Green.**
  - Add `SetupSpeckit.jsx`, an LCARS panel mirroring `SetupAidlc.jsx`.
  - Add the choice to the setup view.
  - Add the sv and en keys listed in `frontend-components.md`.
- [x] **Step 12: Frontend, Refactor.** Refactor with the tests green.
- [x] **Step 13: Real-tool check.** In a scratch folder inside the project's ignored temp area, run the built preview and run against `specify` 1.4.3 once, and record the result in `code-summary.md`. The folder is removed afterwards, and nothing from it is committed.
- [x] **Step 14: Documentation and traceability.**
  - Write `code-summary.md` and `traceability.json`.
  - Set US-1405 to ✅ Done, tick its criteria, keep "for v0.3.0", and update the FEATURES.md row.
  - Run the full verification command.

## Story-to-step map

| Story / AC | Steps |
|---|---|
| US2.1 AC2.1.1 (init after preview, harness picked) | 3, 4, 5, 6, 7, 9, 10, 11, 13 |
| AC2.1.2 (no specify: hint, no install) | 4, 5, 10, 11 |
| AC2.1.3 (failure output, project unchanged) | 6, 7, 10, 11 |
| AC2.1.4 (only specify writes .specify/ and specs/) | 6 |

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

The "Data model / database" and "Repository / data access" layers do not apply: U3 keeps no data. The setup module is the business-logic layer.
