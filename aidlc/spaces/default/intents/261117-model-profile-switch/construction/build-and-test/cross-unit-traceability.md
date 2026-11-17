# Cross-Unit Traceability: US-0210 model profile switch

Zero-Unit express work. From `aidlc engine sensor-traceability --stage build-and-test`.

Verdict: FAIL from the sensor (1 uncovered: NFR5). Covered by evidence below.

| ID | Covered | Built in |
|---|---|---|
| FR1.1–FR1.5 | yes, via AC1.1.1–AC1.1.6 (FR1.4 also AC1.3.x) | `ModelProfilesSection.jsx`, `settings.js`, `modelProfiles.js` |
| FR2.1–FR2.5 | yes, via AC1.2.1–AC1.2.6 | `modelProfiles.js`, `ipc.js` |
| FR3.1–FR3.3 | yes, via AC1.3.1–AC1.3.6 | `modelProfiles.js`, `ProfileSwitchDialog.jsx` |
| FR4.1–FR4.3 | yes, via AC1.1.x / AC1.2.x / AC1.3.x | `ipc.js`, `modelProfiles.js` |
| FR5.1–FR5.2 | yes, via AC1.2.x | `ipc.js`, `ProfileSwitchDialog.jsx` |
| NFR1–NFR4 | yes, via AC1.1.x / AC1.2.x | locales, `modelChoice.js`, dialog |
| NFR5 | no story AC traces it | a process requirement (TDD, 80% coverage): Red runs in code-summary.md, 91.46% lines in test-results.md |

Renderer checks ran in jsdom, not in a real browser or the built Electron app.
