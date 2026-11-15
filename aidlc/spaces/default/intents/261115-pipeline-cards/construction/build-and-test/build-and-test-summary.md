# Build and Test Summary — US-0411 Pipeline cards

- **Build:** succeeded (`npm run build`, unsigned macOS `.dmg`).
- **Tests:** 1285 of 1285 passed in the full suite, including the 10 new tests for this work.
- **Test types:** unit tests only (Minimal strategy), with no extra instruction files. The renderer tests ran in jsdom.
- **Coverage expectation:** 80% lines on the full suite. It measured 90.02%. This is zero-Unit work, so no per-Unit target applies.

## Target Verification Matrix

| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |
|-----------|--------|----------|--------|----------|--------------|---------|
| T-COV | team.md Testing Posture; `vitest.config.mjs` | ≥ 80% lines, all measured source | 90.02% lines, all thresholds pass | `npm run coverage`, exit 0 (`test-results.md`) | build-and-test | Met |
| T-SUITE | Testing Contract scope floor; team rule | existing suite green | 1285 passed, 0 failed | `npm run coverage` | build-and-test | Met |
| T-TDD | Testing Contract (tdd) | Red before Green for each behaviour | Red outputs recorded at Steps 2, 5 and 8 (FR5 guards existing behaviour) | `code-summary.md` | build-and-test | Met |
| T-STYLE | team.md Code Style | ESLint clean of errors; Prettier clean | 0 lint errors; Prettier clean after the in-stage fix | `test-results.md` | build-and-test | Met |
| T-NFR2 | requirements.md NFR2 | text ≥ 4.5:1 on the blue and coral fills | black on steel #4fa3d9 ≈ 7.6:1, black on coral #ee6c56 ≈ 7.0:1 | `theme.css` (`--on-light` on `--steel` and `--coral`) | build-and-test | Met |
| T-CI | Testing Contract (CI before merge) | tests run in CI | — | the plan runs no CI Pipeline (`ci-pipeline` SKIP) | — | N/A |

## Readiness

- **Build and test:** ready.
- **Deployment:** ready for the story pull request.
- **Outstanding:**
  - Check the cards by eye in the running app (`npm run dev`) or in the `.dmg` before the release tag.
  - Update the story, epic and `FEATURES.md` markers for US-0411 before the pull request (team rule).
