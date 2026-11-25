# Integration test instructions

vitest 5.1.0, already set up in `vitest.config.mjs` (projects `main`, `scripts`, `renderer`). The renderer tests run in jsdom. No extra setup; test data is made in temporary folders and removed.

## Boundaries between the Units

| Boundary | Tests | Units |
|---|---|---|
| Detection and the saved framework choice | `tests/main/projectService.test.js`, `projectFile.test.js` | U1, U2 |
| IPC: features, rules, agent progress, choose, switch, watchers and pushes | `tests/main/ipc.test.js` | U1, U3–U10 |
| File changes, bursts and removed folders to `speckit:changed` | `tests/main/watcher.test.js` (`--project scripts`) | U6, U7 |
| Hook event to token log, both harnesses | `tests/main/agentAdapters.test.js`, `speckitTokens.test.js` | U9 |
| Choose or switch, then setup, then views | `tests/renderer/FrameworkChoice.test.jsx`, `FrameworkSection.test.jsx`, `ProjectView.test.jsx` | U1, U3, U4, U8 |
| Commands typed into the agent tab | `tests/renderer/SpeckitCommandButton.test.jsx`, `SpeckitQuickCommands.test.jsx` | U5, U6, U7 |

## How to run

- Everything: `npx vitest run tests/ --coverage` (about 4 minutes). Floor: 80% lines, plus the single-file floors in `vitest.config.mjs`.
- Speed targets: `npx vitest run --project scripts tests/main/frameworkChoiceTimed.test.js tests/main/frameworkSwitchTimed.test.js tests/main/agentProgressSpeckitTimed.test.js`.
- Built app in Electron's Chromium: `npx electron-vite build`, then `npx playwright test`. It covers the AI-DLC intent and planning views. No Spec Kit view has an end-to-end test.

## Left to a person (before the v0.3.0 tag)

In the built app: create a Spec Kit project from the app, look at every Spec Kit view, switch a project both ways, and run one real Claude Code turn and one real opencode turn and read the token log. opencode's event shape is still provisional (K12).
