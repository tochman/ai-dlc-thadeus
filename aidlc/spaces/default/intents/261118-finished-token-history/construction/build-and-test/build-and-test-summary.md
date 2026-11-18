# Build and Test Summary: US-0215

- **Build:** bundles fine. **Tests:** 1913/1913 pass on the full suite. **Coverage:** 92.27% lines (floor 80%). **Lint/format:** ESLint 0 errors; Prettier clean after an in-stage whitespace fix.
- **Test types:** unit and integration tests in vitest (Node and jsdom). No real-browser or built-app run; the `.dmg` check by hand belongs to the release.
- **Coverage expectations:** 80% line coverage for the whole project (team rule, NFR3). No Units.

## Target Verification Matrix

| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |
|---|---|---|---|---|---|---|
| TC-suite | Testing Contract / team.md | Full suite passes | 1913/1913 | `npm run coverage`, exit 0 | build-and-test | Met |
| TC-coverage | Testing Contract / team.md; NFR3 | ≥ 80% lines | 92.27% | same run, v8 report | build-and-test | Met |
| TC-tdd | Testing Contract; NFR3 | Red before Green | Red output for Steps 2, 4, 6, 9 and 11 | `code-summary.md` | code-generation | Met |
| TC-ci | Testing Contract | Tests in CI before merge | – | the plan runs no CI Pipeline | – | N/A |
| TEAM-lint | team.md Code Style | ESLint and Prettier clean | 0 errors; clean | `npm run lint`, `npm run format:check` | build-and-test | Met |
| FR5 | requirements.md | the gap line says why the totals differ | no reason for a rebuilt total higher than the ledger's (`261113-cost-and-models`: 118.6 M vs 75.5 M) | `test-results.md` | code-generation | Not Met |

## Readiness

- Build-ready and test-ready.
- FR5 is Not Met for a rebuilt total higher than the ledger's. The person accepted this gap and approved the stage on 2026-11-18.

## Known limitations

- Rebuilt totals are usually 40–90% of the ledger's, because subagent calls are not in the main transcripts. The gap line says so.
- View checks ran in jsdom, not in the built app.
