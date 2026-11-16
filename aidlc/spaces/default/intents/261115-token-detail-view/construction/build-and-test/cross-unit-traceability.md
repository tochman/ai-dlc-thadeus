# Cross-Unit Traceability: US-0208

**Verdict: PASS.** `aidlc engine sensor-traceability --stage build-and-test` reports every ID covered, none uncovered. Zero-Unit work.

| ID | Built in | Checked by (Node / jsdom) |
|---|---|---|
| FR1 | `src/renderer/IntentDetail.jsx`, `TokenView.jsx` | open / Back / Esc view tests (jsdom) |
| FR2.1 | `src/main/tokenReadings.js` | round-trip and refused dir names (Node) |
| FR2.2 | `src/main/tokenReadings.js` | 30 s rule and thinning past 2000 (Node) |
| FR2.3 | `src/main/parsers/ledger.js` | `readingOf` with 5 m / 1 h apart (Node) |
| FR3.1 | `src/renderer/tokenChart.js` | `elapsedLabel`, `stackSeries` (Node) |
| FR3.2 | `src/renderer/tokenChart.js` | `rateSeries` (Node) |
| FR3.3 | `src/renderer/tokenChart.js` | `splitRows` top 12 + other (Node) |
| FR4 | `src/renderer/TokenDetail.jsx` | Diagram/Table, Tokens/$, focus tooltip (jsdom) |
| FR5 | `src/renderer/TokenDetail.jsx` | live and recorded modes (jsdom) |
| FR6 | `src/renderer/TokenDetail.jsx` | empty-readings message (jsdom) |
| FR7 | `src/renderer/theme.css` | motion rules only under full motion (Node, `theme.test.js`) |
| FR8 | `src/shared/locales/sv.json` | `i18nKeys.test.js` (Node) |
| NFR1 | `package.json` | only `@visx/*` added |
| NFR2 | `src/main/ipc.js` | readings are fire-and-forget; corrupt file reads `[]` (Node) |
| NFR3 | `src/renderer/TokenDetail.jsx` | headings, focus on open, keyboard tooltip (jsdom) |
| NFR4 | `tests/main/tokenReadings.test.js` | 2000 cap (Node) |

Uncovered: none.
