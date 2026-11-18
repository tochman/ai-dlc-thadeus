# Build and Test Summary: US-0029 release row move

**Build:** success. **Tests:** 1883/1883 passed. **Strategy:** Minimal, no extra instruction files.

## Target Verification Matrix

| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |
|---|---|---|---|---|---|---|
| TC-SUITE | Testing Contract / team.md | full suite green | 1883 passed | `npx vitest run tests/ --coverage`, exit 0 | build-and-test | Met |
| TC-COV-PROJECT | team.md, `vitest.config.mjs` | ≥ 80% lines | 92.3% | same run, exit 0 | build-and-test | Met |
| TC-TDD | Testing Contract (tdd) | tests red before, green after | 2 red per layer (missing export; old row kept), then 32 green | `code-summary.md` | build-and-test | Met |
| TC-STYLE | project.md (Prettier, ESLint) | no errors | clean, 0 lint errors | prettier/eslint, exit 0 | build-and-test | Met |
| TC-CI | Testing Contract, CI before merge | run in CI | — | the plan runs no CI Pipeline | — | N/A |

## Readiness

Build-ready and test-ready; ready for the pull request.

## Known limitations

- A refused write of the old plan file (it changed on disk) is not reported to the caller, as with `writePlanRow` before this fix.
- Removing a story from its release (not moving it) still leaves its plan-file row, as before; the build-order table is not touched.
- `docs/FEATURES.md` EPIC-00 row is changed here and in PR #74; merging the second PR needs that row resolved by hand.
