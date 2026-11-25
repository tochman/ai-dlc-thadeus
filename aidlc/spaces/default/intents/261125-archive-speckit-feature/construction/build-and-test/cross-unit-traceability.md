# Cross-unit traceability

**Verdict: pass.** The tool finds no uncovered requirement (zero-Unit work, owning stage code-generation).

| Requirement | Target file |
|---|---|
| FR1.1–FR1.3, FR6.1, FR6.2 | `src/renderer/SpeckitArchive.jsx` |
| FR1.4, FR2.2, FR2.3 | `src/main/ipc.js` |
| FR2.1, FR5.1 | `src/renderer/SpeckitFeatureDetail.jsx` |
| FR3.1–FR3.5 | `src/renderer/SpeckitFeatures.jsx` |
| FR3.6, FR4.3 | `src/main/speckitFeatures.js` |
| FR3.7 | `src/main/frameworkSwitch.js` |
| FR4.1, FR4.2, FR4.4, NFR1, NFR2 | `src/main/speckitArchive.js` |
| FR4.5 | `tests/main/speckitArchive.test.js` (the sync takes the mark's path) |
| FR5.2 | `src/main/speckitTokens.js` (unchanged) |
| NFR3 | `tests/main/speckitFeatures.test.js` |

**Where they ran:** main tests in Node, component tests in jsdom. The round trip of FR1.1, FR1.2 (Cancel with Escape), FR2.2, FR3.1–FR3.3, FR3.6, FR4.1 and FR6.2 also ran in the built app, in Electron's Chromium. FR1.3 and FR3.4 ran in jsdom only.
