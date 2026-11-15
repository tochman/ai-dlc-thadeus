# Test Results: US-0605

Run 2026-11-15 on branch `feat/US-0605`, in Node (vitest `main`) and jsdom (vitest `renderer`).

| Check | Command | Exit | Result |
|---|---|---|---|
| Unit tests (this work) | `npx vitest run tests/main/releases.test.js tests/renderer/FeaturesView.test.jsx tests/main/i18nKeys.test.js` | 0 | 39 / 39 passed (11 new) |
| Full suite + coverage | `npx vitest run tests/ --coverage` | 0 | 1362 / 1362 passed, 104 files; lines 90.35 %, statements 88.2 %, branches 81.55 %, functions 84.06 %; `parsers/releases.js` and `releases.js` lines 100 % / 97 %, `FeaturesView.jsx` 97 % |
| ESLint | `npx eslint .` | 0 | 0 errors, 24 warnings (unchanged) |
| Prettier | `npx prettier --check .` | 0 | clean |
| Build | `npx electron-vite build` | 0 | built |

- **Failures:** none.
- **TDD evidence:** the Red runs (5 business logic, 4 plan files, 3 release list) are in `../code-generation/code-summary.md`.
- **Traceability fix:** the code trace named NFR2's target as prose; it now names `package.json`, and the trace check passes.
- **Not run here:** the release list in the running app (create, add, remove, delete against real files). That is part of the manual `.dmg` check at release.
