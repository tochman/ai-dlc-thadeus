# Unit Test Instructions: US-0034

- **Framework:** vitest 5.1.0, projects `main` (node) and `renderer` (jsdom). Nothing to set up.
- **Run this work's tests:**

  ```
  npx vitest run tests/main/updater.test.js tests/main/exec.test.js tests/renderer/UpdateNotice.test.jsx tests/main/i18nKeys.test.js
  ```

- **Expected coverage:** one test per acceptance criterion (about 8 new tests). The project's 80% line floor is checked by Build and Test on the full suite.
- **Mocking:**
  - `tests/main/updater.test.js` uses `fakeExec`. An answer that is an `Error` with `message: 'Command failed: …\n<stderr>'` and `code: <exit>` stands for a failing command. The second argument to `exec` holds the options, so tests check `options.input` for the password.
  - The renderer tests stub `window.bridge.installUpdate`.
- **Test data:** a dummy password such as `'hunter2'`. Tests check that it never shows up in the args.
