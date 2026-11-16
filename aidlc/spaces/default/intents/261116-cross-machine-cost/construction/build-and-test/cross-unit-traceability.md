# Cross-Unit Traceability: US-0209

**Verdict: PASS.** All 20 requirement IDs are covered, and none is uncovered. The source is `aidlc engine sensor-traceability --stage build-and-test`.

This is zero-Unit express work: every ID is owned by Code Generation at the stage level.

| ID | Covered | Target |
|---|---|---|
| FR1.1 | Yes | `src/main/parsers/auditCost.js` |
| FR1.2 | Yes | `src/main/parsers/auditCost.js` |
| FR1.3 | Yes | `tests/main/auditCost.test.js` |
| FR1.4 | Yes | `src/main/projectService.js` |
| FR2.1 | Yes | `src/main/usageSnapshot.js` |
| FR2.2 | Yes | `src/main/parsers/auditCost.js` |
| FR2.3 | Yes | `tests/main/crossMachineCost.test.js` |
| FR3.1 | Yes | `src/main/usageSnapshot.js` |
| FR3.2 | Yes | `tests/main/usageSnapshot.test.js` |
| FR3.3 | Yes | `src/main/usageSnapshot.js` |
| FR3.4 | Yes | `src/main/parsers/auditCost.js` |
| FR3.5 | Yes | `src/main/usageSnapshot.js` |
| FR4.1 | Yes | `src/renderer/CostTab.jsx` (tested in jsdom) |
| FR4.2 | Yes | `src/renderer/CostTab.jsx` (tested in jsdom) |
| FR4.3 | Yes | `src/shared/locales/sv.json` |
| FR5.1 | Yes | `src/main/watcher.js` |
| NFR1 | Yes | `tests/main/auditCost.test.js` |
| NFR2 | Yes | `tests/main/usageSnapshot.test.js` |
| NFR3 | Yes | `tests/main/usageSnapshot.test.js` |
| NFR4 | Yes | `tests/main/crossMachineCost.test.js` |

The renderer checks for FR4.1 and FR4.2 ran in jsdom, not in the built app. The hand check before the release covers them.
