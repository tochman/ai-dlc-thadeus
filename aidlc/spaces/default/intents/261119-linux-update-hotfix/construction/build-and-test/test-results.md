# Test Results: US-0034 (v0.2.12)

## Local, branch `fix/US-0034` (macOS)

| Command | Exit | Result |
|---------|------|--------|
| `npx electron-vite build` | 0 | main, preload, renderer built |
| `npx eslint src tests` | 0 | 0 errors. 29 warnings, all `react-hooks/exhaustive-deps`, none new |
| `npx prettier --check` (changed files) | 0 | clean after `--write` on the two test files (`d918f6f`) |
| `npx vitest run tests/main/updater.test.js tests/main/exec.test.js tests/renderer/UpdateNotice.test.jsx tests/main/i18nKeys.test.js` | 0 | 43 passed |
| `npx vitest run tests/ --coverage` | 1 | 1993 passed, 1 skipped, 5 failed |

- **The 5 failures** are all in `tests/main/releaseVersion.test.js`. They fail because `docs/releases/0.2.12.md` is not in this working tree. The plan is committed on the branch (`df8a594`), but the app removes the file from the working tree on a story branch (US-0032, the app owns the feature-doc commits). The tests read the working tree, so they fail here. CI checks out the commit, and its run is the evidence (below).
- **Coverage** was not reported locally, because the run stopped on those failures. CI's run is the evidence.

## CI, PR #84 (run 44506498894, Ubuntu)

| Job | Result |
|-----|--------|
| verify (ESLint, Prettier, `npx vitest run tests/ --coverage` with the 80% floor) | pass, line coverage 92.42% (statements 90.33%, branches 83.3%, functions 87.53%) |
| build-mac | pass, 3m48s |
| build-linux | pass, 2m13s |

The `releaseVersion` checks passed in CI on the commit. That confirms the local failures came from the working tree only.

## Not run here

- A real Linux install through pkexec or sudo with dpkg. It needs the Linux machine that failed. It is in the release smoke test.
