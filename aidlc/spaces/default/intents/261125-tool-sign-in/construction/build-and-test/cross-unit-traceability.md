# Cross-unit traceability

**Verdict: pass.** The tool finds no uncovered requirement or criterion (zero-Unit work, owning stage code-generation).

| Criteria | Requirements | Target file |
|---|---|---|
| AC1.1.1 | FR1.3–FR1.5, FR2.1, FR2.2 | `src/renderer/SignIn.jsx` |
| AC1.1.2–AC1.1.4, AC1.2.1–AC1.2.3, AC1.2.7 | FR1.3–FR1.5, FR1.7, FR2.2, NFR1 | `src/main/parsers/signIn.js` |
| AC1.1.5, AC1.2.4, AC1.2.5, AC1.3.4 | FR1.1, FR1.2, FR1.6, FR2.1, FR2.3, NFR3 | `src/main/signIn.js` |
| AC1.1.6, AC2.1.3 | FR2.3, FR3.2 | `src/shared/signIn.js` |
| AC1.1.7, AC1.3.1 | FR2.4, FR2.5 | `src/renderer/SettingsView.jsx` |
| AC1.1.8 | FR2.6 | `src/renderer/ToolRows.jsx` |
| AC1.1.9 | FR5.3 | `tests/e2e/signIn.spec.js` |
| AC1.2.6 | FR1.1 | `src/main/exec.js` |
| AC1.3.2, AC1.3.3, AC2.1.1, AC2.1.2, AC2.2.1, AC2.2.2, AC3.1.2–AC3.1.5 | FR2.3, FR2.5, FR3.1–FR3.4, FR4.1–FR4.3, FR5.2 | `src/renderer/SignIn.jsx` |
| AC3.1.1, AC3.1.6 | FR4.1, NFR3 | `src/renderer/TerminalPanel.jsx` |
| AC3.1.7 | FR4.4 | `src/main/platforms/index.js` |
| All | FR5.1, FR5.2, NFR2 | `sv.json`, `en.json`, and the tests of each criterion |

**Where they ran:** main tests in Node, with real shells and stand-in tools. Component tests in jsdom. In the built app, in Electron's Chromium: the Settings states and their fit at 1280, the command with its copy button, the agent tab's line, its link to Settings › Tools and the command typed unsent. The rest of the page's behaviour (the announcement, focus kept, the order of answers, dismissing, checking again) ran in jsdom.
