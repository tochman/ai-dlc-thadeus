# Test Results — US-0055 A failed replay is kept after a real planning commit

Run 2026-11-27 on `fix/US-0055`.

| Command | Result | Exit |
|---|---|---|
| `npx electron-vite build` | built in 2.88 s | 0 |
| Scoped run from `unit-test-instructions.md` (4 files) | 109 passed | 0 |
| `npx vitest run tests/ --coverage` | 208 files, 3,193 passed, 1 skipped | 0 |
| `npm run lint` | clean | 0 |
| `npx prettier --check .` | clean | 0 |

Coverage (full suite): lines 94.13% (12,514 / 13,293), statements 92.32%, branches 85.9%, functions 90.08%.

## Target Verification Matrix

| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |
|---|---|---|---|---|---|---|
| T-COV | team.md Testing Posture | ≥ 80% line coverage, full suite | 94.13% | full run, exit 0 | build-and-test | Met |
| T-GREEN | Testing Contract scope floor | existing suite green | 0 failed | full run, exit 0 | build-and-test | Met |
| T-UNIT | unit-test-instructions.md | 5 new tests pass | 109 passed (5 new) | scoped run, exit 0 | build-and-test | Met |
| T-LINT | team.md Code Style | ESLint and Prettier pass | clean | lint, prettier | build-and-test | Met |
| T-BUILD | build-instructions.md | bundle builds | built | electron-vite build | build-and-test | Met |
