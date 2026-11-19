# Code Summary: US-0034 Linux update hotfix (v0.2.12)

Branch `fix/US-0034`. Commits: `ad0de9e` (code and tests), `49f573b` (story released in v0.2.12), the merge of `origin/main`, and `df8a594` (release plan kept from main).

## Files

| File | Change |
|------|--------|
| `src/main/exec.js` | `defaultExec` and `runFixed` take `input`, written to the child's stdin and then closed |
| `src/main/updater.js` | `reasonOf()` gives the last line the command printed, or its exit code. `step()` uses it and keeps the original error on `cause`. `installLinux()`: `/usr/bin/pkexec /usr/bin/dpkg`, then `needs-password`, then `/usr/bin/sudo -S -k -p '' /usr/bin/dpkg` with the password on stdin. `install({password})` adds `manual: 'sudo apt install <file>'` on a Linux error |
| `src/main/ipc.js` | `update:install` passes `password` only when it is a string |
| `src/renderer/UpdateNotice.jsx` | A `password` phase (LCARS form, password field, Install and Cancel). A wrong-password line. The `manual` command in the error phase. The field is cleared on every try |
| `src/shared/locales/{en,sv}.json` | `update.exitCode`, `passwordPrompt`, `password`, `install`, `wrongPassword`, `manual` |
| `package.json`, `package-lock.json` | 0.2.12 |
| `docs/releases/0.2.12.md`, `docs/FEATURES.md`, `docs/features/epic-00-fixes.md` | Release plan; US-0034 ✅ Released in v0.2.12 |

## Decisions

- **pkexec counts as "cannot ask" when:** the error is ENOENT, the exit code is 127, or it prints "must be setuid root" or "No authentication agent". Exit 126 means the person closed pkexec's dialog, and the app does not ask again.
- **The password** goes only to sudo's stdin. It is not in args, logs, results or error text, and the tests check this. `-k` keeps sudo from reusing a cached ticket.
- **The real reason is shown for every install step,** macOS included, because the fix is in the shared `step()`.

## Tests

- 14 new tests:
  - `tests/main/exec.test.js`: 3 tests, in a new file.
  - `tests/main/updater.test.js`: 7 new tests, plus 1 changed.
  - `tests/renderer/UpdateNotice.test.jsx`: 4 tests.
- Each test was run red before its code was written.
- This work's command: 43/43 green.
- The full suite before the release plan: 1993 passed, 1 skipped. The only failures were the 5 `releaseVersion` checks, which wait for `docs/releases/0.2.12.md`, now committed.

## Not run here

- **The real Linux install** (pkexec or sudo with dpkg): it needs a Linux machine. Manual check: install the v0.2.12 `.deb` on the machine that failed, then let v0.2.13 or later update it. This release itself still has to be installed by hand on machines stuck on v0.2.11.
- **The `releaseVersion` checks in this working tree:** the app deletes `docs/releases/0.2.12.md` from the working tree on this branch (US-0032). The file is in the branch's commit, and CI checks the commit.

## Deviations

- The developer agent could not be dispatched: a hook rewrites the call, and auto mode then refuses it. The conductor built the plan inline, test first, as planned.
- A release plan `docs/releases/0.2.12.md` was added. The plan's Step 9 missed it, and `tests/main/releaseVersion.test.js` needs it.
