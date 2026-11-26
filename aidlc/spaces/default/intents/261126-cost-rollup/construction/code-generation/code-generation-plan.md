# Code Generation Plan — US-1303 Cost per story, epic and release

## Summary

- Builds: intent cost rolled up to stories, epics and releases, shown in the Features view, plus a "Not linked to a story" list with a story picker in the cost panel
- Touches: new `src/main/storyLinks.js`, `src/main/parsers/storyCost.js`, `src/renderer/StoryCost.jsx`; changes `src/main/projectService.js`, `src/main/ipc.js`, `src/preload/index.js`, `src/renderer/useFeatures.js`, `FeaturesView.jsx`, `CostPanel.jsx`, `ProjectView.jsx`, `sv.json`, `en.json`, feature docs
- Tests: about 30 new tests (vitest): 2 main test files, 1 new renderer test file, additions to `FeaturesView.test.jsx` and `CostPanel.test.jsx`

## Design (short)

- **Which stories (FR1).** `deliveredStories(descText, reqText)`: the story IDs in `project-description.json`; if none, the IDs in the first line of `requirements.md`. `loadDelivered(root, space, dirNames)` reads those two files per intent, then a hand link from `.thadeus/story-links.json` replaces both. `loadStoryLinks` (US-0604 story detail) is left as it is (FR1.4).
- **Link store (FR5, NFR1).** `readHandLinks(root)` / `setHandLink(root, dirName, ids)` in `storyLinks.js`, written atomically like `savings.js`'s dismissal file; an empty list removes the link. Dir names and story IDs are checked; a bad value throws and writes nothing. The only write.
- **Roll-up (FR2–FR4, NFR2).** Pure `rollUp({ delivered, perIntent, epics, releases })` in `parsers/storyCost.js`, imported by the renderer: each linked intent's ledger cost (dollars, the four token kinds, byStage/byAgent/byModel rows) and rework divided by its story count; stories summed, epics = sum of their stories, releases = sum of the stories `buildReleases` puts in them. Each figure carries `intents` (dirName, `sharedWith`, `noCost`, `reworkUnknown`), `incomplete`, and rework with its share. `notLinked` lists intents with no story.
- **Rework by stage.** `addRework` in `projectService.js` also keeps each intent's rework per stage (from the thrown-away attempts' stages), so the story split can show rework beside the cost per stage.
- **Reuse (NFR4).** No new cost read: the renderer rolls up from the `project:cost` result it already holds (`p.cost.perIntent`, archived intents included) and the features it already has. Main adds `features:delivered` and `features:setStoryLink`.
- **UI (FR6, NFR3).** `CostBadge` (figure next to the status, "shared with N stories", nothing for 0 with no intent) and `CostDetail` (total, tokens, rework share, "incomplete", fold-out split by stage/agent/model, the intents named with "no cost recorded" / "rework not known"). LCARS components from `Lcars.jsx`; every text through `t()`.

## Steps

Traceability: every step implements US-1303; the FR/NFR it covers is in brackets.

- [x] Step 1: Feature docs: set US-1303 to 🚧 In progress in its story line, the EPIC-13 **Status (…)** line and its `docs/FEATURES.md` row. [project rule]
- [x] Step 2: Verify the runner: `npx vitest run tests/main/rework.test.js` passes as it is; record the unit-scoped commands in `unit-test-instructions.md`. [NFR5]
- [x] Step 3: Data access — Red: `tests/main/storyLinks.test.js`: description IDs win; requirements first line used only when the description has none; only the first line is read; a hand link replaces both; missing files give []; `setHandLink` writes, removes on [], refuses a bad dirName or story ID and writes nothing; a broken file reads as {}. Record the failing output. [FR1, FR5, NFR1]
- [x] Step 4: Data access — Green: `src/main/storyLinks.js` (`deliveredStories`, `loadDelivered`, `readHandLinks`, `setHandLink`), reusing `storyIdsIn`, `readJsonSafe`, `resolveInRoot`, `writeAtomic`. [FR1, FR5]
- [x] Step 5: Data access — Refactor with the tests green.
- [x] Step 6: Business logic — Red: `tests/main/storyCost.test.js`: one intent → one story gets its whole cost; an intent on 3 stories gives each a third and `sharedWith: 3`; a story summed over two intents (one archived); an intent with no ledger entry adds 0 and is named `noCost`; epic = sum of stories; release = sum of the stories it includes (planned and released markers); rework divided the same way with its share; a model with no price marks the figure `incomplete`; `notLinked` lists intents with no story; split rows merged by name. Add a case to `tests/main/rework.test.js` (or the project-service test that covers `addRework`) for rework per stage. Record the failing output. [FR2, FR3, FR4, FR6.3, NFR2]
- [x] Step 7: Business logic — Green: `src/main/parsers/storyCost.js` (`rollUp`), and rework per stage in `addRework`. [FR2–FR4]
- [x] Step 8: Business logic — Refactor with the tests green.
- [x] Step 9: API — Red: handler tests for `features:delivered` (space checked, missing-on-disk intents left out) and `features:setStoryLink` (passes through, refuses a dirName that is not an intent in the space). Record the failing output. [FR1, FR5]
- [x] Step 10: API — Green: the two handlers in `ipc.js`, `getDeliveredStories` / `setStoryLink` in `preload/index.js`; a link change sends `features:changed` so the views reload. [FR1, FR5]
- [x] Step 11: API — Refactor with the tests green.
- [x] Step 12: Frontend — Red: `tests/renderer/StoryCost.test.jsx` (badge shows dollars; nothing for 0 with no intent; "shared with N stories"; detail shows tokens, rework share, "incomplete", the fold-out split, "no cost recorded", "rework not known"); `FeaturesView.test.jsx` (cost next to the status on a story row, an epic row and a release row; story detail shows `CostDetail`); `CostPanel.test.jsx` ("Not linked to a story" lists the intent, picking a story calls `setStoryLink`, a linked intent can be unlinked). Record the failing output. [FR5, FR6, NFR3]
- [x] Step 13: Frontend — Green: `src/renderer/StoryCost.jsx`; `useFeatures` loads the delivered map; `ProjectView` passes `cost` to `FeaturesView` and `features` to `CostPanel`; `FeaturesView` story, epic and release rows and details; `CostPanel` "Not linked" section; keys in `sv.json` and `en.json`, LCARS styles in the existing stylesheet; `data-testid` shaped `story-cost-<role>`. [FR5, FR6, NFR3, NFR4]
- [x] Step 14: Frontend — Refactor with the tests green.
- [x] Step 15: Checks: the targeted test files, `tests/main/i18nKeys.test.js`, ESLint and Prettier on the changed files. [NFR3, NFR5]
- [x] Step 16: Documentation and traceability: module header and exported-function comments name `US-1303 FRx`; `ponytail:` comments on deliberate shortcuts. [team code style]

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

Layers left out: data model / database (no schema; the only store is one JSON file, covered under data access); environment/build configuration (none changes; vitest config is used as it is).
