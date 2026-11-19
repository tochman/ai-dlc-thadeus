# Code Generation Plan: US-0034 Linux update hotfix (v0.2.12)

## Summary

- Builds: the Linux update runs `/usr/bin/pkexec` by full path, shows the real reason when it fails, and falls back to the app's own password dialog with `sudo -S` when pkexec cannot ask for the password
- Touches: `src/main/exec.js`, `src/main/updater.js`, `src/main/ipc.js`, `src/renderer/UpdateNotice.jsx`, the two locales, `package.json` (0.2.12), the feature docs
- Tests: about 8 new unit tests in `tests/main/updater.test.js`, `tests/main/exec.test.js` and `tests/renderer/UpdateNotice.test.jsx`

## Story

US-0034 (`docs/features/epic-00-fixes.md`). Reported 2026-11-19 on v0.2.11: "Command failed: pkexec dpkg -i <file>". In a shell, the same command says "pkexec must be setuid root".

Cause: `install()` runs `pkexec` by name through the login shell's PATH, so the `pkexec` that runs may not be the system's setuid copy. `step()` keeps only the first line of Node's error (`firstLine`), and that drops the reason.

## Design

- `defaultExec` and `runFixed` take an `input` option, written to the child's stdin and then closed. It is used only for the password, which never goes into args, logs or settings.
- `step()` reports the last line the command printed after Node's "Command failed" line. When the command printed nothing, it reports the exit code. This covers every install step (macOS too).
- Linux `install()`:
  1. Run `/usr/bin/pkexec /usr/bin/dpkg -i <file>`.
  2. If pkexec cannot ask for the password (its output says "must be setuid root" or "No authentication agent", it is not found, or it exits 127), return `{status: 'needs-password', file}`.
  3. If the person closes pkexec's own dialog (exit 126), return an error with `manual`.
  4. If it fails for any other reason, return an error with `manual: 'sudo apt install <file>'`.
- `install({password})` runs `/usr/bin/sudo -S -k -p '' /usr/bin/dpkg -i <file>` with the password plus a newline on stdin. A wrong password ("incorrect password", "Sorry, try again") returns `{status: 'needs-password', wrong: true, file}`. Other failures return an error with `manual`.
- IPC `update:install` passes `password` only when it is a string.
- `UpdateNotice` gets a `password` phase: an LCARS form with a password field, an Install button and a Cancel button. The field is cleared after each try. A wrong password shows its own line. Cancel shows the error with the `sudo apt install` command in `<code>`. The `manual` command is also shown in the ordinary error phase.

## Steps

- [x] Step 1: Create branch `fix/US-0034` from `main`; set US-0034 to 🚧 in its marker, the epic Status line and the FEATURES.md row.
- [x] Step 2: Verify the runner with `npx vitest run tests/main/updater.test.js tests/main/exec.test.js tests/renderer/UpdateNotice.test.jsx`.
- [x] Step 3: Red (exec): a test that `runFixed(..., {input})` passes `input` to exec, and that `defaultExec` writes it to stdin. Record the failing output.
- [x] Step 4: Green/refactor (exec): add `input` to `defaultExec` and `runFixed`.
- [x] Step 5: Red (updater): tests for:
  - Linux calls `['/usr/bin/pkexec', '/usr/bin/dpkg', '-i', file]`. Update the existing test.
  - A failed step shows the stderr line, not "Command failed".
  - "pkexec must be setuid root" returns `needs-password`.
  - Exit 126 returns an error with `manual` and no `needs-password`.
  - The password goes to `/usr/bin/sudo` on stdin, not in args, and installs.
  - A wrong password returns `needs-password` with `wrong: true`.
  Record the failing output.
- [x] Step 6: Green/refactor (updater + ipc): implement the design in `src/main/updater.js` and `src/main/ipc.js`.
- [x] Step 7: Red (renderer): tests for:
  - `needs-password` shows the password form (`update-notice-password`).
  - Submit calls `installUpdate({password})`.
  - `wrong` shows `update-notice-wrong-password`.
  - Cancel shows the `sudo apt install` command (`update-notice-manual`).
  Record the failing output.
- [x] Step 8: Green/refactor (renderer + locales): `UpdateNotice.jsx` and `update.passwordPrompt`, `update.password`, `update.install`, `update.wrongPassword`, `update.manual`, `update.exitCode` in `sv.json` and `en.json`.
- [x] Step 9: Release prep in the same PR: `package.json` and `package-lock.json` version 0.2.12; US-0034 ✅ with its ACs ticked, "for v0.2.12".
- [x] Step 10: Documentation and traceability: `code-summary.md`, `traceability.json`.

## Testing Contract

```json
{
  "version": 1,
  "methodology": "tdd",
  "source": "team",
  "ordering": "For each behaviour, write a failing test first, then the code that makes it pass, then refactor with the suite green.",
  "scope": "quick-fix",
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
  "input_sha256": "sha256:9aed65a26f9fdb3cdc2a9b9e8d5386b5ad5965c9172db7aa95fb358c8862fa52",
  "contract_sha256": "sha256:e42d2ce00548216337e3ac8ba31fbb15976e2ab1e72c6bda55737f9afac62bcd"
}
```

Layers not in this fix (data model, repository): none apply. Business logic is the updater, the API is the IPC handler, and the frontend is the notice.
