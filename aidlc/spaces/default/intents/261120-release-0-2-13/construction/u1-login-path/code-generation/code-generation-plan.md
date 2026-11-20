# Code Generation Plan: U1 u1-login-path (US-0035)

## Summary

- Builds: a 20 s login-shell PATH read that is shared while it runs, never keeps a fallback, is read again on every Tools scan (at most once per scan, Step 13), and marks rows found on the fallback PATH
- Touches: `src/main/exec.js`, `src/main/tools.js`, `src/renderer/SettingsView.jsx` (ToolCard), `src/shared/locales/sv.json` and `en.json`, their tests
- Tests: 13 new tests (7 in `exec.test.js`, 4 in `toolsLoginPath.test.js`, 2 in `SettingsView.test.jsx`), test first; Steps 1-12 are built and committed (`427a035`), Step 13 is new

Story: US1.1 (US-0035), AC1.1.1–AC1.1.5; FR1.1–FR1.5; NFR1, NFR2, NFR3, NFR5. Design: ADR-006 (`../../../inception/domain-design/decisions.md`).

## Design

- `exec.js`: `PATH_TIMEOUT_MS = 20000` (FR1.3). A new `readLoginPath(exec)` resolves `{path, fromFallback}`. It keeps a successful read for the process, and shares one in-flight promise between callers (FR1.4). It never keeps a fallback: on a timeout, a failed shell or a missing marker it resolves `{path: process.env.PATH, fromFallback: true}` and clears the in-flight promise, so the next call asks the shell again (FR1.1). `refreshLoginPath()` drops a kept read but leaves an in-flight read alone (FR1.2). `loginPath(exec)` stays and returns `(await readLoginPath(exec)).path`, so `runFixed` and `pty.js` are unchanged.
- `tools.js`: `getTools()` is the Tools scan (`tools:info`, run each time Settings › Tools loads). It calls `refreshLoginPath()` first, then reads once. Rows found automatically carry `pathFallback: true` when that read fell back (FR1.5). Saved-path rows and the shell row never carry it.
- `ToolCard`: when `row.pathFallback`, it shows one muted line `t('settings.tools.pathFallback')`, `data-testid="settings-tool-fallback-<id>"` (NFR1, NFR2).
- Not applicable: data model, repository and API layers. `tools:info` and the bridge are unchanged.

## Steps

- [ ] **Step 1** (setup): create the branch `fix/US-0035` from `main`. Set US-0035 to 🚧 In progress in its marker in `docs/features/epic-00-fixes.md`, in the epic's **Status** line and in its `docs/FEATURES.md` row (story lifecycle).
- [ ] **Step 2** (runner): run `npx vitest run tests/main/exec.test.js tests/main/tools.test.js tests/renderer/SettingsView.test.jsx` on the unchanged code and record that it is green.
- [ ] **Step 3** (business logic, Red, `exec.js`): in `tests/main/exec.test.js`, add `describe('loginPath (US-0035)')` with fresh modules per test and these cases:
  - a shell that answers gives its PATH (AC1.1.2);
  - the shell is called with `timeout: 20000` (FR1.3);
  - a timed-out shell gives the app's PATH with `fromFallback: true`, and the next call starts a new shell (AC1.1.1);
  - a reply with no marker falls back the same way;
  - three calls during one read start one shell and all get its answer (AC1.1.4);
  - a successful read is kept (no second shell);
  - `refreshLoginPath()` makes the next call read again (AC1.1.3).

  Run `npx vitest run tests/main/exec.test.js` and record the failing output.
- [ ] **Step 4** (business logic, Green): implement `readLoginPath`, `refreshLoginPath` and the 20 s limit in `exec.js`, with `loginPath` kept. Run the same command green.
- [ ] **Step 5** (business logic, Refactor): tidy `exec.js` (doc comments naming US-0035 FR1.1–FR1.4) with the tests green.
- [ ] **Step 6** (business logic, Red, `tools.js`): in `tests/main/tools.test.js`, add:
  - `getTools` reads the login PATH again on each call, so a tool added to the shell's PATH between two scans is found by the second (AC1.1.3);
  - with a fallback read, the automatic rows carry `pathFallback: true` and a saved row does not (AC1.1.5);
  - with a successful read, no row carries it.

  Run `npx vitest run tests/main/tools.test.js` and record the failing output.
- [ ] **Step 7** (business logic, Green): `getTools` calls `refreshLoginPath()`, then `readLoginPath()` once, passes the path to the lookups and sets `pathFallback` on the automatic rows. Run it green.
- [ ] **Step 8** (business logic, Refactor): tidy `tools.js` with the tests green.
- [ ] **Step 9** (frontend, Red): in `tests/renderer/SettingsView.test.jsx`, add a test that a row with `pathFallback: true` shows `settings-tool-fallback-<id>` with the translated text, and that a row without it shows none (AC1.1.5). Run `npx vitest run tests/renderer/SettingsView.test.jsx` and record the failing output.
- [ ] **Step 10** (frontend, Green): add the line to `ToolCard`, and add `settings.tools.pathFallback` to `sv.json` and `en.json` (the Swedish: "Inloggningsskalets PATH kunde inte läsas; appens egen PATH användes."). Run the renderer test and `npx vitest run tests/main/i18nKeys.test.js` green.
- [ ] **Step 11** (frontend, Refactor): tidy with the tests green. No native `title=`; the line uses the existing `muted settings-tool-error` classes (LCARS).
- [ ] **Step 12** (checks): run `npx vitest run tests/main/exec.test.js tests/main/tools.test.js tests/renderer/SettingsView.test.jsx tests/main/i18nKeys.test.js`, then `npx eslint src/main/exec.js src/main/tools.js src/renderer/SettingsView.jsx` and `npx prettier --check` on the changed files.

- [ ] **Step 13** (business logic, added at the person's request after the build): one scan reads the login shell at most once. Red: in `tests/main/toolsLoginPath.test.js`, a scan whose read falls back starts exactly one login-shell read, `--version` checks included; run `npx vitest run tests/main/toolsLoginPath.test.js` and record the failing output. Green: `runFixed` takes an optional `path` that skips `loginPath`, and `probeTool` / `getTools` pass the PATH the scan already read. Refactor with `npx vitest run tests/main/exec.test.js tests/main/tools.test.js tests/main/toolsLoginPath.test.js` green.

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
