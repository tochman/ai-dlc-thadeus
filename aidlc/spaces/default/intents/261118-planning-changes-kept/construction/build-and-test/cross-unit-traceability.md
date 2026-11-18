# Cross-Unit Traceability: US-0608

Zero-Unit work; every ID is owned by the stage-level Code Generation. Source: `aidlc engine sensor-traceability --stage build-and-test`.

**Verdict: pass with two findings.** The sensor reports `pass: false` because NFR2 and NFR3 have no acceptance criterion of their own; both were checked directly in this stage and are met (below).

| ID | Covered through | Target |
|---|---|---|
| FR1.1–FR1.3 | AC1.1.1–AC1.1.3 | `tests/main/planningSync.test.js`, `tests/renderer/FeaturesView.test.jsx` |
| FR2.1–FR2.3 | AC1.2.1–AC1.2.3 | `tests/main/ipc.test.js`, `tests/main/planningSync.test.js` |
| FR3.1–FR3.3 | AC1.3.1–AC1.3.3 | `tests/main/planningSync.test.js`, `tests/main/planningSplit.test.js` |
| FR4.1–FR4.2 | AC1.4.1–AC1.4.3 | `tests/main/planningSync.test.js`, `tests/renderer/FeaturesView.test.jsx` |
| FR5.1–FR5.3 | AC1.5.1–AC1.5.3 | `tests/main/planningRecord.test.js`, `planningSync.test.js`, `FeaturesView.test.jsx` |
| FR6.1–FR6.2 | AC1.6.1–AC1.6.2 | `tests/main/planningSync.test.js` |
| FR7.1–FR7.2 | AC1.7.1–AC1.7.3 | `tests/renderer/FeaturesView.test.jsx`, `src/shared/locales/en.json` |
| FR8 | AC2.1.1 | `tests/main/planningSync.test.js` |
| FR9.1–FR9.3 | AC2.2.1–AC2.2.3 | `tests/e2e/planning.spec.js`, `.github/workflows/release.yml` |
| NFR1 | AC1.5.x, AC1.7.x | `sv.json`/`en.json`, `tests/main/i18nKeys.test.js` |
| NFR2 | uncovered by an AC | Checked here: every git call in `planningSync.js` goes through `runFixed` (`src/main/exec.js`) or `git.js` helpers with fixed arguments; no `exec`, `spawn` or `shell: true` in the changed main files. |
| NFR3 | uncovered by an AC | Checked here: TDD Red evidence in `unit-test-instructions.md` (Step 18 has none, see code summary); lines 92.38% ≥ 80%; ESLint 0 errors and Prettier clean locally. Running them in CI is wired in `release.yml` but not yet run. |
