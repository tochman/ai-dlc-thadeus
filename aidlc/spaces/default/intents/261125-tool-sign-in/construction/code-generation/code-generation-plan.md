# Code Generation Plan: see whether each tool is signed in, and sign in from the app (US-0804)

## Summary

- Builds: a sign-in check for Claude Code, opencode and GitHub, its state and "Sign in" in Settings › Tools, and one line in the terminal panel when an agent tab's tool is not signed in
- Touches: new `src/shared/signIn.js`, `src/main/parsers/signIn.js`, `src/main/signIn.js`, `src/renderer/SignIn.jsx`; changes in `exec.js`, `pty.js`, `ipc.js`, `preload/index.js`, `platforms/index.js`, `ToolRows.jsx`, `SettingsView.jsx`, `TerminalPanel.jsx`, `ProjectView.jsx`, `App.jsx`, `theme.css` and both locale files
- Tests: about 65 new ones, test first: the parsers, the check with stand-in scripts, the rows and the line, and one Playwright spec at 1280

## Design

**Shared table** (`src/shared/signIn.js`). The three ids with their sign-in arguments, `glab`'s check command, and `signInCommand(id, savedPath)`: the name, or the chosen path through `shellQuote` (moved here from `terminalControl.js`, which re-exports it), and the arguments of FR3.2.

**Reading the answers** (`src/main/parsers/signIn.js`, pure). `parseGh`, `parseClaude` and `parseOpencode` take `{ code, stdout, stderr, killed }` and give `{ state, account, reason }`; `state` is `in`, `out`, `none` (opencode without an account) or `unknown`. A reason is an app text, or the first line of `gh`'s stderr, cleaned: one line, no control characters, anything token-like replaced, at most 200. Claude Code's and opencode's output never goes into a reason. The account is cleaned the same way.

**The check** (`src/main/signIn.js`). `checkSignIn(id)`: an id outside the table throws; a tool `locateTool` does not find gives null.
- `gh`: `runFixed` with the fixed arguments, a 20 s limit and `input: ''`, which closes stdin.
- `claude`, `opencode`: the login shell with `-l -i -c`, as the agent tab, and `printf <marker>; exec <tool> <fixed args>`, quoted by `pty.js`'s `shellCommand` (exported). Only what follows the last marker is read, so a greeting changes nothing; `exec` leaves no shell in between.
- The limit kills with SIGKILL, since an interactive shell ignores SIGTERM. `runFixed` gets a `killSignal` option, and `defaultExec` keeps `stderr` on its error. `ponytail:` a program started by a startup file can outlive the kill.
- One process per tool and path at a time; a second request shares it.
- Nothing is logged. `signIn:check` is the one new call, and it answers with state, account and reason only (NFR1).

**Settings** (`SignIn.jsx`, `ToolRows.jsx`, `SettingsView.jsx`). `useSignIn` holds each tool's last answer, whether it is being checked, and a sequence number, so an older answer is dropped. The checks start after the rows have their versions, each alone; also on window focus while the tab shows. The state is a line of the row that starts at the version's column: chip, account, reason, "Sign in". With no project, "Sign in" opens the command with a copy button under the row. One visually hidden polite region names the tool and its new state. `groupStrip` takes `out` after `missing` and before `newer`.

**The agent tab's line.** `TermSession` calls `onStart` after each successful start, Restart included. `TerminalPanel` then checks that tab's harness and forgets its earlier answer and dismissal. The line sits in the panel's foot, only for the shown tab while the panel is open, and only for `out`. After "Sign in" from it, each time the Shell tab goes from busy to idle it checks again. The chosen path is read from the settings when "Sign in" is pressed. `App` gives `ProjectView` a function that opens Settings on Tools.

**The GitHub texts.** `update.ghLoggedOut` changes; the team view gets its own text for GitHub, so GitLab's stays.

## Steps

- [x] **Step 1** Run the existing tests as `unit-test-instructions.md` says, to see the runner green.

Data: reading the tools' answers
- [x] **Step 2 Red** `tests/main/signInParsers.test.js`: every row of the requirements' table with names changed; `gh` 401, no network, exit 0 with an empty name, unknown exit; Claude Code signed out with exit 1, without an email, with another provider, no JSON, no `loggedIn`; opencode none, some without connections, no JSON, not a list; killed; a reason with a token, a control character and 300 characters; no output in a reason. FR1.3–FR1.6, FR2.2, NFR1
- [x] **Step 3 Green, refactor** `parsers/signIn.js`.

