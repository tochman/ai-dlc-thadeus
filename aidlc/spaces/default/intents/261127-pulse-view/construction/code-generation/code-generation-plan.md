# Code Generation Plan: US-0418 Pulse view

## Summary

- **Builds**: the Pulse view, a live canvas map of which agent reads, writes or deletes which project file, with LCARS readouts and a 15-minute history.
- **Touches**: `src/main/agentAdapters.js`, new `src/main/pulse.js`, `src/main/watcher.js`, `src/main/ipc.js`, `src/preload/index.js`, new `src/renderer/PulseView.jsx`, `src/renderer/App.jsx`, `src/renderer/ProjectView.jsx`, `src/renderer/theme.css`, `sv.json`/`en.json`, feature docs.
- **Tests**: new `tests/main/pulse.test.js`, `tests/main/pulseObserver.test.js`, `tests/main/agentAdaptersPulse.test.js`, `tests/renderer/PulseView.test.jsx`; existing suite stays green.

## Testing Contract

```json
{
  "version": 1,
  "methodology": "tdd",
  "source": "team",
  "ordering": "For each behaviour, write a failing test first, then the code that makes it pass, then refactor with the suite green.",
  "scope": "ultra-express",
  "test_strategy": "standard",
  "project_type": "brownfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nBuild and Test verifies defined coverage floors and affirmed quality targets;\nthey may not be weakened to make a step pass.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    },
    {
      "layer": "team",
      "text": "- **Methodology**: tdd\n- **Methodology evidence**: Decided at the practices interview (test first for new work), carried over from the baseline. Git history cannot show test-first ordering, so this is not re-proven from evidence.\n- **Ordering**: For each behaviour, write a failing test first, then the code that makes it pass, then refactor with the suite green.\n- **Runner**: vitest 5.1.0 with three projects: `main` (node, `tests/main/**`, 98 files), `scripts` (the timed hook-script tests, run after the others, retried twice), and `renderer` (jsdom, `tests/renderer/**`, 53 files, Swedish locale).\n- **End-to-end**: Playwright 1.65 drives the built app through Electron (`tests/e2e`, US-0608). This is new since the baseline.\n- **Test count**: about 1,630 `it`/`test` lines by a static grep (1,136 in `main`, 497 in `renderer`). The baseline's 353 was out of date. Not counted by running the suite.\n- **Coverage floor**: 80% line coverage, v8, over `src/**` and the app's opencode plugin. Some agent and dialog files each hold 80% on their own. Set up in `vitest.config.mjs` and checked in CI. Current percentage not measured here.\n- **Suite green before merge**: the full suite (`npx vitest run tests/ --coverage`) runs in CI on every pull request into `main` and on every version tag.\n- **Manual check**: the built macOS `.dmg` is still checked by hand before a release tag. The built-app Playwright tests in CI do not replace this check."
    }
  ],
  "obligations": {
    "strategy": "standard",
    "strategy_volume": [
      "Five to eight tests per component.",
      "Unit tests plus integration tests for key boundaries.",
      "Add E2E, performance, or security tests when requirements demand them."
    ],
    "scope_floor": [
      "Keep the existing test suite green.",
      "This scope adds no extra new-test floor beyond the selected test strategy."
    ],
    "combination_rule": "Apply every selected-strategy obligation and every scope-floor obligation; neither replaces the other, and a targeted scope regression may add the narrowest necessary test type beyond the strategy default."
  },
  "plan_profile": {
    "methodology": "tdd",
    "runner_step": "Verify the existing test runner/configuration and record the exact unit-scoped command.",
    "runner_ready_before_first_test": true,
    "testable_layers": [
      "Data model / database behavior",
      "Repository / data access",
      "Business logic",
      "API / endpoint",
      "Frontend behavior"
    ],
    "steps": [
      "Project structure and production configuration skeleton.",
      "Verify the existing test runner/configuration and record the exact unit-scoped command.",
      "Data model / database behavior - Red: write the failing tests and record the failing command output.",
      "Data model / database behavior - Green: implement only enough behavior to pass.",
      "Data model / database behavior - Refactor: improve the implementation while tests stay green.",
      "Repository / data access - Red: write the failing tests and record the failing command output.",
      "Repository / data access - Green: implement only enough behavior to pass.",
      "Repository / data access - Refactor: improve the implementation while tests stay green.",
      "Business logic - Red: write the failing tests and record the failing command output.",
      "Business logic - Green: implement only enough behavior to pass.",
      "Business logic - Refactor: improve the implementation while tests stay green.",
      "API / endpoint - Red: write the failing tests and record the failing command output.",
      "API / endpoint - Green: implement only enough behavior to pass.",
      "API / endpoint - Refactor: improve the implementation while tests stay green.",
      "Frontend behavior - Red: write the failing tests and record the failing command output.",
      "Frontend behavior - Green: implement only enough behavior to pass.",
      "Frontend behavior - Refactor: improve the implementation while tests stay green.",
      "Environment/build configuration.",
      "Documentation and traceability."
    ]
  },
  "input_sha256": "sha256:62e0e9fa98cd86fbefaed196456b1ab91473689ff98919dd339561dd96d35b90",
  "contract_sha256": "sha256:b4ae8e1ec7217b124511fee47f9c29395d19f01a4e3b3abd23c00abd3e6afb59"
}
```

## Steps

1. [x] **Structure** (FR1, NFR2): no new dependency; new modules `src/main/pulse.js` (pure model), `src/renderer/PulseView.jsx`, `src/renderer/pulse/scene.js` and the vendored `src/renderer/pulse/vendor/` (pretty-events, MIT). Story set to 🚧 in its epic file and `FEATURES.md`.
2. [x] **Runner**: vitest as configured; the unit-scoped command is in `unit-test-instructions.md`.
3. [x] **Data model, Red/Green/Refactor** (FR2, FR7, FR9): `createPulseStore()` in `pulse.js`: `add({agent, path, kind: read|write|delete, at})`, segments per agent plus `Unattributed`, a 10-minute fade weight, grouping by folder past 200 files, 15 minutes of in-memory history pruned on add. Tests first in `tests/main/pulse.test.js`.
4. [x] **Business logic, Red/Green/Refactor** (FR3, FR5, FR6): `pulsePaths(tool, input, cwd, root)` in `pulse.js`: Read/Write/Edit/MultiEdit give `file_path`, Grep/Glob give `path`, Bash gives best-guess reads from path-like tokens. Only project-relative paths are kept; anything outside becomes one `outside` mark. Privacy test: no absolute or outside path ever leaves the function. The Claude and opencode toolStart in `agentAdapters.js` gains a bounded `paths` field from it. Tests in `tests/main/agentAdaptersPulse.test.js`.
5. [x] **Repository / file observer, Red/Green/Refactor** (FR4, NFR6): `watchProjectFiles(root, onChange)` in `watcher.js` on chokidar: skips `.git`, `node_modules` and git-ignored files, returns `{ready, close}`; a change on a file with an open write tool is dropped. It runs only while an agent, an intent or a Spec Kit flow is active; a test asserts `close` runs when that ends. Tests in `tests/main/pulseObserver.test.js`.
6. [x] **API, Red/Green/Refactor** (FR3, FR4): `ipc.js` feeds hook `paths` and observer changes into the store per project, adds a `pulse:list` handler and a batched `pulse:changed` push (the same 2 s pattern as `agent:activity`). `preload/index.js` gets `pulse: { list, onChanged }`. The wiring is tested in `tests/main/pulse.test.js`.
7. [x] **Frontend, Red/Green/Refactor** (FR1, FR2, FR7, FR8, FR9, NFR1, NFR3–NFR5): `PulseView.jsx` sits in the same `DiagonalFrame` (`Lcars.jsx`) as the intent and activity views (`IntentDetail.jsx`, `TokenDetail.jsx`): title, sub, and the readouts (touches per minute, files touched, busiest agent) in the frame's arm; the 15-minute bar strip goes in `arm`. Inside the frame, one canvas drawn by **reused pretty-events code** (MoulikRT/pretty-events, MIT, no runtime dependencies): its `core/math`, `core/random`, `components/canvas`, `ring`, `ribbons`, `backlog`, `callouts` and `scene/geometry`/`layout` modules are copied into `src/renderer/pulse/vendor/` with their types stripped to plain JS (the project has no TypeScript toolchain, NFR2), their `LICENSE` copied beside them, and a header line naming the source commit. Our own code is only the adapter `src/renderer/pulse/scene.js`: it maps the pulse store to their shapes (agents become ring sectors plus `Unattributed`, file touches become ribbon bundles and backlog dots, delete is their failure accent) and one LCARS theme object (steel read, white write, coral delete). Their ring is drawn once to an offscreen canvas; dots drift inward and fade over 10 minutes; ribbons fade in about 1.5 s. Hover uses their callout as `pulse-tooltip`; a click opens the file through `EditorCtx.open`, except outside and deleted files. Reduced motion draws one still frame without ribbons. Left out: exhaust rays (except the angle helper the backlog needs), web, grain, panels, topbar, themes, chain scene, simulation. Tests: the adapter mapping in `tests/renderer/pulseScene.test.js`; the vendored modules drawn against a stub 2D context, so they count toward coverage with no exclusion; the view renders inside `lcars-diagonal-frame` with its readouts; the ring is drawn once and not every frame; a ribbon is gone after its fade time. `App.jsx` gets the ArmBlock `arm-pulse` with a live strip while busy; `ProjectView.jsx` renders the view for `view === 'pulse'`. `pulse.*` keys go in `sv.json` and `en.json`. Tests in `tests/renderer/PulseView.test.jsx`.
8. [x] **Build configuration**: none needed. ESLint and Prettier on the touched files.
9. [x] **Docs and traceability** (NFR7): module headers name `US-0418 FRx`; shortcuts carry `ponytail:`; feature docs updated.
