# Cross-Unit Traceability: US-0215

Verdict: **pass** (from `aidlc engine sensor-traceability --stage build-and-test`). Zero-Unit work; every ID is built in Code Generation.

| ID | Target |
|---|---|
| FR1.1, FR2.2, FR2.3, FR2.4, FR4.3, FR5 | `src/main/tokenHistory.js` |
| FR2.1 | `src/main/contextSize.js` |
| FR2.5, FR3, FR4.2, NFR1 | `src/renderer/TokenDetail.jsx` |
| FR4.1, FR4.4, FR4.5, FR4.6 | `src/renderer/tokenChart.js` |
| FR6 | `src/main/ipc.js` |
| NFR2 | `src/shared/locales/sv.json` |
| NFR3 | `tests/main/tokenHistory.test.js` |

Uncovered: none. Note: FR5 is traced and built, but its behaviour falls short for a rebuilt total higher than the ledger's (see `test-results.md`). View checks ran in jsdom, not a real browser or the built app.
