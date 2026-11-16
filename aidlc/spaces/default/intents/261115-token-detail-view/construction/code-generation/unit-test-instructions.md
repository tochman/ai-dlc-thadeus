# Unit Test Instructions: US-0208

- **Framework:** vitest 5.1.0; `main` project (node) for `tests/main/tokenReadings.test.js` and `tests/main/tokenChart.test.js`, `renderer` project (jsdom, Swedish locale) for `tests/renderer/TokenDetail.test.jsx`. No new configuration.
- **Run this work's tests:** `npx vitest run tests/main/tokenReadings.test.js tests/main/tokenChart.test.js tests/renderer/TokenDetail.test.jsx tests/renderer/TokenView.test.jsx tests/main/ledger.test.js tests/main/i18nKeys.test.js`
- **Runnable before the first Red:** yes for the existing `TokenView` and `ledger` tests; the three new files are created in Steps 3, 5 and 8.
- **Expected:** about 13 new tests, all green, with the existing ones unchanged.
- **Coverage:** the project's 80% line floor is checked by Build and Test on the full suite.
- **Mocking:** main tests use a temp project folder for `.thadeus/tokens/`, and pass `now` explicitly. Renderer tests mock `window.bridge.getTokenReadings` and `getProjectCost`, and give visx a fixed size (wrap the parent in a sized box or mock `@visx/responsive`'s `ParentSize`), since jsdom has no layout.
- **Test data:** a live intent with 4 readings 30–60 s apart, a finished intent with ledger totals and no readings, and a cost summary with by-stage, by-agent and by-model rows, more than 12 agents in one case.
