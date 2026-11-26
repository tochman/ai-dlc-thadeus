# Code Summary — US-1303 Cost per story, epic and release

## Files created

- `src/main/storyLinks.js`: `deliveredStories`, `loadDelivered` (returns `{stories, hand}`), `readHandLinks`, `setHandLink`, `LINKS_PATH` (`.thadeus/story-links.json`, written atomically). [FR1, FR5, NFR1]
- `src/main/parsers/storyCost.js`: pure `rollUp({ delivered, perIntent, epics, releases })`, imported by the renderer. [FR2–FR4, FR6.3, NFR2]
- `src/renderer/StoryCost.jsx`: `CostBadge`, `CostDetail`, `NotLinked`. [FR5, FR6, NFR3]
- Tests: `tests/main/storyLinks.test.js` (8), `tests/main/storyCost.test.js` (12), `tests/renderer/StoryCost.test.jsx` (7).

## Files changed

- `src/main/rework.js`: `overviewRework` also returns `byStage` and `unknown`; `src/main/projectService.js`: `addRework` keeps both. [FR4]
- `src/main/ipc.js`: `features:delivered` (space checked, missing-on-disk intents left out) and `features:setStoryLink` (refuses a dirName that is not an intent in the space; sends `features:changed`); `src/preload/index.js`: `getDeliveredStories`, `setStoryLink`. [FR1, FR5]
- `src/renderer/useFeatures.js` (loads `delivered`), `FeaturesView.jsx` (badge on story, epic and release rows; detail in story detail, epic header and release row), `CostPanel.jsx` ("Not linked to a story" with picker; hand links removable), `ProjectView.jsx` (cost handed up from the intents view via `onCost`), `theme.css` (`story-cost*` LCARS styles), `sv.json` / `en.json` (`storyCost` keys). [FR5, FR6, NFR3, NFR4]
- Feature docs: US-1303 set to 🚧 In progress, for v0.3.2, in `docs/features/epic-13-insights.md` and `docs/FEATURES.md`.
- Test files extended: `rework.test.js`, `ipc.test.js`, `fileWrite.test.js`, `FeaturesView.test.jsx`, `CostPanel.test.jsx`, `useFeatures.test.jsx`, `ProjectView.test.jsx`.

## Key decisions

- Each intent's share is 1/N of its cost and rework, N = the stories it links to; epics and releases sum their stories; an intent linked to two stories of one epic is listed once with both shares counted.
- `incomplete` when a linked intent has an unpriced model; `reworkUnknown` when an intent has no rework or it is marked `unknown`.
- No second cost load: the Features view rolls up from the cost the cost panel already holds.

## Tests

- Main, 10 files: 266 passed, 0 failed. Renderer, 5 files: 107 passed, 0 failed. ESLint and Prettier clean on changed files.
- Not run in this stage: the full suite and the coverage run (`npx vitest run tests/ --coverage`); Build and Test checks the 80% floor. No threshold changed.

## Deviations from the plan

1. `fileWrite.test.js`: `storyLinks.js` added to the SD36 list of `writeAtomic` users.
2. New tests in `useFeatures.test.jsx` and `ProjectView.test.jsx` for the new hook and wiring; the ProjectView mock now returns a stable `cost` object.
3. Rework per stage lives in `overviewRework` (tested), since `addRework` is private.
4. A release has no detail view, so its cost detail sits in the release row.
5. `unit-test-instructions.md` gained one paragraph naming the extra test files found at Step 9.
