# Integration test instructions

- **Setup:** vitest, with temporary folders where files are read, and Playwright on the built app (Electron's Chromium). Nothing is installed.
- **State file to list and pipeline:** `npx vitest run tests/main/parsers.test.js tests/main/projectService.test.js`
- **Detail, control and dialog together (jsdom):** `npx vitest run tests/renderer/IntentDetail.test.jsx tests/renderer/PlanChange.test.jsx`
- **Built app:** `npx electron-vite build`, then `npx playwright test tests/e2e/intentLayout.spec.js`. The test named `US-0509` opens the dialog at 1280 on a plan with many stages and checks that nothing overflows; a second one types a plan's line into a stand-in CLI and checks its bytes and the focus.
- **By hand, once:** on running work, choose a plan, read the line in the agent tab and send it; the detail follows. The same for a tailored plan, up to AI-DLC's approval question.
- **Test data:** a copy of the fixture project with its own plans; no agent, network or real project.
- **Coverage:** the project's 80% line floor, from `npx vitest run tests/ --coverage`.
