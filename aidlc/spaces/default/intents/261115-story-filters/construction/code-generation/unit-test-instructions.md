# Unit Test Instructions: US-0604

- **Framework:** vitest 5.1.0; `main` project (node) for `tests/main/storyFilter.test.js`, `renderer` project (jsdom, Swedish locale) for `tests/renderer/FeaturesView.test.jsx`. No new configuration.
- **Run this work's tests:** `npx vitest run tests/main/storyFilter.test.js tests/renderer/FeaturesView.test.jsx tests/main/i18nKeys.test.js`
- **Runnable before the first Red:** yes for `FeaturesView.test.jsx`; `storyFilter.test.js` is created in Step 3 and fails until Step 4.
- **Expected:** 7 unit tests and 6 view tests new, all green, with the existing ones unchanged (Standard: 5–8 per component).
- **Coverage:** the project's 80% line floor is checked by Build and Test on the full suite.
- **Mocking:** unit tests use plain story objects shaped like the parser's (`id`, `title`, `raw`, `status`, `statusText`, `priority`, `complexity`) inside epics `{id, parsed: {title, stories}}`. View tests reuse the file's fixtures and mocked `window.bridge`; they set `delivery` to `releases` or `continuous`.
- **Test data:** a released story ("✅ Released in v0.2.6"), a done one, one planned "for v0.2.7", one in progress, one without priority, across at least two epics.
