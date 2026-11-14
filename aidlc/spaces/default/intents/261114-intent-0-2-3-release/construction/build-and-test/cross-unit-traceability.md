# Cross-Unit Traceability: v0.2.3

Zero-Unit work; one Code Generation iteration.

**Verdict: FAIL.** Six requirements have no build target yet. Two of them (FR2.1, FR2.2) are owned by this stage, and four are owned by the release stages after it.

| ID | Covered | Owning stage | Target / reason |
|----|---------|--------------|-----------------|
| FR1.1 | N/A | code-generation | US-0405 already built (commit 37a28fb); its tests stay green |
| FR1.2 | Yes | code-generation | `src/main/aidlcWrite.js` |
| FR1.3 | Yes | code-generation | `src/main/modelChoice.js` |
| FR1.4 | Yes | code-generation | `src/main/updater.js` |
| FR1.5 | Yes | code-generation | `src/renderer/TerminalContext.jsx` |
| FR2.1 | Measured here | build-and-test | Met: 32–34 ms filter change with 20 000 events, in the real Electron renderer (test-results.md) |
| FR2.2 | No | build-and-test | Needs an installed release on macOS and Linux |
| FR3.1 | No | deployment-execution | Feature docs update |
| FR3.2 | No | deployment-execution | "Released in v0.2.3" markers |
| FR3.3 | Yes | code-generation | `package.json` (0.2.3) |
| FR3.4 | No | deployment-pipeline / deployment-execution | Release branch, PR, tag |
| FR3.5 | No | deployment-execution | `docs/releases/0.2.3.md` |
| NFR1 | Yes | code-generation | `tests/main/aidlcWrite.test.js`; no regression against the baseline |
| NFR2 | Yes | code-generation | `tests/main/updater.test.js` and the other new tests |
| NFR3 | Yes | code-generation | `tests/main/updater.test.js` |
| NFR4 | Yes | code-generation | `src/shared/configTables.js`; no `shell: true` or string-built command in the new modules |
| NFR5 | Yes (unit) | code-generation | `src/main/updater.js` |
