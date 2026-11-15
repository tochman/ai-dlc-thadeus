# Code Generation Plan: US-0604, filter epics and user stories

## Summary

- Builds: one shared story filter, a filter bar on the Epics tab with a cross-epic match list, and the same filters on each epic's page
- Touches: new `src/renderer/storyFilter.js`, `src/renderer/FeaturesView.jsx`, `src/shared/locales/{sv,en}.json`
- Tests: about 13 new tests: 7 unit tests in `tests/main/storyFilter.test.js`, 6 component tests in `tests/renderer/FeaturesView.test.jsx`

## Design in brief

- **`src/renderer/storyFilter.js` (pure, no React; one module so the bar and the page always agree).**
  - `storyState(story)` gives `planned | progress | done | released | deployed`: `released` when `releaseOf(story.statusText).released`, else the parser's `status` (FR4.1).
  - `storyRows(epics)` flattens to `[{epicId, epicTitle, story}]`.
  - `filterOptions(rows, tags)` gives the epics, priorities, complexities and release versions found, plus the five states (FR4.3, FR4.2). The versions come from `buildReleases`.
  - `EMPTY_FILTERS = {state, release, epic, priority, complexity, text}`, all `''`. `release: '-'` means "No release".
  - `isActive(filters)` and `matches(row, filters)`: every set field must equal the story's own value, and `text` is a case-insensitive substring of the title or the raw story text (FR3, FR4.4).
- **`StoryFilters` component (in `FeaturesView.jsx`).** Labelled selects for state, release (only when `delivery === 'releases'`), epic (only on the Epics tab), priority and complexity, plus a text input, a "{n} stories" count in an `aria-live="polite"` region, and a "Clear filters" button shown when any filter is set (FR3, NFR2). The state lives in `useState` only, so nothing is saved (FR5).
- **Epics tab (FR1).** `StoryFilters` sits above the epic list. While a filter is set, a match list replaces the epic list: each row shows the story id and title, its epic id, and its status badge, and choosing it calls the existing `openStory(epicId, storyId)` (FR1.1). With no filter set, the epic list shows as today (FR1.2).
- **Epic page (FR2).** `EpicDetail` swaps its two filters for `StoryFilters` without the epic field. The `features-view-filter-status` and `features-view-filter-priority` test ids are kept, and their state select offers the five states.
- **Texts (FR6).** New `features.filter.*` keys and `features.status.released` in both locales.

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

Inapplicable layers: no database, data access or API changes; the parser already gives every field. The business logic is `storyFilter.js` (Steps 3–4); the frontend is the view (Steps 5–6). The key boundary for Standard's integration tests is the view rendering real parsed epics through the filter (Step 5).

## Steps

- [x] **Step 1: Structure.** One new file, `src/renderer/storyFilter.js`, with a header comment naming US-0604.
- [x] **Step 2: Runner.** Verify `npx vitest run tests/renderer/FeaturesView.test.jsx` passes as it stands; record the count. The new `tests/main/storyFilter.test.js` runs in the `main` project (plain JS, no DOM).
- [x] **Step 3: Business logic, Red.** `tests/main/storyFilter.test.js`, failing tests:
  1. `storyState` gives `released` for a "Released in" story, `done` for a done one without it, and the parser status otherwise (FR4.1).
  2. `filterOptions` lists only the epics, priorities, complexities and versions that occur, plus "No release" (FR4.2, FR4.3).
  3. `matches` with each single field: state, release, "No release", epic, priority, complexity (FR3).
  4. Two fields combine as AND (FR3).
  5. Free text is case-insensitive and searches the title and the story text (FR4.4).
  6. A story without a priority or complexity fails only when that filter is set (assumption 3).
  7. `isActive` is false for `EMPTY_FILTERS`, and true for whitespace-free text or any set field.
- [x] **Step 4: Business logic, Green and Refactor.** Implement `storyFilter.js` until green; keep it free of React.
- [x] **Step 5: View, Red.** In `tests/renderer/FeaturesView.test.jsx` (Swedish UI, the existing fixtures):
  8. The Epics tab shows the filter bar; setting a state replaces the epic list with the matching stories from several epics, each naming its epic, with the count (FR1, FR1.1).
  9. Choosing a match row opens the story on its epic's page (FR1.1).
  10. "Clear filters" empties every filter and the epic list returns (FR1.2, FR3).
  11. The epic page offers state, priority, complexity, release and text, but no epic filter; text plus priority combine (FR2, FR3).
  12. The release filter is absent with Continuous delivery and present with Releases (FR4.2).
  13. Filters start empty after the view is unmounted and opened again (FR5).
- [x] **Step 6: View, Green and Refactor.** Add `StoryFilters`, the match list and the `EpicDetail` swap in `FeaturesView.jsx`, with test ids `features-view-filters`, `features-view-filter-text`, `features-view-filter-clear`, `features-view-filter-count`, `features-view-matches`, keeping `features-view-filter-status` and `features-view-filter-priority`.
- [x] **Step 7: Texts.** Add `features.filter.*` and `features.status.released` to `sv.json` and `en.json`; run `npx vitest run tests/main/i18nKeys.test.js` (FR6).
- [x] **Step 8: Documentation and traceability.** Write `code-summary.md` and `traceability.json` (`upstream_ids` + `coverage[{id, status, target}]`, each target a real file).

Environment/build configuration: none (NFR1).
