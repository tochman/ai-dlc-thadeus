# Test Results: US-1101

Run 2026-11-15 on `feat/US-1101` with `main` (v0.2.6 fixes) merged in, inside the app's own terminal.

| Check | Command | Exit | Result |
|---|---|---|---|
| Unit tests (this work) | `npx vitest run tests/main/thirdPartyLicenses.test.js tests/renderer/AboutDialog.test.jsx` | 0 | 11 / 11 passed |
| Full suite + coverage | `npx vitest run tests/ --coverage` | 0 | 1342 / 1342 passed, 104 files; lines 90.28 %, statements 88.1 %, branches 81.46 %, functions 83.84 % |
| ESLint | `npx eslint .` | 0 | 0 errors, 24 warnings (unchanged) |
| Prettier | `npx prettier --check .` | 0 | clean |
| Privacy search | `git grep -I -i -E '<home path>\|<reference project>\|<personal email>'` | 1 (no match) | 0 hits |
| Secret scan | `gitleaks git --log-opts="--all" .` | 0 | no leaks (37 MB scanned) |
| Build | `npx electron-vite build` then `node scripts/third-party-licenses.mjs` | 0 | built; licence file 128 packages + Electron |

## Failures and fixes

- First coverage run: 1 failed, `tests/main/agentChannelScript.test.js` › "closeSession makes a waiting hook exit at its next poll (RD5)" — the 100 ms wall-clock window missed under full-suite load with coverage; it passed 3 / 3 alone. In-stage fix: `retry: 2` like the other US-0010 wall-clock tests, each attempt keeping the full 100 ms limit. Re-run: all passed.

## Not run here

- The CI gitleaks step runs on the pull request.
- Browser behaviour: the About LICENSES button was checked in jsdom only, not in a real browser engine or the built app; the `.dmg` check by hand covers it.