File access: running the tools
- [x] **Step 4 Red** `exec.test.js` (`killSignal`, `stderr`, stdin closed) and `tests/main/signIn.test.js` with real stand-in scripts in a temporary folder and a stand-in startup file: a key and a greeting from it, a script that reads stdin, one that hangs is gone, one ignoring SIGTERM too (a short limit is injected), a path with a space and a quote, not found, unknown id, two requests share one process, a changed path does not, nothing on the console. FR1.1, FR1.2, FR1.6, FR1.7, NFR1, NFR3
- [x] **Step 5 Green, refactor** `exec.js`, `pty.js`, `signIn.js`.

Business logic
- [x] **Step 6 Red, green** `tests/main/signInCommand.test.js`: the three commands, a chosen path with a space, GitLab's check command; `shared/signIn.js`. FR2.3, FR3.2

App handlers
- [x] **Step 7 Red, green** `ipc.test.js`, `preload.test.js`: `signIn:check` passes only the id, an unknown id runs nothing; `platforms.test.js` and `updater.test.js`: the GitHub texts name Settings › Tools, GitLab's and Bitbucket's do not change. `ipc.js`, `preload/index.js`, `platforms/index.js`. FR4.4, NFR1

Interface
- [x] **Step 8 Red** `tests/renderer/SignIn.test.jsx`, Settings: each state and account by text; checked only when found; versions before a slow check, one slow check beside quick ones; GitLab; no state on the others; the strip's order; opening, Rescan, a changed path and window focus; the last state kept while checking; an older answer last; the announcement and unmoved focus; a failed call is unknown. FR1.1, FR2.1–FR2.6, FR5.2
- [x] **Step 9 Red** the same file, "Sign in": offered per state, typed through the Shell tab, a chosen path, no project with copy and a failed copy. FR3.1–FR3.4
- [x] **Step 10 Red** `TerminalPanel.test.jsx`: the line for `out` only, the shown tab only, two tabs, not while collapsed, Sign in, Settings › Tools, dismissed until the next start, checked again when the Shell tab goes quiet and at a restart, a late answer after a restart, one check per start, the start does not wait. `AppShell.test.jsx`: the link opens Settings on Tools. FR4.1–FR4.3, NFR3
- [x] **Step 11 Green, refactor** `SignIn.jsx`, `ToolRows.jsx`, `SettingsView.jsx`, `TerminalPanel.jsx`, `ProjectView.jsx`, `App.jsx`; texts in `sv.json` and `en.json` (`i18nKeys.test.js` green); LCARS styles in `theme.css`. FR5.1
- [x] **Step 12 Red, green** `tests/e2e/signIn.spec.js` with stand-in tools at 1280: the three states with a long email and no overflow; the agent tab's line without overflow (FR5.3); "Sign in" puts the command in the Shell tab unsent; with no project, the command and its copy button. The stand-in agent in `intentLayout.spec.js` answers any argument and exits, so the new check never writes over what it records; that spec stays green. FR5.3, NFR2

Close
- [x] **Step 13** The unit's commands green, ESLint and Prettier clean on the changed files; module headers name US-0804 and their requirements.

**Nothing to build:** no migration or setting; FR3.4 and FR1.7 hold by what is not there (checked in Steps 4 and 9).

**Left to Build and Test:** the full suite with coverage, every Playwright spec, and the story's markers and criteria in the feature docs.

## Story to step

| Story | Requirements | Steps |
|---|---|---|
| US1.1 See who is signed in | FR1.1, FR1.3–FR1.5, FR2.1–FR2.4, FR2.6, FR5.3 | 2–8, 11, 12 |
| US1.2 Never a false "signed in" | FR1.1–FR1.7, NFR1 | 2–5, 7, 8 |
| US1.3 A state that keeps up | FR2.5, FR5.2, NFR3 | 4, 5, 8, 11 |
| US2.1 Sign in from Settings | FR2.3, FR3.1, FR3.2, FR3.4 | 6, 9, 11, 12 |
| US2.2 Sign in before any project is open | FR3.3 | 9, 11, 12 |
| US3.1 Told where it fails | FR4.1–FR4.4, NFR3 | 7, 10–12 |
| All | FR5.1, FR5.2, NFR2 | 8–13, and test first throughout |

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
