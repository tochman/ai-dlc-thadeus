# Code Generation Plan — US-0603 Releases or continuous deployment

## Summary

- Builds: a per-project delivery setting (Releases / Continuous deployment), a release picker on each story, a Releases view, 🚀 Deployed, and a lifecycle-rule notice that follows the setting
- Touches: `src/main/parsers/releases.js` (new), `src/main/releases.js` (new), `parsers/features.js`, `settings.js`, `git.js`, `ipc.js`, preload, `FeaturesView.jsx`, `ProjectSettingsDialog.jsx`, `ProjectView.jsx`, `useFeatures.js`, `featureDocsPrompt.js`, `sv.json`/`en.json`
- Tests: about 25 new unit tests (vitest, main and renderer projects), plus new checks in `featureDocsStatus.test.js`

## Design in short

- **Markers.** A story is planned for a release when its status text has `for vX.Y.Z`, released when it has `Released in vX.Y.Z` (case-insensitive, as the docs already write "released in"). One pure module, `src/main/parsers/releases.js`, owns reading and writing them.
- **Write (FR2.2, FR2.3, NFR1).** `setReleaseMarker(text, storyId, version|null)` changes only the `for vX.Y.Z` text: on the story head line, in the epic's `**Status (…)**` segment and in the `FEATURES.md` segment that names the story (segments split on `·` / `. ` as `featureDocsStatus.test.js` does). It inserts `, for vX.Y.Z` after the status words and before any `(`; removing deletes it with its leading `, `. A segment that does not name the story is left alone. `loadFeatures` adds a `hash` (sha256 of the text read) to the overview and to each epic; the renderer sends those back and `writeFileSafe` refuses a changed file. ponytail: epic and overview are two writes, not one transaction; a refused second write leaves the first in place and the refusal is shown.
- **Tags (NFR2).** `listReleaseTags(root)` in `git.js`: one `git tag --list v* --format=%(refname:short)%09%(creatordate:short)` with fixed arguments, `[]` without git or on any error. Called from the `features:load` handler and returned as `features.tags`.
- **Picker options (FR2.1).** Planned versions from markers, then next patch and next minor after the highest semver tag, then None; deduplicated, newest first. A released story shows its release and no picker (FR2.4).
- **Releases view (FR3, FR7).** `buildReleases(epics, tags)`: one entry per version from markers and tags, newest first, `released` with the tag date when the tag exists. A story still marked `for vX.Y.Z` when tag `vX.Y.Z` exists is `stale`.
- **🚀 Deployed (FR4.2, FR6).** New marker `deployed` in `MARKERS`/`STATUS_MARKER`, stripped from `statusText`; `epicStatusOf` counts a mix of only ✅ and 🚀 as done, all 🚀 as deployed. Filter, badge (`tag tag-done`) and i18n follow.
- **Rule (FR5).** The rule text ends with a tag, `(story-lifecycle: releases v1)` or `(story-lifecycle: continuous v1)`. `ruleStatus(memoryText, delivery)` gives `current`, `missing`, `older` (no tag, or a lower version) or `other` (the other setting's tag). The `features:ruleStatus(projectId, space)` handler reads `aidlc/spaces/<space>/memory/project.md` through `readText` (a missing file is `missing`). The project view shows the notice when the project has AI-DLC and feature docs and the status is not `current`; its button types `lifecycleRulePrompt(delivery)` into the agent tab with `submit: false`. The setup prompt (`featureDocsPrompt`) reuses the same rule text, so a new project gets the tagged rule. The check reruns on `features:changed` (which a setting change sends, FR5.3) and on `project:changed`.
- Projects without feature docs get no notice: they have no stories for the rule to keep.

## Steps

Story: every step implements US-0603 (FR/NFR ids from `requirements.md`).

- [x] Step 1 — Runner: verify `npx vitest run tests/main/features.test.js` runs green before any change; record it in `unit-test-instructions.md`. (NFR3)
- [x] Step 2 — Red: `tests/main/releases.test.js` for `releaseOf`, `setReleaseMarker` (add, change, remove; byte-for-byte compare apart from the marker on a copy of the EPIC-06 lines), `releaseOptions`, `buildReleases` (order, dates, stale), `ruleStatus` (four outcomes); `tests/main/features.test.js` for 🚀 in `statusOf`, `epicStatusOf`, `statusText`. Record the failing output. (FR2.1, FR2.2, FR3.2, FR4.2, FR5.1, FR6, FR7, NFR1)
- [x] Step 3 — Green: `src/main/parsers/releases.js` and the 🚀 changes in `src/main/parsers/features.js`.
- [x] Step 4 — Refactor with the suite green.
- [x] Step 5 — Red: `tests/main/settings.test.js` (`delivery` default `releases`, invalid value refused/sanitized), `tests/main/git.test.js` (`listReleaseTags` with a fake exec: parses lines, `[]` on error), a test for `setStoryRelease` in `tests/main/releases.test.js` with a temp project (writes both files, refuses on a changed hash, refuses a released story), `tests/main/ipc.test.js` for `features:setRelease`, `features:ruleStatus` and `delivery` passed through `projectSettings:set`. Record the failing output. (FR1.1, FR2.3, FR2.4, FR3.2, FR5.2, NFR2)
- [x] Step 6 — Green: `PROJECT_DEFAULTS.delivery` and validation in `src/main/settings.js`; `listReleaseTags` in `src/main/git.js`; `src/main/releases.js` (`setStoryRelease`, `readRuleStatus`); hashes in `loadFeatures`; handlers in `src/main/ipc.js`; `setStoryRelease` and `getLifecycleRuleStatus` in `src/preload/index.js` (and `tests/main/preload.test.js` if it lists channels).
- [x] Step 7 — Refactor with the suite green.
- [x] Step 8 — Red: `tests/renderer/FeaturesView.test.jsx` (picker lists the options and calls the bridge; None removes; refusal shown; released story has no picker; Releases tab lists releases with dates and opens a story; stale flag shown; Continuous deployment hides picker and tab; 🚀 badge and filter), `tests/renderer/ProjectSettingsDialog.test.jsx` (delivery radios save `delivery`), `tests/renderer/featureDocsPrompt.test.jsx` (`lifecycleRulePrompt` per setting carries its tag), `tests/renderer/ProjectView.test.jsx` (notice shows for `missing`/`older`/`other`, button types the prompt without Enter, hidden when `current`). Record the failing output. (FR1.1, FR2, FR3, FR4.1, FR5.2, FR5.3, FR7, FR8)
- [x] Step 9 — Green: `FeaturesView.jsx` (Epics | Releases switch, `ReleasePicker` in `StoryDetail`, `ReleasesView`), `ProjectSettingsDialog.jsx` (delivery fieldset), `featureDocsPrompt.js` (`lifecycleRulePrompt`), `useFeatures.js` (rule status), `ProjectView.jsx` (notice); every new text in `sv.json` and `en.json` via `t()`. `data-testid`s: `features-view-release-picker`, `features-view-tab-releases`, `features-view-release`, `features-view-release-stale`, `project-settings-delivery-<id>`, `lifecycle-rule-notice`, `lifecycle-rule-notice-run`.
- [x] Step 10 — Refactor with the suite green.
- [x] Step 11 — Red/Green: `tests/main/featureDocsStatus.test.js` accepts 🚀 for a delivered story and fails a stale `for vX.Y.Z` when that tag exists (tags from `git tag --list v*`, none when git or tags are missing, as in a shallow CI checkout). (FR6, FR7)
- [ ] Step 12 — Full suite: `npx vitest run tests/` green. (NFR3)
- [x] Step 13 — Documentation and traceability: module header comments name `US-0603` and the FR; no feature-docs status change here (that is the docs step at the PR).

No new dependency, no new data store, no build configuration change. Coverage is not measured in this repository yet (team practice: to be set up separately), so NFR3's 80% floor cannot be checked here; Build and Test reports it as not measured.

## Testing Contract

```json
{
  "version": 1,
  "methodology": "tdd",
  "source": "team",
  "ordering": "For each behaviour, write a failing test first, then the code that makes it pass, then refactor with the suite green.",
  "scope": "ultra-express",
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
  "input_sha256": "sha256:5d2edc438462ecd58d1a189f25096b14e109e68759a39bd787110cab4319df72",
  "contract_sha256": "sha256:4b20260229f72394250d9ed3f4261eb56cb5d29b1135cd7ade31c323a93c7425"
}
```
