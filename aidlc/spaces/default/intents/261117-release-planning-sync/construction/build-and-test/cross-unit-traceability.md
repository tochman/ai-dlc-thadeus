# Cross-Unit Traceability

**Verdict: PASS.** All 20 IDs are covered and none is uncovered. This is zero-Unit work, so every ID is owned by `code-generation`.

| ID | Target file |
|----|-------------|
| FR1.1 | src/main/planningRecord.js |
| FR1.2, FR1.3, FR2.1, FR2.2, FR2.3, FR2.5, FR3.2, FR3.3, FR3.4, FR3.5 | src/main/planningSync.js |
| FR2.4 | src/main/parsers/releases.js |
| FR3.1 | src/main/settings.js |
| FR4.1, FR4.2 | src/renderer/FeaturesView.jsx |
| FR4.3 | src/renderer/ProjectSettingsView.jsx |
| NFR1, NFR2 | tests/main/planningSync.test.js |
| NFR3 | src/main/git.js |
| NFR4 | tests/main/planningRecord.test.js |

FR4.3's LCARS look was checked in jsdom only, not in the running app (see T8 in the summary).
