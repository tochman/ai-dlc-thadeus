# Code Generation Plan: health check on the start screen (US-0805)

## Summary

- Builds: a health check of five tools on the "No project open" screen and one line above a project, with install and sign-in commands to copy
- Touches: new `src/shared/health.js`, `src/shared/installCommands.js`, `src/renderer/HealthCheck.jsx`; changes in `tools.js`, `speckitSetup.js`, `ipc.js`, `SignIn.jsx`, `SettingsView.jsx`, `ProjectView.jsx`, `App.jsx`, `theme.css`, both locale files
- Tests: about 45 new (unit, component and integration) and 4 built-app Playwright tests with stand-in tools

## Design

- **No new check.** `getTools` (US-0410) and `checkSignIn` (US-0804) through the existing bridge calls. No new IPC channel; `bridge.platform` exists.
- **`src/shared/health.js`** (pure, FR2): `healthOf({ rows, signIns, framework, checking })` gives `{ status: 'checking' | 'ready' | 'problems', tools: [{ id, need: 'needed' | 'either' | 'optional', state, problem, broken }] }`, problems first. `signIns` is a state per tool id; none yet after a finished check counts as `unknown`. A needed tool still being checked, and no problem, gives `checking`, never `ready`.
- **`src/shared/installCommands.js`** (FR4.2, FR4.3): one dated table, `installFor(id, platform)` gives `{ command, needs, page }`. `INSTALL_HINT` is exported by `speckitSetup.js` from this table. Any platform but macOS gets the Linux command. GitHub's Linux chain is in the appendix.
- **`noAnswer`** (FR4.6, FR4.7): `toolRow` in `tools.js` adds `noAnswer: true` to a row whose file is there and executable but whose `--version` failed. Settings' rows look as today.
- **`src/renderer/HealthCheck.jsx`**: `useHealth({ ready, framework })` (the scan, one per app, in `App.jsx`), `HealthPanel` (the start screen) and `HealthLine` (above a project). Both show the same list.
- **One scan at a time** (FR1.4, NFR2): a scan is `getTools` and then the sign-in checks. "Check again" during one does nothing; a path change during one starts one more when it is done. `useSignIn` gets an option that leaves out its window-focus reading, and `read` returns a promise.
- **The line's dismissal** (FR3.3): the ids shown when it was dismissed, in memory only. An id leaves the set when its tool works again, so a later failure brings the line back. Switching project does not by itself.

Interpretations to approve:

1. A tool that is found but does not answer `--version` counts as a problem when it is needed: a broken Claude Code is not "ready", and Settings › Tools counts it as missing too.
2. The sign-in command shows for "Not signed in" and "No account connected", not for "unknown". The account name is not shown on the start screen.
3. With no project open and neither AI-DLC nor Spec Kit found, both rows are problems and the line says "AI-DLC or Spec Kit".

## Steps

Each test is written first and run to see it fail; the failing output is noted in the Step 20 report.

