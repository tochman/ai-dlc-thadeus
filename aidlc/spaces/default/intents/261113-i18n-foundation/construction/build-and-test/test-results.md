# Test Results: US-0701 i18n foundation and English

Run on 2026-11-13 in the main workspace (zero-Unit work).

## Build

| Command | Exit | Result |
|---------|------|--------|
| `npx electron-vite build` | 0 | main, preload and renderer built in 343 ms; renderer bundle `index-CZEGHJPr.js` is 2,032 kB |

## Tests

| Command | Exit | Files | Tests | Passed | Failed | Skipped |
|---------|------|-------|-------|--------|--------|---------|
| Scoped command from `construction/code-generation/unit-test-instructions.md` | 0 | 8 | 31 | 31 | 0 | 0 |
| Full suite `npx vitest run tests/` | 0 | 38 | 138 | 138 | 0 | 0 |

- **Baseline before this work:** 33 files, 116 tests, all passing. All 116 still pass.
- **New tests:** 20 for i18n and 2 for the custom plan name.
- **Where the tests run:**
  - Main-process tests run in Node.
  - Renderer tests run in jsdom, a DOM emulator. They are integration evidence, not browser evidence.
  - No test ran in a real browser engine.

## Coverage

- No coverage floor applies to this plan (bugfix scope, Minimal strategy), and the project has no coverage configuration. No coverage report was produced.

## Failures

None.

## Target Verification Matrix

| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |
|-----------|--------|----------|--------|----------|--------------|---------|
| TC-strategy-volume | code-generation-plan.md `## Testing Contract` → obligations.strategy_volume | One verifiable test per requirement; a happy-path test per component | Each testable FR/NFR has a test (see cross-unit-traceability.md); each new module (shared/i18n, main/i18n, settings, menu, notify, format, AppSettingsDialog, key checks) has a passing happy-path test | Scoped command: 31/31 passed | build-and-test | Met |
| TC-scope-regression | Testing Contract → obligations.scope_floor[0] | A targeted regression check | `tests/main/i18nKeys.test.js` fails when Swedish interface text is left in `src/renderer/*.jsx` or `src/main/menu.js`, and proves on a planted example that it can fail. `tests/main/parsers.test.js` and `tests/renderer/IntentList.test.jsx` cover the custom plan name | Full suite: 138/138 passed | build-and-test | Met |
| TC-suite-green | Testing Contract → obligations.scope_floor[1] | The existing suite stays green | 116/116 existing tests pass | Full suite exit 0 | build-and-test | Met |
| TC-ci | Testing Contract / org Testing Posture | CI execution before merge (mvp/feature scopes only) | Not applicable: the plan runs no CI Pipeline | aidlc-state.md lists ci-pipeline under Stages to Skip | — | N/A |
| NFR-artifacts | nfr-requirements/, nfr-design/ | — | No such artifacts in this plan | Directory absent | — | N/A |
