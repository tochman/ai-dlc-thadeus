# Cross-Unit Traceability: US-0211

**Verdict: PASS.** No Units (zero-Unit work); all 18 acceptance criteria and FR1.1–FR3.3, NFR1, NFR2 are built in Code Generation. The tracer listed NFR3 as uncovered because it has no acceptance criterion; it is verified here by the coverage run (see below).

| ID | Covered | Owning stage | Target |
|---|---|---|---|
| FR1.1–FR1.3, FR1.6 | yes, via AC1.1.1–AC1.1.5 | code-generation | `tests/main/modelRates.test.js`, `src/main/data/model-rates.json` |
| FR1.4, FR1.5 | yes, via AC1.2.1–AC1.2.3 | code-generation | `tests/renderer/CostTab.test.jsx` |
| FR2.1, FR2.3 | yes, via AC1.3.1–AC1.3.4 | code-generation | `tests/main/reprice.test.js`, `tests/main/crossMachineCost.test.js` |
| FR2.2 | yes, via AC1.2.x, AC1.3.x | code-generation | `tests/main/reprice.test.js`, `tests/renderer/CostTab.test.jsx` |
| FR3.1–FR3.3 | yes, via AC1.4.1–AC1.4.4, AC1.5.x | code-generation | `tests/renderer/TokenDetail.test.jsx`, `format.test.jsx`, `IntentList.test.jsx`, `tests/main/i18nKeys.test.js` |
| NFR1 | yes, via AC1.3.4 | code-generation | `tests/main/crossMachineCost.test.js` |
| NFR2 | yes, via AC1.5.1, AC1.5.2 | code-generation | `tests/main/modelRates.test.js`, `tests/main/reprice.test.js` |
| NFR3 | yes, by measurement | build-and-test | `npx vitest run tests/ --coverage`: 92.35% lines overall, new files 100% (`test-results.md`) |

Uncovered elements: none after NFR3 is verified here.
