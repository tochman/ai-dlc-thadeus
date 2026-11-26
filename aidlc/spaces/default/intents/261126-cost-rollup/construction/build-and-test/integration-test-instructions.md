# Integration Test Instructions — US-1303

Key boundaries, all run with vitest (Node for `main`, jsdom for `renderer`; no real browser):

| Boundary | Test file | What it checks |
|----------|-----------|----------------|
| IPC → story links store | `tests/main/ipc.test.js` | `features:delivered` checks the space and leaves out missing intents; `features:setStoryLink` refuses an unknown intent, writes, sends `features:changed` |
| Store → file system | `tests/main/storyLinks.test.js`, `tests/main/fileWrite.test.js` | atomic write in `.thadeus/`, `storyLinks.js` registered as a `writeAtomic` user |
| Cost summary → roll-up | `tests/main/rework.test.js`, `tests/main/storyCost.test.js` | rework per stage reaches the roll-up shape |
| Hook → views | `tests/renderer/useFeatures.test.jsx`, `tests/renderer/ProjectView.test.jsx` | delivered map loads and reloads; cost handed to the Features view, features to the cost panel |

Run: `npx vitest run tests/main/ipc.test.js tests/main/fileWrite.test.js tests/renderer/useFeatures.test.jsx tests/renderer/ProjectView.test.jsx`

Coverage: the project floor (80% lines over `src/**`) is checked on the full suite, `npx vitest run tests/ --coverage`. Test data: inline fixtures and temporary folders per test.
