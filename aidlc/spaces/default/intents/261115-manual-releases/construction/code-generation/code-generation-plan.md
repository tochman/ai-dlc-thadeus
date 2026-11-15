# Code Generation Plan: US-0605, create a release by hand in the release list

## Summary

- Builds: release plan files in `docs/releases/` as releases, New release / add / remove / delete in the release list
- Touches: `src/main/parsers/releases.js`, `src/main/releases.js`, `src/main/features.js`, `src/main/ipc.js`, `src/preload/index.js`, `src/renderer/FeaturesView.jsx`, `src/shared/locales/{sv,en}.json`
- Tests: about 12 new tests in `tests/main/releases.test.js` and `tests/renderer/FeaturesView.test.jsx`

## Design in brief

- **Plan files (FR1.3, FR2).** `docs/releases/` is the folder beside the overview's own folder (`<dirname(overviewRel)>/releases/`). A file named `X.Y.Z.md` is release `vX.Y.Z`; any other name is ignored. `loadFeatures` lists them as `plans: [{version, file, hash, headingOnly}]`, where `headingOnly` means the text is exactly `# Release plan vX.Y.Z` plus whitespace. A missing folder gives `plans: []`.
- **Parser (pure).** `releaseOptions(epics, tags, plans = [])` adds untagged plan versions and the next **major** (`v{M+1}.0.0`) to today's options (FR1.1, FR2.1). `buildReleases(epics, tags, plans = [])` adds an entry per plan version and gives each entry `plan: {file, hash, headingOnly} | null`. A new pure `newReleaseError(version, releases)` returns null, `'format'` or `'exists'` (FR1.2). A new `canDelete(entry)` is true only for untagged, no stories, `plan.headingOnly` (FR4, FR4.1). `VERSION` stays private; the helpers sit in the same module.
- **Main writes (NFR1).** `createRelease(root, overviewRel, version)` reloads the features, refuses with `newReleaseError`, refuses when the file exists, and writes the heading with `writeAtomic` inside `resolveInRoot` (creating `docs/releases/` when missing). `deleteRelease(root, overviewRel, {version, hash})` reloads, refuses unless `canDelete` holds and the file's hash still equals `hash`, then removes the file.
- **IPC (FR2.2).** `features:createRelease` and `features:deleteRelease` in `ipc.js`, both followed by `features:changed`, as `features:setRelease` is. `featureWatchPaths` also watches the plans folder. Preload gets `createRelease` and `deleteRelease`.
- **Release list (FR3, FR5).** `ReleasesView` gets `projectId`. With `delivery === 'releases'` it shows:
  - a "New release" button that opens a small form, with an input and the three suggestions as buttons;
  - under each planned release, an "Add story" select of the stories with no release, which calls `setStoryRelease`, and a "Remove" button on each of its stories, which sets the release to null (FR3.1, FR3.2);
  - a "Delete" button when `canDelete`.

  While a write waits, and until the next `features` prop arrives, every action in the list is disabled (FR3.3). A failure shows one sentence (NFR3).
- **Texts (FR6).** New `features.release.*` keys in both locales.

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

Inapplicable layers: no database. The data-access layer is the plan files (Steps 5–6), the business logic is the pure parser (Steps 3–4), the API is the IPC/preload bridge (Step 7) and the frontend is the release list (Steps 8–9).

## Steps

- [x] **Step 1: Structure.** No new source files; the work stays in the files named in the Summary (US-0605).
- [x] **Step 2: Runner.** Verify `npx vitest run tests/main/releases.test.js tests/renderer/FeaturesView.test.jsx` passes as it stands; record the count.
- [x] **Step 3: Business logic, Red.** In `tests/main/releases.test.js`, failing tests:
  1. `releaseOptions` adds the next major and untagged plan versions (FR1.1, FR2.1).
  2. `buildReleases` makes an entry for a plan version with no stories, merged with markers and tags of the same version, with `plan` set (FR2, FR2.1).
  3. `newReleaseError` gives `'format'` for `1.2.3` and `v1.2`, and `'exists'` for a tag, a marker or a plan version (FR1.2).
  4. `canDelete` is true only for an untagged, story-less, heading-only plan (FR4, FR4.1).
- [x] **Step 4: Business logic, Green and Refactor.** Implement them in `src/main/parsers/releases.js` until green, then tidy the code.
- [x] **Step 5: Plan files, Red.** In the same file, against a temp project:
  5. `loadFeatures` lists `docs/releases/X.Y.Z.md` as plans with `headingOnly`, ignores other names, and gives `[]` with no folder (FR2).
  6. `createRelease` writes the heading file, creating the folder, and refuses a bad version, an existing version and an existing file (FR1.2, FR1.3, NFR1).
  7. `deleteRelease` removes a heading-only file and refuses one with text, one with stories, a tagged one and a stale hash (FR4, FR4.1, NFR1).
  8. `featureWatchPaths` includes the plans folder (FR2.2).
- [x] **Step 6: Plan files, Green and Refactor.** Implement them in `src/main/features.js` and `src/main/releases.js`.
- [x] **Step 7: IPC.** Add `features:createRelease`, `features:deleteRelease` and the preload bridge, each sending `features:changed` (FR2.2). Thin pass-throughs, covered by Steps 5–6 and by the renderer tests' bridge calls.
- [x] **Step 8: Release list, Red.** In `tests/renderer/FeaturesView.test.jsx` (Swedish UI, bridge mocked):
  9. New release shows the three suggestions; a bad or existing version shows the message, and a good one calls `createRelease` (FR1, FR1.1, FR1.2).
  10. Add story calls `setStoryRelease` with the version, Remove calls it with null, and the actions stay disabled until the next `features` arrives (FR3.1–FR3.3).
  11. Delete shows only for a deletable release and calls `deleteRelease` (FR4, FR4.1).
  12. With Continuous delivery, none of these actions show (FR5).
- [x] **Step 9: Release list, Green and Refactor.** Implement them in `FeaturesView.jsx` (`ReleasesView` takes `projectId`), with `data-testid` values like `releases-new`, `releases-add-story`, `releases-remove-story`, `releases-delete`.
- [x] **Step 10: Texts.** Add the `features.release.*` keys to `sv.json` and `en.json`; run `npx vitest run tests/main/i18nKeys.test.js` (FR6).
- [x] **Step 11: Documentation and traceability.** Write `code-summary.md` and `traceability.json` (shape: `upstream_ids` + `coverage[{id, status, target}]`).

Environment/build configuration: none (NFR2).