- [x] Step 1: Verify the runner with the command in `unit-test-instructions.md` on the existing files it names. [all]
- [x] Step 2: Red: `tests/main/installCommands.test.js`. Every tool and platform, exactly as FR4.2; the Linux chain equal to the appendix, line breaks and tabs included; `needs` uv and Homebrew; an unknown id gives null; `INSTALL_HINT` is the table's. [FR4.2, FR4.3]
- [x] Step 3: Green: `src/shared/installCommands.js`; `speckitSetup.js` takes `INSTALL_HINT` from it.
- [x] Step 4: Red: `tests/main/health.test.js`. Each framework (AI-DLC, Spec Kit, none, no project) against found, missing, no answer, checking; Claude in, out, none, unknown, checking; optional tools never count; problems first; "either" with one, both and neither found. [FR1.1, FR1.2, FR2.1, FR2.2, NFR3]
- [x] Step 5: Green and refactor: `src/shared/health.js`.
- [x] Step 6: Red: `tests/main/tools.test.js`. `noAnswer` for an executable that fails `--version` (chosen and from PATH); none for a chosen path that is gone, or not executable. [FR4.6, FR4.7]
- [x] Step 7: Green: `src/main/tools.js`.
- [x] Step 8: Red: `tests/main/ipc.test.js`. `app:openExternal` opens each tool's page by its key `install-<id>`; an unknown key and an address are refused. [FR4.1, NFR1]
- [x] Step 9: Green: `EXTERNAL_URLS` in `src/main/ipc.js` from the table.
- [x] Step 10: Red: `tests/renderer/SignIn.test.jsx`. `read` resolves when its checks have; without the focus option the window's focus starts no check; `CopyCommand` copies a text with line breaks unchanged and says when it fails. [FR1.4, FR4.1, FR5.3]
- [x] Step 11: Green: `src/renderer/SignIn.jsx`: the option, the promise, `CopyCommand` exported with a label and a test id. Settings' test ids stay.
- [x] Step 12: Red: `tests/renderer/HealthCheck.test.jsx`, the scan: versions before sign-ins; one scan at a time; a second press does nothing; a path change during a scan runs one more; a rejected `getTools` keeps the last rows and says why; a failed sign-in check leaves the others. [FR1.3, FR1.4, FR3.4, NFR2]
- [x] Step 13: Red: the same file, the views: the rows with need, purpose, state and reason; install command, Copy, what is needed first and page link; sign-in command with a chosen path quoted; no install command for `noAnswer`; the fold with `aria-expanded`; the line's text, Show, Dismiss and its return; the polite announcement after "Check again" only; focus kept (`aria-disabled` while checking); the PATH fallback note. [FR2.3, FR3, FR4, FR5]
- [x] Step 14: Green and refactor: `src/renderer/HealthCheck.jsx`, with `ToolRow`, the texts in `sv.json` and `en.json` (`health.*`; "what it is for" from `settings.tools.neededFor`).
- [x] Step 15: Red: `AppShell.test.jsx`, `ProjectView.test.jsx`, `SettingsView.test.jsx`. The scan starts after the restore and never before; the panel only with no project and Settings closed, "Open project" usable meanwhile; the line above the active project follows its framework; a saved or reset path in Settings starts a scan. [FR1.4, FR3.1, FR3.3]
- [x] Step 16: Green: `App.jsx` (the hook, the panel, the `banner` prop), `ProjectView.jsx` (the banner first in `project-main`), `SettingsView.jsx` (`onToolsChanged`).
- [x] Step 17: `theme.css`, LCARS: the panel in the start screen's frame (scrolls inside, never cut off at the top), the line, the command box (`pre-wrap`, breaks anywhere). [FR5.1, FR5.3]
- [x] Step 18: `tests/e2e/standInTools.js`, a helper that writes working stand-in tools. `intentLayout`, `planning` and `speckitLayout` use it, so a machine without Claude Code (CI) never gets the line inside their layout measurements. `signIn.spec.js`: its "one check, its own tool only" assertions now allow the start's scan. [NFR3]
- [x] Step 19: `tests/e2e/healthCheck.spec.js` at 1280, built app, stand-in tools: (a) the list with a missing, a signed-out and an optional tool, the long Linux command fits; (b) all found: one line, opens and closes; (c) the line above a project, Show and Dismiss; (d) a tool put in place, then "Check again", without a restart. No install command is ever run, and nothing is typed. Screenshots of (a) to (c). `npx electron-vite build` first. [FR3, FR4.4, FR5.3, NFR3]
- [x] Step 20: Run the command in `unit-test-instructions.md`, `npx eslint . --max-warnings 0`, `npx prettier --check .` and every Playwright spec; report the results and the Red outputs. The full suite with coverage is Build and Test's.

No dependency, database, migration, deployment file or test configuration changes. Feature docs (`docs/FEATURES.md`, `epic-08-harnesses.md`) are updated after Build and Test, not by the developer.

## Traceability

| Story criterion (US-0805) | Requirements | Steps |
|---|---|---|
| Lists the tools with their state | FR1, FR2.3, FR3.1 | 4–7, 12–16, 19a |
| Install command, Copy, purpose, optional | FR2.1, FR4 | 2–3, 8–11, 13–14, 19a |
| Check again without a restart | FR1.4, FR3.4 | 12, 14, 19d |
| Folds to one line; line above a project | FR2.2, FR3.2, FR3.3 | 4–5, 13–17, 19b–c |
| Only shows commands | FR4.4, NFR1 | 8–9, 13, 19 |
| Swedish and English | FR5.1 | 14 |

## Appendix: GitHub's Debian chain

From `cli/cli` `docs/install_linux.md`, read 2026-11-25. The continuation lines start with one tab.

```bash
(type -p wget >/dev/null || (sudo apt update && sudo apt install wget -y)) \
	&& sudo mkdir -p -m 755 /etc/apt/keyrings \
	&& out=$(mktemp) && wget -nv -O$out https://cli.github.com/packages/githubcli-archive-keyring.gpg \
	&& cat $out | sudo tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null \
	&& sudo chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg \
	&& sudo mkdir -p -m 755 /etc/apt/sources.list.d \
	&& echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
	&& sudo apt update \
	&& sudo apt install gh -y
```

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
