# Code Generation Plan: US-0806 custom agent command per project

## Summary

- Builds: an agent command per harness and project, checked when saved and again before the tab starts, with a "command not found" message, and all six harnesses selectable for the agent tab
- Touches: `src/shared/harnesses.js`, `src/main/settings.js`, `src/main/pty.js`, `src/main/ipc.js`, `src/renderer/ProjectSettingsView.jsx`, `src/renderer/TerminalPanel.jsx`, `src/renderer/App.jsx`, `src/shared/locales/{sv,en}.json`, EPIC-08 feature docs
- Tests: about 30 new unit tests (vitest, test first) across 6 existing test files

## Findings that shape the plan

- Fortsätt, the quick commands, the plan views and the setup offers already ask `harnessCommand()`, which is null for a harness with `commands: {}`. Making Codex, Kiro, Cursor and Copilot selectable therefore already shows those as not available with a reason (FR5.2); the plan adds tests for it, not new gating code.
- Claude Code and opencode keep their table entries, so a changed command changes nothing else about the tab (FR5.1).
- "Terminal settings" is the Agent section of the project's Configuration (`AgentSection` in `ProjectSettingsView.jsx`).

## Steps

- [x] Step 1: Runner check. Run the scoped command from `unit-test-instructions.md` on the unchanged tree and confirm it is green. (all)
- [x] Step 2: Shared rule, Red. In `tests/main/harness.test.js`: all six harnesses are selectable (FR1.4); `defaultAgentCommand(id)` gives `claude`, `opencode`, `codex`, `kiro-cli`, `cursor-agent`, `copilot` (FR1.2); `checkAgentCommand(text)` accepts `codex --full-auto`, `~/bin/my-cli -p x=1` and refuses `;`, `|`, `&`, `$`, backticks, `<`, `>`, quotes, a line break, a control character, an empty or blank text and 501 characters, each with its own reason (FR3.1, FR3.2). Record the failing output.
- [x] Step 3: Shared rule, Green. In `src/shared/harnesses.js`: `selectable: true` for all six, `cli` for Cursor (`cursor-agent`) and Copilot (`copilot`), and the two pure functions above.
- [x] Step 4: Shared rule, Refactor with the tests green; update the header comment (US-0806 FR1, FR3).
- [x] Step 5: Settings, Red. In `tests/main/settings.test.js`: `agentCommands` is saved per project and read back after a restart (FR1.3); a saved invalid command is dropped on read; `setProjectSettings` refuses an invalid command with a message naming the problem and saves nothing (FR3.2); `null` for a harness clears it, so the default applies (FR1.2); an unknown harness id is refused.
- [x] Step 6: Settings, Green and Refactor. `src/main/settings.js`: sanitize and check `agentCommands` with `checkAgentCommand`, merged per harness like `handoff`.
- [x] Step 7: Tab start, Red. In `tests/main/pty.test.js`: with a saved command the agent runs `-l -i -c <command>` in the project folder (FR2.1); without one the table CLI with the tool path runs as today (FR2.2); a command that fails the check throws before node-pty loads (FR3.3). In `tests/main/ipc.test.js`: `pty:spawn` reads the command from the project settings in main, never from the tab (NFR1); it runs one `command -v <first word>` in the login shell first (NFR3); when that fails it starts nothing and returns `{ notFound: <first word> }` (FR4.1).
- [x] Step 8: Tab start, Green and Refactor. `src/main/pty.js` takes a `command` option and checks it again; `src/main/ipc.js` reads `agentCommands[harness]`, runs the check through `runFixed` (fixed arguments, the first word as `$1` of a fixed script, never spliced into shell text) and passes the command on. A tab already running keeps its command (nothing restarts it).
- [x] Step 9: Frontend, Red. In `tests/renderer/ProjectSettingsView.test.jsx`: the Agent section shows a command field for the chosen harness and for each harness in its tabs, prefilled with its default (FR1.1, FR1.2); a refused command shows the main error and the field stays (FR3.2); clearing it saves `null`; Codex is now a choice, not disabled (FR1.4). In `tests/renderer/TerminalPanel.test.jsx`: a `{ notFound }` reply shows one sentence and an "Open terminal settings" button that calls the project settings opener (FR4.2); a Codex tab shows the quick commands as not available with the reason (FR5.2); a Claude Code tab is named after its harness (FR2.3).
- [x] Step 10: Frontend, Green and Refactor. `ProjectSettingsView.jsx` command fields (LCARS `lcars-input`, `data-testid` `project-settings-agent-command-<id>`); `TerminalPanel.jsx` the not-found line and button (`terminal-panel-open-settings-<tab>`); `App.jsx` passes `openProjectSettings` with the Agent section to the terminal panel.
- [x] Step 11: Texts. New keys in `sv.json` and `en.json` (field label and help, each refusal reason, not found sentence, button) through `t()` with ICU placeholders; `tests/main/i18nKeys.test.js` stays green (FR6.1).
- [x] Step 12: Not-available check (FR5.3). Confirm with a test in `tests/renderer/terminalControl.test.jsx` that Resume for a Codex tab gives the "no command" reason instead of typing; the agent dialog and cost per session read hook events only, which a Codex tab never sends, so they stay empty rather than fail. Fix only what that test shows broken.
- [x] Step 13: Feature docs. US-0806 in `docs/features/epic-08-*.md` and its `docs/FEATURES.md` row set to 🚧 In progress "for v0.3.2" at the start of the build.
- [x] Step 14: Run the scoped tests, ESLint and Prettier on the changed files; write `code-summary.md` and `traceability.json`.

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

The project has no database or repository layer for this change: the settings file is the data layer (Steps 5–6), the shared rule is the business logic (Steps 2–4), the pty start and `pty:spawn` are the endpoint (Steps 7–8), and the two views are the frontend (Steps 9–10).
