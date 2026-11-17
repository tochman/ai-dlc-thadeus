# Test Results: US-0212 THADEUS cost rule pack

Run 2026-11-17 on `main` working tree (uncommitted story changes).

## Build

`npx electron-vite build`: exit 0, `✓ built in 2.85s`.

## Unit tests

`npx vitest run tests/main/costRules.test.js tests/renderer/CostRulesSection.test.jsx tests/main/i18nKeys.test.js tests/main/preload.test.js`: exit 0, 4 files, 34 tests passed.

## Full suite with coverage

1. First run `npx vitest run tests/ --coverage`: exit 1, 1 failed of 1596.
   - `tests/main/fileWrite.test.js` > `writeAtomic` > "is imported only by …" (SD36): the new `src/main/costRules.js` uses `writeAtomic` and was not on the allowed list.
   - Fix (in-stage, attempt 1): added `main/costRules.js` to the list with its reason (validated space name, table-only target, resolved in the root), like US-0208, US-0209 and US-1201 before it. The module was checked: `targetFile` refuses anything outside the table and `resolveInRoot` resolves it.
2. Second run, same command: exit 0, 134 files, 1596 tests passed.
   - Coverage, all files: lines 91.99%, statements 89.98%, branches 82.66%, functions 87.08%. Floor 80% lines: met.
   - `src/main/costRules.js`: lines 95.68%.

## Style

- `npx eslint` on the 15 changed files: exit 0, 0 errors, 11 warnings (`react-hooks/exhaustive-deps` in existing hooks of `ProjectSettingsView.jsx` and `ProjectView.jsx`).
- `npx prettier --check` on the same files: exit 1 at first, three files unformatted (`src/shared/costRules.js`, `tests/main/costRules.test.js`, `tests/main/fileWrite.test.js`). Fixed with `prettier --write`; `npx prettier --check src tests` then passed. The three test files rerun afterwards: 35 passed.

## Target Verification Matrix

| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |
|---|---|---|---|---|---|---|
| T-SUITE | team.md Testing Posture | full suite green | 1596/1596 passed | second coverage run above | build-and-test | Met |
| T-COV | team.md, vitest.config.mjs | ≥ 80% lines | 91.99% | second coverage run above | build-and-test | Met |
| T-UNIT | unit-test-instructions.md | story tests pass | 34/34 | unit run above | build-and-test | Met |
| T-BUILD | build-instructions.md | bundle builds | exit 0 | build above | build-and-test | Met |
| T-STYLE | team.md Code Style | ESLint 0 errors, Prettier clean | 0 errors; clean after fix | style above | build-and-test | Met |
| T-CI | plan Testing Contract | tests in CI before merge | — | the plan runs no CI Pipeline | — | N/A |

Renderer checks ran in jsdom, not a real browser. No target requires native browser behaviour.
