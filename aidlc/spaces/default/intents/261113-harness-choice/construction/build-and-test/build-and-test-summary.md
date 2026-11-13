# Build and Test Summary: US-0801 Choose the harness per project

- **Build:** `npx electron-vite build` exits 0.
- **Tests:** Vitest, with main-process tests in Node and renderer tests in jsdom. The scoped command passes 32 of 32 and the full suite 150 of 150. No extra instruction files (Minimal strategy).
- **Coverage expectation:** no floor applies. Each testable requirement has a test.

## Target Verification Matrix

| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |
|-----------|--------|----------|--------|----------|--------------|---------|
| TC-strategy-volume | Testing Contract → strategy_volume | One test per requirement; a happy-path test per component | Met (FR7.2 and FR4.3 without a unit test of their own; see test-results.md) | Scoped command 32/32 | build-and-test | Met |
| TC-suite-green | Testing Contract → scope_floor[0] | Existing suite green | 138 existing tests pass | Full suite 150/150 | build-and-test | Met |
| TC-ci | org Testing Posture | CI before merge | Not applicable: the plan runs no CI Pipeline | aidlc-state.md | — | N/A |
| NFR-artifacts | nfr-requirements/, nfr-design/ | — | None in this plan | — | — | N/A |

## Readiness

The work is build-ready, test-ready and ready for the deployment steps.

## Known limitations

- **No run in the real app.** The agent tab, the switch and the opencode tab were checked in jsdom and through one probe of the real opencode, but not inside the running Electron app.
- **opencode waits 4 s,** just above the measured 3.6 s start-up redraw.
- **"Covers Claude Code" has no test.** The note is built.
