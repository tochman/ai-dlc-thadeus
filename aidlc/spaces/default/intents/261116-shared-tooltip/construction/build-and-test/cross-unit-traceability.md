# Cross-Unit Traceability: US-0414

**Verdict: PASS.** All 16 IDs are covered, and none is uncovered. The source is `aidlc engine sensor-traceability --stage build-and-test`.

This is zero-Unit express work: every ID is owned by Code Generation at the stage level. All renderer checks ran in jsdom.

| ID | Target |
|---|---|
| FR1.1 | `src/renderer/Tooltip.jsx` |
| FR1.2 | `tests/renderer/Tooltip.test.jsx` |
| FR1.3 | `src/renderer/Tooltip.jsx` |
| FR1.4 | `src/renderer/tooltipPlacement.js` |
| FR1.5 | `src/renderer/theme.css` |
| FR2.1 | `tests/renderer/noNativeTitle.test.jsx` |
| FR2.2 | `src/renderer/CostTab.jsx` |
| FR2.3 | `src/renderer/IntentList.jsx` |
| FR2.4 | `src/renderer/ResumeButton.jsx` |
| FR2.5 | `src/renderer/TerminalPanel.jsx` |
| FR3.1 | `src/renderer/TokenDetail.jsx` |
| FR3.2 | `tests/renderer/TokenDetail.test.jsx` |
| FR4.1 | `src/shared/locales/sv.json` |
| NFR1 | `tests/renderer/tooltipPlacement.test.jsx` |
| NFR2 | `tests/renderer/Tooltip.test.jsx` |
| NFR3 | `tests/renderer/ResumeButton.test.jsx` |
