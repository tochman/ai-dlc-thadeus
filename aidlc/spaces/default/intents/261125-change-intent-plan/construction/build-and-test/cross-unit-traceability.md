# Cross-unit traceability

**Verdict: pass.** The tool finds no uncovered requirement (zero-Unit work, owning stage code-generation).

| Requirement | Target file |
|---|---|
| FR1.1–FR1.5, FR2.1–FR2.3, FR2.8, FR2.9, FR3.1, FR3.2, NFR3 | `src/renderer/PlanChange.jsx` |
| FR1.6, FR3.3, FR5.2 | `tests/renderer/PlanChange.test.jsx` |
| FR2.4, FR2.5, FR2.7, NFR1 | `src/shared/planChange.js` |
| FR2.6 | `src/shared/locales/en.json` |
| FR4.1 | `src/main/parsers/pipeline.js` |
| FR4.2 | `src/main/projectService.js` |
| FR5.1 | `src/shared/locales/sv.json` |
| FR5.3 | `tests/e2e/intentLayout.spec.js` |
| NFR2 | `tests/main/planChange.test.js` |

**Where they ran:** main tests in Node, component tests in jsdom. In the built app, in Electron's Chromium: FR5.3, Escape and focus back on the control, and FR3.1 with focus in the agent tab for a ready-made plan on the active intent. The rest (the reasons on keyboard focus, the tailored line, the switch for another intent) ran in jsdom.
