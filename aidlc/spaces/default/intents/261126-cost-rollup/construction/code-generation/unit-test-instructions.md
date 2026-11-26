# Unit Test Instructions — US-1303 Cost per story, epic and release

## Framework

vitest 5.1.0, as configured in `vitest.config.mjs` (projects `main`: node, `tests/main/**`; `renderer`: jsdom, `tests/renderer/**`, Swedish locale). Nothing new to install or configure.

## Run this work's tests

Runnable before the first Red step (the runner check):

```bash
npx vitest run tests/main/rework.test.js
```

This work's tests, scoped to its files:

```bash
npx vitest run tests/main/storyLinks.test.js tests/main/storyCost.test.js tests/main/rework.test.js tests/main/i18nKeys.test.js
npx vitest run tests/renderer/StoryCost.test.jsx tests/renderer/FeaturesView.test.jsx tests/renderer/CostPanel.test.jsx
```

The IPC handler tests go in the existing test file that covers the `features:*` handlers (found at Step 9) and are run by path the same way.

Found during the build, run the same way: `tests/main/ipc.test.js` (the two handlers), `tests/main/fileWrite.test.js` (the SD36 list of `writeAtomic` users, now with `storyLinks.js`), `tests/renderer/useFeatures.test.jsx` (the delivered stories load) and `tests/renderer/ProjectView.test.jsx` (cost handed to the Features view, stories to the cost panel).

Lint and format on the changed files:

```bash
npx eslint src/main/storyLinks.js src/main/parsers/storyCost.js src/main/projectService.js src/main/ipc.js src/preload/index.js src/renderer/StoryCost.jsx src/renderer/FeaturesView.jsx src/renderer/CostPanel.jsx src/renderer/ProjectView.jsx src/renderer/useFeatures.js
npx prettier --check src/main/storyLinks.js src/main/parsers/storyCost.js src/renderer/StoryCost.jsx src/renderer/FeaturesView.jsx src/renderer/CostPanel.jsx
```

## Expected coverage targets

About 30 new tests, 5–8 per component: `storyLinks` (data access), `storyCost` (roll-up), the two IPC handlers, `StoryCost.jsx`, and the additions to the Features view and cost panel. The project floor is 80% line coverage over `src/**`; Build and Test checks it on the full suite (`npx vitest run tests/ --coverage`), not on these scoped runs. The threshold is not changed.

## Mocking and stubbing

- `storyLinks`: a temporary project folder per test (`fs.mkdtemp` under the OS temp dir, as the other main tests do) with `project-description.json`, `requirements.md` and `.thadeus/story-links.json` written in it.
- `storyCost`: pure; plain objects shaped like `summarizeLedger`'s `perIntent` (with `rework`) and `loadFeatures`' epics.
- Renderer: `window.bridge` stubbed with `vi.fn()` for `getDeliveredStories` and `setStoryLink`, as the existing Features view and cost panel tests do.

## Test data

Small fixtures inline in each test: two or three intents, one shared by three stories, one archived, one with no ledger entry, one with a model that has no price, one release with a planned and a released story.
