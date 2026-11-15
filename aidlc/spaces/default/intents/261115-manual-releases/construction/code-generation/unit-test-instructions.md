# Unit Test Instructions: US-0605

- **Framework:** vitest 5.1.0; `main` project (node) for `tests/main/releases.test.js`, `renderer` project (jsdom, Swedish locale) for `tests/renderer/FeaturesView.test.jsx`. No new configuration.
- **Run this work's tests:** `npx vitest run tests/main/releases.test.js tests/renderer/FeaturesView.test.jsx tests/main/i18nKeys.test.js`
- **Runnable before the first Red:** yes; both files pass today.
- **Expected:** about 12 new tests (8 main, 4 renderer), all green, with the existing ones unchanged.
- **Coverage:** the project's 80% line floor is checked by Build and Test on the full suite.
- **Mocking:** main tests use a temp project folder (as the existing `releases.test.js` does) with `docs/FEATURES.md`, an epic file and `docs/releases/`. Tags are passed to the pure functions as `[{name, date}]`. Renderer tests mock `window.bridge` (`loadFeatures`, `setStoryRelease`, `createRelease`, `deleteRelease`) and re-render with a new `features` prop to end the wait.
- **Test data:** a heading-only plan `# Release plan v0.2.7\n`, a plan with text beyond the heading, a tag `v0.2.6`, and stories with and without "for vX.Y.Z".
