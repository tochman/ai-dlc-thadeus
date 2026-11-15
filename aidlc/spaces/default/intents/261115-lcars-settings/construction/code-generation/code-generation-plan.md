# Code Generation Plan: US-0410 Settings in LCARS tabs

## Summary

- Builds: Settings as five LCARS tabs chosen from the left rail, LCARS frame and motion, tool cards for aidlc, Claude Code, opencode, gh and the shell, the last tab remembered
- Touches: `src/main/tools.js`, `src/main/settings.js`, `src/main/updater.js`, `src/renderer/SettingsView.jsx`, `src/renderer/App.jsx`, `src/renderer/theme.css`, `src/shared/locales/{sv,en}.json`
- Tests: about 12 new tests (main: tools, settings, updater; renderer: SettingsView, AppShell); existing SettingsView tests moved onto their tabs

Source: `aidlc/spaces/default/intents/261115-lcars-settings/inception/requirements-analysis/requirements.md` (FR1–FR6, NFR1–NFR4). Zero-Unit work: no unit-of-work file; scoped from requirements and the code. Story: US-0410.

## Testing Contract

```json
{
  "version": 1,
  "methodology": "tdd",
  "source": "team",
  "ordering": "For each behaviour, write a failing test first, then the code that makes it pass, then refactor with the suite green.",
  "scope": "ultra-express",
  "test_strategy": "minimal",
  "project_type": "brownfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nBuild and Test verifies defined coverage floors and affirmed quality targets;\nthey may not be weakened to make a step pass.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    },
    {
      "layer": "team",
      "text": "- **Methodology**: tdd\n- **Methodology evidence**: Decided by the person at the practices interview (Q1: test first, TDD, for new work). Earlier Code Generation plans recorded the framework default `test-after`; the affirmed choice replaces it for new work.\n- **Ordering**: For each behaviour, write a failing test first, then the code that makes it pass, then refactor with the suite green.\n- **Runner**: vitest 5.1.0 with two projects, `main` (node, `tests/main/**/*.test.js`) and `renderer` (jsdom, `tests/renderer/**/*.test.jsx`, Swedish locale). Currently 353 `it`/`test` call sites by static count; the knowledge base's \"about 490\" is not reconciled.\n- **Coverage floor**: 80% line coverage, checked in CI with `@vitest/coverage-v8` (Q2). Not set up yet; it is to be added to the repository and to the `verify` job of `.github/workflows/release.yml`. No coverage is measured today.\n- **Suite green before merge**: the full `npx vitest run tests/` suite must pass before any story pull request merges. CI runs it on every pull request into `main` and on every version tag.\n- **Manual check**: the built macOS `.dmg` is checked by hand before a release tag. Jsdom tests do not run the built app."
    }
  ],
  "obligations": {
    "strategy": "minimal",
    "strategy_volume": [
      "One verifiable test per requirement at the narrowest effective level.",
      "At least one happy-path unit test per component.",
      "Unit tests are the default; a bugfix/security scope floor may require an integration or E2E regression when that is the narrowest level that reproduces the defect."
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
  "input_sha256": "sha256:5d2edc438462ecd58d1a189f25096b14e109e68759a39bd787110cab4319df72",
  "contract_sha256": "sha256:4b20260229f72394250d9ed3f4261eb56cb5d29b1135cd7ade31c323a93c7425"
}
```

Layers that do not apply: Data model / database and API / endpoint (no database, no new IPC channel: `getTools`, `pickTool`, `saveTool`, `resetTool`, `setSettings` exist). "Repository" here is the settings store.

## Steps

