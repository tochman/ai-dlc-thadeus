# Test Instructions: US-0044

**Framework:** Playwright 1.65 driving the built Electron app (`tests/e2e`), as US-0608 set it up. The defects are layout (widths, gaps, overflow), which jsdom cannot measure, so the regression is an end-to-end spec. Run everything in the worktree `.claude/worktrees/fix-0044`.

**Run this fix's tests** (two commands; the build must come first):

```bash
npx electron-vite build
npx playwright test tests/e2e/intentLayout.spec.js
```

**Related existing tests** (must stay green):

```bash
npx vitest run tests/main/theme.test.js tests/renderer/IntentDetail.test.jsx tests/renderer/TokenView.test.jsx tests/renderer/BoltDag.test.jsx tests/renderer/Lcars.test.jsx
```

A file in that list that does not exist is left out of the command, not created.

**Tests:** 4, one per acceptance criterion, each run at window widths 1280 and 1920. AC1: no horizontal overflow, and the chips, tabs, head actions, tag and head buttons inside the frame. AC2: the Units graph scrolls inside its panel. AC3: no empty band under the title bar, and the Review heading at least 12 px under the tabs. AC4: the Live tokens panel inside the left arm.

**Test data:** a temporary project made by the spec (`fs.mkdtemp`). It holds an AI-DLC space with one in-flight intent (state, audit, a unit graph and a token log), and a temporary userData whose settings open it with tool paths that point nowhere, so no agent starts. Nothing outside the temporary folder is touched; it is removed in `afterAll`.

**Mocking:** none. The real app reads the real files.

**Coverage:** the project floor is 80% line coverage, measured by Build and Test on the full suite (`npx vitest run tests/ --coverage`). This fix changes CSS and layout, which the floor does not measure.
</content>
</invoke>
<invoke name="Bash">
<parameter name="command">aidlc engine orchestrate next