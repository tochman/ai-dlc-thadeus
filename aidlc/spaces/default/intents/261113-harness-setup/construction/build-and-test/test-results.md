# Test Results: US-0802 Set up AI-DLC for another harness

Run on 2026-11-14 in the main workspace (zero-Unit work).

| Command | Exit | Result |
|---------|------|--------|
| `npx electron-vite build` | 0 | built in 332 ms |
| Scoped command from `unit-test-instructions.md` | 0 | 4 files, 27 tests, all passed |
| Full suite `npx vitest run tests/` | 0 | 39 files, 161 tests, all passed |

- **Baseline before this work:** 150 tests, all still passing.
- **Where the tests ran:** main-process tests run in Node and renderer tests in jsdom.
- **Not run for real:** no test ran the real `aidlc` CLI with `--yes`. The harness ids were checked once with `--dry-run` in an empty temporary folder (see code-summary.md).
- **Coverage:** no floor applies. **Failures:** none.

## Target Verification Matrix

| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |
|-----------|--------|----------|--------|----------|--------------|---------|
| TC-strategy-volume | Testing Contract → strategy_volume | One test per requirement; a happy-path test per component | Every testable FR has a test except FR4.1 (re-detection after setup, a thin IPC wiring). setup, harness table, SetupAidlc and ProjectSettingsDialog each have a happy-path test | Scoped command 27/27 | build-and-test | Met |
| TC-suite-green | Testing Contract → scope_floor[0] | The existing suite stays green | 150 earlier tests pass (setup tests updated for the removed typed command) | Full suite 161/161 | build-and-test | Met |
| TC-ci | org Testing Posture | CI before merge | Not applicable: the plan runs no CI Pipeline | aidlc-state.md | — | N/A |
| NFR-artifacts | nfr-requirements/, nfr-design/ | — | None in this plan | — | — | N/A |
