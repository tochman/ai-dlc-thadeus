# Cross-Unit Traceability — US-1305 Quality signals next to cost

**Verdict: pass.** 17 of 17 IDs built, none uncovered (`aidlc engine sensor-traceability --stage build-and-test`). No Units: stage-level code generation.

| ID | Built in |
|---|---|
| FR1.1–FR1.6 | `src/main/parsers/quality.js` |
| FR1.7 | `src/main/projectService.js` |
| FR2.1 | `src/renderer/CostTab.jsx` |
| FR2.2, FR4.1, FR4.2 | `src/renderer/CostPanel.jsx` |
| FR3.1, FR3.2 | `src/renderer/FeaturesView.jsx` |
| NFR1 | `src/main/projectService.js` |
| NFR2 | `tests/main/quality.test.js` |
| NFR3 | `src/shared/locales/sv.json` (and `en.json`) |
| NFR4 | `tests/renderer/CostPanel.test.jsx`; full-suite coverage run |

All view checks ran in jsdom, not a real browser; no requirement here needs native browser behaviour.
