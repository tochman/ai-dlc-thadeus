# Build and Test Summary: US-0414

The build succeeds and 1459 of 1459 tests pass, at 90.96% line coverage. ESLint reports no errors and Prettier is clean. All 16 requirement IDs are covered.

Test types: unit tests only, under the Minimal strategy. Everything ran in jsdom; there is no real-browser run. No integration, performance or security instruction files were written (Minimal).

## Target Verification Matrix

| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |
|---|---|---|---|---|---|---|
| TC-suite | Testing Contract scope_floor; team.md | Full suite green | 1459/1459 | `npx vitest run tests/ --coverage`, exit 0 | build-and-test | Met |
| TC-coverage | team.md; vitest.config.mjs `lines: 80` | ≥ 80% lines | 90.96% | same run | build-and-test | Met |
| TC-minimal | Testing Contract strategy_volume | One test per requirement, happy path per component | 4 new + 5 updated test files cover FR1–FR4, NFR1–NFR3 | `cross-unit-traceability.md` | build-and-test | Met |
| TC-ci | Testing Contract CI line | Run in CI before merge | — | the plan runs no CI Pipeline | — | N/A |
| CS-eslint | team.md Code Style; project.md Mandated | no errors | 0 errors | `npx eslint .` | build-and-test | Met |
| CS-prettier | team.md Code Style; project.md Mandated | clean on the CI checkout | clean | `npx prettier --check . '!.thadeus/tokens/**'` | build-and-test | Met |
| NFR1 | requirements.md | Focus, hover and Esc; flip and clamp; no `title=` | tests pass (jsdom) | `Tooltip`, `tooltipPlacement`, `noNativeTitle` tests | build-and-test | Met |
| NFR2 | requirements.md | No anchor loses its name; focus order follows the document | tests pass (jsdom) | `Tooltip.test.jsx` | build-and-test | Met |
| NFR3 | requirements.md | TDD, suite green, floor kept | Red runs recorded; green; 91% | code-generation return | build-and-test | Met |
| FR1.4-browser | requirements.md FR1.4 | Stays inside the real window, flips at the edge | placement tested as a pure function in jsdom only | — | manual `.dmg` check | Unverified (no real browser engine here) |

## Readiness

- **Build:** ready.
- **Tests:** ready.
- **Merge:** ready once the feature docs are updated and CI is green.

## Known limitations

- **Real-browser behaviour:** placement in the real window, the hover feel and stacking against dialogs are unchecked until the `.dmg` hand check.
- **StatusBadge:** inside a row button it is hover-only, and its text is not part of the button's focus text.
- **Disabled intent rows:** rows whose folder is missing on disk stay natively disabled, so their tooltip cannot open.
