# Code Summary: US-0418 Pulse view

## What was built

- **Store and paths** (`src/main/pulse.js`, FR2, FR3, FR5–FR7, FR9): `createPulseStore()` keeps 15 minutes of touches per agent plus `Unattributed`, with a 10-minute fade and grouping by folder past 200 files. `pulsePaths()` keeps only project-relative paths; anything outside becomes one `outside` mark. `wirePulse` feeds the store from hook paths and the file observer, and sends a batched `pulse:changed` every 2 s.
- **Hook paths** (`agentAdapters.js`, `agentEvents.js`, FR3): the Claude and opencode toolStart events carry a bounded `paths` field. A new `onTouch` hook passes those paths to the store.
- **File observer** (`watcher.js`, FR4, NFR6): `watchProjectFiles()` skips `.git`, `node_modules` and git-ignored files. It drops a change while a write tool is open on that file, and runs only while work is active.
- **API** (`ipc.js`, `preload/index.js`): `pulse:list`, `pulse:changed`, `window.api.pulse`.
- **View** (`PulseView.jsx`, `pulse/scene.js`, FR1, FR7–FR9, NFR1–NFR5): the view sits in the LCARS `DiagonalFrame`, with its readouts and the 15-minute strip in the arm. The canvas is drawn by vendored pretty-events code (`src/renderer/pulse/vendor/`, MIT, commit 3f003aad, types stripped). Our own code is only the adapter and an LCARS theme. Reduced motion draws one still frame. A click opens the file. ArmBlock `arm-pulse` is in `App.jsx`; `ProjectView.jsx` shows the view for every framework.
- **Text**: `pulse.*` keys are in both `sv.json` and `en.json`.

## Deviations from the plan

- `wirePulse` lives in `pulse.js`, not `ipc.js`. `agentEvents.js` gained `onTouch`.
- Folders are the scene's consumer sectors. The vendored ring keeps its decorative hex and ms text. Rotation is fixed at 0.
- The tooltip is the canvas callout plus an sr-only `pulse-tooltip`.
- The `pulse` view is gated in `App.jsx`/`ProjectView.jsx`, not in the `frameworkViews` table, which its test pins.
- The observer runs `git check-ignore` once per change (`ponytail:` note).
- The scene test is `tests/renderer/pulseScene.test.jsx`.
- Vendoring replaces NFR5's no-copy clause, at the person's directive.

## Checks

- 13 targeted test files: 280 of 280 pass. ESLint is clean on every touched file. Prettier is clean.
- One existing Spec Kit test failed once in a combined run, then passed on rerun.
- Coverage is not measured yet; Build and Test runs the full suite with `--coverage`.
