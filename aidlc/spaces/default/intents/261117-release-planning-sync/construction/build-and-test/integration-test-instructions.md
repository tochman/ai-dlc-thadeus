# Integration Test Instructions

The key boundary is the app and git (plus `gh`). `tests/main/planningSync.test.js` covers it with real repositories: a bare `origin.git` and a clone in `os.tmpdir()`, removed after each test. `gh`, `online()` and `isBusy()` are injected stubs.

- **Run:** `npx vitest run tests/main/planningSync.test.js tests/main/ipc.test.js`
- **What is covered:** an untouched story-branch checkout (NFR1), in-place commits on `main`, rebase and conflict, protected `main` to the docs branch and the `gh` merge, no remote, offline or refused pushes, re-apply after `git checkout -- <files>` (NFR2), agent edits on `main`, and a commit refused by a hook.
- **Not covered here:** the real `gh` binary against GitHub, and the built app. Both belong to the manual check before release.
