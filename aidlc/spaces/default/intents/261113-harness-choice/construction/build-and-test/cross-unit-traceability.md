# Cross-Unit Traceability: US-0801 Choose the harness per project

**Verdict: PASS.** 23 of 23 requirement IDs are covered: 22 are built and FR7.1 is marked N/A because those views did not change. No ID is uncovered, and all are owned by the single Code Generation run.

| ID | Status | Target |
|----|--------|--------|
| FR1.1 | Built | src/main/harness.js |
| FR1.2 | Built | tests/main/harness.test.js |
| FR1.3 | Built | tests/main/harness.test.js |
| FR2.1 | Built | src/renderer/ProjectSettingsDialog.jsx |
| FR2.2 | Built | src/shared/harnesses.js |
| FR2.3 | Built | src/main/settings.js |
| FR2.4 | Built | tests/main/settings.test.js |
| FR3.1 | Built | src/renderer/TerminalContext.jsx |
| FR3.2 | Built | src/main/pty.js |
| FR3.3 | Built | tests/main/pty.test.js |
| FR3.4 | Built | src/renderer/TerminalPanel.jsx |
| FR4.1 | Built | src/renderer/ResumeButton.jsx |
| FR4.2 | Built | tests/renderer/ResumeButton.test.jsx |
| FR4.3 | Built | src/shared/harnesses.js (opencode `quietMs`, from the real-CLI probe) |
| FR5.1 | Built | tests/renderer/TerminalPanel.test.jsx |
| FR6.1 | Built | tests/renderer/ProjectSettingsDialog.test.jsx |
| FR7.1 | N/A | No change: views read the shared aidlc/ records as before |
| FR7.2 | Built | src/renderer/CostPanel.jsx (no test of its own) |
| FR8.1 | Built | tests/main/i18nKeys.test.js |
| NFR1 | Built | package.json (unchanged dependencies) |
| NFR2 | Built | full suite green |
| NFR3 | Built | src/main/ipc.js (background, cached detection) |
| NFR4 | Built | src/main/pty.js |
