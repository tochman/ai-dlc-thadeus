# Unit Test Instructions: U3 u3-speckit-setup

- **Framework:** vitest 5.1.0 with the existing `main` and `renderer` projects. No new configuration is needed.
- **This Unit's tests:** run the command below before Step 3 and after every Green step.

  ```
  npx vitest run tests/main/speckitSetup.test.js tests/main/ipc.test.js tests/main/settings.test.js tests/renderer/SetupSpeckit.test.jsx tests/renderer/ProjectView.test.jsx
  ```

  Until `speckitSetup.test.js` and `SetupSpeckit.test.jsx` exist, the runner check is the same command without those two files.
- **Volume:** 5–8 tests per component: the tool path, the preview, the run, IPC, `SetupSpeckit`, and the setup-view choice.
- **Coverage:** at least 80% of lines in the new files, checked in the full run with `--coverage`.
- **Mocking:**
  - `exec` is injected, as `setup.test.js` already does, to simulate `specify` being found, missing, exiting non-zero, or timing out.
  - Unit tests never run the real `specify`. It runs once, in Step 13, outside the suite.
- **Test data:** use temp-dir fixtures for the harness folders (`.claude/`, `.opencode/`). Nothing is read from this repo.
