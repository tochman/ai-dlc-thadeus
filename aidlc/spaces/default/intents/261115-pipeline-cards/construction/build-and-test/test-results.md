# Test Results — US-0411 Pipeline cards (2026-11-15)

| Check | Command | Exit | Result |
|-------|---------|------|--------|
| Build | `npm run build` | 0 | Built `dist/THADEUS-0.2.4-universal.dmg` (unsigned) |
| Unit tests (this work) | `npx vitest run tests/main/parsers.test.js tests/renderer/Pipeline.test.jsx` | 0 | 22 passed, 0 failed |
| Full suite + coverage | `npm run coverage` (`vitest run tests/ --coverage`, config `vitest.config.mjs`) | 0 | 102 files, 1285 passed, 0 failed, 0 skipped |
| Lint | `npm run lint` (`eslint .`) | 0 | 0 errors, 22 warnings, none in the files this work changed |
| Format | `npx prettier --check .` | 0 after the fix | See the in-stage fix below |

## Coverage (`@vitest/coverage-v8`, full suite)

- All files: 90.02% lines, 87.82% statements, 80.95% branches, 83.42% functions. The 80% line floor is met and every configured threshold passed.
- `src/renderer/Pipeline.jsx`: 92.85% lines. `src/main/parsers/pipeline.js`: 93.75%. `src/main/parsers/runtimeGraph.js`: 100%.
- `code-summary.md` said coverage tooling was not set up. That was wrong: `npm run coverage` and its 80% threshold already exist (US-0506).

## In-stage fix (rung 1, attempt 1)

`npx prettier --check .` first flagged `src/renderer/Pipeline.jsx`, the only file in the repository that was not formatted. I fixed it with `npx prettier --write src/renderer/Pipeline.jsx`, which only changes formatting. After that the check passed across the repository, and the scoped tests passed again (22 of 22).

## Where the checks ran

The renderer tests ran in jsdom, a DOM emulator, not in a real browser engine. The appearance of the cards in the Electron app (colours, glow under Full, Dämpad and Av) has not been checked by eye; the manual check of the `.dmg` before the release tag covers it.