- [x] **Step 1. Structure.** No new files beyond the tests; the card style goes in `src/renderer/theme.css`. (FR6)
- [x] **Step 2. Runner.** Verify `npx vitest run tests/main/tools.test.js tests/main/settings.test.js tests/main/updater.test.js tests/renderer/SettingsView.test.jsx tests/renderer/AppShell.test.jsx` runs green before any change; record it in `unit-test-instructions.md`.
- [x] **Step 3. Settings store, Red.** `tests/main/settings.test.js`: a valid `settingsTab` (`tools|appearance|notifications|project|about`) is kept, an invalid one dropped; `toolPaths.gh` and `toolPaths.opencode` are kept. (FR5.1, FR4.2)
- [x] **Step 4. Settings store, Green.** `SETTINGS_TABS` and the `settingsTab` line in `sanitize()` (`src/main/settings.js`); tool ids follow `TOOL_IDS`.
- [x] **Step 5. Refactor** with the suite green.
- [x] **Step 6. Tools and updater, Red.** `tests/main/tools.test.js`: `getTools` returns five rows in order aidlc, claude, opencode, gh, shell; a tool not on PATH comes back `found: false` with its error. `tests/main/updater.test.js`: with a saved `gh` path, the updater runs that path. (FR4.1–FR4.3)
- [x] **Step 7. Tools and updater, Green.** `TOOL_IDS = ['aidlc', 'claude', 'opencode', 'gh', 'shell']` in `src/main/tools.js`; `toolPath('gh')` in `src/main/updater.js`. opencode agent tabs already use `toolPath(h.cli)` (`src/main/pty.js`).
- [x] **Step 8. Refactor** with the suite green.
- [x] **Step 9. Settings view, Red.** `tests/renderer/SettingsView.test.jsx`, new: with `tab="notifications"` only that panel shows and it holds the alerts, replies and sound groups, and Appearance does not; each panel has the frame (`settings-frame`, header with the tab name); tool cards for all five ids, a missing one shows "Not found" and its needed-for text; a path renders a break opportunity after each `/`; with `data-motion="full"` the panel carries the sweep and cascade classes, with `off` none. Existing tests: render the tab they test (behaviour unchanged). (FR2, FR3, FR4, FR6, NFR2)
- [x] **Step 10. Settings view, Green.** `SettingsView.jsx`: a `tab` prop (default `tools`); split `Appearance` into Appearance and `Notifications`; `Section` becomes the LCARS frame (`lcars-card settings-frame`, header strip, body); `ToolCard` with `PathText` (`<wbr>` after `/`) and `settings.tools.neededFor.<id>`; `TOOL_IDS` extended. Locale keys in `sv.json` and `en.json` (`settings.sections.notifications`, `settings.tools.opencode`, `settings.tools.gh`, `settings.tools.neededFor.*`, `settings.tabsLabel`).
- [x] **Step 11. Refactor** with the suite green.
- [x] **Step 12. Rail and last tab, Red.** `tests/renderer/AppShell.test.jsx`: with Settings open the rail shows five sub-buttons under SETTINGS, the chosen one has `aria-current="page"`; clicking Notifications shows that panel and calls `setSettings({ settingsTab: 'notifications' })`; with Settings closed no sub-buttons; a saved `settingsTab` opens on that tab, none opens on Tools. (FR1, FR5)
- [x] **Step 13. Rail and last tab, Green.** `App.jsx`: `settingsTab` state read from `getSettings()`, saved on change; `ArmBlock` sub-buttons (`app-settings-tab-<id>`) rendered under SETTINGS only while `settingsView`; passes `tab` to `SettingsView`.
- [x] **Step 14. Refactor** with the suite green.
- [x] **Step 15. Styles.** `theme.css`: `.lcars-card` (outline, rounded top-right corner, top-edge bar, header strip with right-aligned title, footer strip), `.settings-frame` elbow, rail sub-buttons (indented, smaller), sweep and row cascade keyed on `[data-motion='full']`, static glow on `reduced`, nothing on `off`. Existing colour tokens only. (FR3, FR6, NFR3)
- [x] **Step 16. Checks.** `npx eslint` and `npx prettier --check` on the changed files; the full suite with coverage once (`npm run coverage`).
- [x] **Step 17. Docs and traceability.** `code-summary.md`, `traceability.json` (FR1–FR6, NFR1–NFR4 to files and tests).

## Notes

- No new dependency, no new IPC channel. Behaviour of every existing setting is unchanged (FR2.6).
- The project settings dialog (`ProjectSettingsDialog.jsx`) is not touched.
