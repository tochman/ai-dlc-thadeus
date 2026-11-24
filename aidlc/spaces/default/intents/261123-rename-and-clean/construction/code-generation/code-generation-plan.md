# Code Generation Plan: US-0508 then US-0043

## Summary

- Builds: an intent display name the app keeps in `.thadeus/intent-names.json` (US-0508), then a cleaning pass that clears all 30 ESLint warnings (US-0043)
- Touches: `src/main/intentNames.js` (new), `parsers/intents.js`, `projectService.js`, `ipc.js`, `thadeusSync.js`, preload, `IntentDetail.jsx`, locales; then the 13 files the warnings name, `package.json`, the CI lint step
- Tests: about 14 new tests (8 main for the names file and the list, 6 renderer for the rename field), plus a failing-first test for each real bug the warnings hide

Two branches, in order: `feat/US-0508` from `main`, then `fix/US-0043` from `main` after US-0508's pull request merges. Each story's docs go 🚧 at its start and ✅ when its Build and Test is approved.

## Design (US-0508)

- The display name replaces `slug` in the intent list, in `loadIntentList`. Every screen already shows `i.slug ?? i.dirName` (list, detail, pipeline, agent dialog, cost, story links), so all of them follow with no change [FR1.6]. The original stays as `aidlcSlug`. Lookups and commands use `dirName`, which never changes [FR1.1].
- `.thadeus/intent-names.json` is `{ "<dirName>": "<name>" }`. It is written atomically, and an unreadable file counts as empty and is logged [NFR3]. The existing `.thadeus` watcher already sees it, and a change sends `project:changed` with `indexChanged` so the list reloads [FR1.7].
- The rename field lives in the intent's detail header, which the list row opens. The list itself shows the name [FR1.2]. The field is an LCARS inline edit, like the other detail controls.

## Steps

- [x] Step 1 (US-0508): Branch `feat/US-0508` from `main`. Set US-0508 to 🚧 In progress in its epic, `FEATURES.md` and `docs/releases/0.2.15.md`.
- [x] Step 2: Verify the runner: `npx vitest run tests/main/intentNames.test.js` (see unit-test instructions).
- [x] Step 3 Red (data/business): `tests/main/intentNames.test.js`. Cover: reading a missing or broken file gives `{}`; slug rules accept `rename-and-clean` and refuse spaces, `/`, `..`, uppercase, an empty string after trim, and more than 60 characters; a name taken by another intent's slug or name is refused; an empty name removes the entry; an unknown `dirName` is refused [FR1.1, FR1.3, FR1.4, NFR3].
- [x] Step 4 Green: `src/main/intentNames.js` with `readIntentNames(root)` and `setIntentName(root, dirName, name, { intents })`, using `fileWrite`'s atomic write and `t()` errors.
- [x] Step 5 Red (list): extend `tests/main/intents.test.js` and `tests/main/projectService.test.js`. `mergeIntents` takes `names`, sets `slug` to the name and keeps `aidlcSlug`; with no names, nothing changes [FR1.6].
- [x] Step 6 Green: `parsers/intents.js` and `loadIntentList` read the names.
- [x] Step 7 Red (API): extend `tests/main/ipc.test.js` for `intents:rename`, which validates, writes and sends `project:changed`. Also cover a change to `intent-names.json` from the watcher reloading the list [FR1.5, FR1.7].
- [x] Step 8 Green: add the IPC handler, `renameIntent` in preload, and the watcher hook in `ipc.js`'s `watchThadeusFiles`.
- [x] Step 9 Red (frontend): `tests/renderer/IntentRename.test.jsx`. The detail shows a rename pill (`intent-rename`); editing shows a field (`intent-rename-input`); save calls the bridge with the trimmed value; an error shows `intent-rename-error`; an empty save resets the name; it is available while work is running [FR1.2, FR1.4, FR1.5, FR1.8].
- [x] Step 10 Green: the rename control in `IntentDetail.jsx`, plus `intents.rename.*` keys in `sv.json` and `en.json`, in LCARS styling.
- [x] Step 11 Refactor with the suite green. Then Prettier and ESLint, with no new warnings.
- [x] Step 12 Docs: tick US-0508's criteria and set it to ✅ Done when its Build and Test is approved. The criterion "a running intent cannot be renamed" is reworded to the decision taken [Q3]. Commit the code, the docs and `.thadeus/intent-names.json` if one was created during manual checks; then the pull request and squash merge.
- [x] Step 13 (US-0043): After the merge, branch `fix/US-0043` from `main`. Set US-0043 to 🚧 and fix its note's stale "Built last in v0.3.0" to v0.2.15.
- [x] Step 14: Run `/simplify` over the files the warnings name, and keep its fixes where behaviour stays the same [FR2.1].
- [x] Step 15 Red: where a warning hides a real stale value or a missed rerun, first write a test in that component's renderer test file that fails [FR2.4].
- [x] Step 16 Green: fix each warning for its cause (a stable callback or ref, a missing dependency, a split effect, an extracted value). No rule is switched off; an `eslint-disable` line comes only with a reason [FR2.2].
- [x] Step 17: `"lint": "eslint . --max-warnings 0"` in `package.json`, and CI's `npx eslint .` becomes `npx eslint . --max-warnings 0` [FR2.3].
- [x] Step 18: `npx eslint .` shows 0 problems; the renderer tests of the touched components pass. Docs ✅, then the pull request and squash merge.

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
