# Cross-unit traceability

**Verdict: PASS.** Every requirement (FR1.1–FR10.2, NFR1–NFR8) and every acceptance criterion (39) is covered. None is uncovered. Source: the trace run on 2026-11-25.

| Requirement | Acceptance criteria | Unit (story) | Built in |
|---|---|---|---|
| FR1.1–FR1.6 | AC1.1.1–AC1.1.6 | U1 (US-1401) | `projectService.js`, `frameworkViews.js`, `harnesses.js`, `App.jsx`; AC1.1.1 in `frameworkViews.test.js` |
| FR2.1–FR2.3 | AC1.2.1–AC1.2.3 | U2 (US-1408) | `projectFile.js`, `projectService.js` |
| FR3.1–FR3.3 | AC2.1.1–AC2.1.4 | U3 (US-1405) | `speckitSetup.js`, `SetupSpeckit.jsx`; AC2.1.4 in `speckitSetup.test.js` |
| FR4.1–FR4.3 | AC2.2.1–AC2.2.3 | U4 (US-1406) | `frameworkChoice.js`, `FrameworkChoice.jsx` |
| FR5.1–FR5.4 | AC3.1.1–AC3.1.4 | U5 (US-1403) | `speckitCommands.js`, `SpeckitCommandButton.jsx`, `SpeckitQuickCommands.jsx`, `SpeckitFeatureDetail.jsx` |
| FR6.1–FR6.5 | AC4.1.1–AC4.1.6 | U6 (US-1402) | `SpeckitFeatures.jsx`, `SpeckitFeatureDetail.jsx`, `speckitTasks.js`, `watcher.js` |
| FR7.1–FR7.3 | AC4.2.1–AC4.2.3 | U7 (US-1404) | `SpeckitRules.jsx`, `speckitRules.js` |
| FR8.1–FR8.3 | AC2.3.1–AC2.3.4 | U8 (US-1407) | `FrameworkSection.jsx`, `frameworkSwitch.js`, `ipc.js`, `en.json` |
| FR9.1–FR9.3 | AC5.1.1–AC5.1.3 | U9 (US-1409) | `speckitTokens.js`, `tokenReadings.js` |
| FR10.1–FR10.2 | AC5.2.1–AC5.2.3 | U10 (US-1410) | `SpeckitProgress.jsx`, `en.json` |

| NFR | Covered through |
|---|---|
| NFR1 | U2 and U9 NFR1.1 |
| NFR2 | the acceptance criteria of all ten stories |
| NFR3 | U2, U4, U5, U6, U7, U8, U9, U10 (NFR3.x) |
| NFR4 | U4 NFR4.1–NFR4.3, U5 NFR4.1–NFR4.4, U8 NFR4.5 |
| NFR5 | U5, U6, U7, U10 (NFR5.x) |
| NFR6 | U5 NFR6.1, U9 NFR6.1–NFR6.2 |
| NFR7 | U4, U5, U6, U7, U8, U10 (NFR7.x) |
| NFR8 | U2 and U9 NFR8.1 |

The renderer files were tested in jsdom. Only their look was checked in a real browser engine, the built app's Chromium (see the summary).
