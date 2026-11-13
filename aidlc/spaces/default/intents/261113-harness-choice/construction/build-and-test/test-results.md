# Test Results: US-0801 Choose the harness per project

Run on 2026-11-13 in the main workspace (zero-Unit work).

| Command | Exit | Result |
|---------|------|--------|
| `npx electron-vite build` | 0 | Built in 325 ms; renderer bundle 2,044 kB |
| Scoped command from `unit-test-instructions.md` | 0 | 7 files, 32 tests, all passed |
| Full suite `npx vitest run tests/` | 0 | 39 files, 150 tests, all passed |

- **Baseline before this work:** 38 files, 138 tests, all passing. All still pass after the updates for the `agent` rename and the new texts.
- **Where the tests run:** main-process tests run in Node and renderer tests in jsdom (a DOM emulator). No test ran in the real Electron app.
- **The opencode readiness check** (FR4.3) was a one-off probe of the real opencode v2.1.4 during Code Generation, not a repeatable test (see code-summary.md).
- **Coverage:** no floor applies (express, Minimal), and no report was produced.
- **Failures:** none.

## Target Verification Matrix

| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |
|-----------|--------|----------|--------|----------|--------------|---------|
| TC-strategy-volume | Testing Contract → strategy_volume | One test per requirement; a happy-path test per component | Every testable FR/NFR has a test except FR7.2 (the note exists, untested) and FR4.3 (one-off probe). harness, settings, pty, menu, TerminalPanel, ProjectSettingsDialog and ResumeButton each have a happy-path test | Scoped command 32/32 | build-and-test | Met |
| TC-suite-green | Testing Contract → scope_floor[0] | The existing suite stays green | 138 existing tests still pass, including those updated for the rename | Full suite 150/150 | build-and-test | Met |
| TC-ci | org Testing Posture | CI before merge (mvp/feature scopes only) | Not applicable: the plan runs no CI Pipeline | aidlc-state.md | — | N/A |
| NFR-artifacts | nfr-requirements/, nfr-design/ | — | None in this plan | — | — | N/A |
