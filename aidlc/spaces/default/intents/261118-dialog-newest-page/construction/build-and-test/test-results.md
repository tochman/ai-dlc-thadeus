# Test Results — US-0031 (2026-11-19)

## Build

`npx electron-vite build`: exit 0, built in 5.25 s.

## Unit tests (this work)

The developer ran the plan's commands during Code Generation, test first (Red outputs in `../code-generation/code-summary.md`): the 6 dialog test files passed, 141/141.

## Full suite

1. `npx vitest run tests/ --coverage` (with the build running alongside): 1966 passed, **4 failed**, 150 files. All 4 failures are in `tests/main/agentHooksGuard.test.js`, "exit 0 silently within 100 ms, 20 times each" (RD30). They measured 108–140 ms. Vitest wrote no coverage report because tests failed.
2. `npx vitest run tests/main/agentHooksGuard.test.js` alone: 5 passed, 4 failed the same way (137 ms, 140 ms), with a load average of about 12.
3. `npx vitest run tests/ --coverage --exclude tests/main/agentHooksGuard.test.js`: **1961/1961 passed**, 149 files, coverage thresholds met.

The person asked for a full green run ("we need a coprehensive test coverage. try again and fix"). With the load down to about 3–4:

4. `npx vitest run tests/main/agentHooksGuard.test.js`: 9/9 passed. Each hook command is only `[ -n … ] && [ -f … ] && sh …; exit 0`, so the earlier times were the machine's load.
5. `npx vitest run tests/ --coverage`, alone on the machine: **1970/1970 passed**, 150 files, coverage thresholds met, 92.4% lines.

During Code Generation the developer's full `npx vitest run tests/` passed 1970/1970, including the timing test.

**Diagnosis:** the timing test runs the installed `sh` hook commands, which this change does not touch (`git diff` covers only `src/renderer/App.jsx`, `src/renderer/AgentDialog.jsx`, `src/shared/agentOrder.js` and two renderer test files). It fails because the machine is loaded, not because of a defect.

## Coverage (run 3)

| Scope | Lines |
|---|---|
| All files | 92.39% |
| `src/renderer/AgentDialog.jsx` | 97.75% (floor 80%) |
| `src/shared/agentOrder.js` | 100% (floor 80%) |
| `src/renderer/App.jsx` | 78.3% (no own floor; the project floor applies) |

## Lint and format (changed files)

ESLint: 0 errors, 2 warnings (`App.jsx` lines 152 and 171, `t` missing from deps, from before this change). Prettier: all files formatted.

## Target Verification Matrix

| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |
|---|---|---|---|---|---|---|
| T1-tdd | Testing Contract | failing test before code | Red outputs recorded | `code-summary.md` | code-generation | Met |
| T2-suite | team.md Testing Posture | full suite green | 1970/1970 | run 5 | build-and-test | Met |
| T3-coverage | vitest.config.mjs, team.md | ≥ 80% lines | 92.4% | run 5 | build-and-test | Met |
| T4-lint | project.md Mandated | ESLint and Prettier pass | 0 errors, formatted | lint run | build-and-test | Met |
| T5-ci | Testing Contract | CI before merge | — | the plan runs no CI Pipeline | — | N/A |

Tests ran in Node and jsdom (a DOM emulator), not a real browser; the built app is checked by hand before the release tag.
