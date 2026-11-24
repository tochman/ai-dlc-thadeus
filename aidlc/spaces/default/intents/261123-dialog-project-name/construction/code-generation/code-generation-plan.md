# Code Generation Plan: US-0046

US-0046 (EPIC-00, for v0.2.15): the agent dialog names the project it comes from when several projects are open.

## What is there now

`AgentDialog.jsx` already gets `projectNameOf` from `App.jsx` and puts the project into the small grey "where" line (`agent-dialog-where`, `agentDialog.context`: `{project} · {intent} · {stage}`). It is easy to miss, so with several projects open a page can be answered for the wrong one. The fix adds a clear LCARS project band to each page, shown only when two or more projects are open. With one project open nothing changes.

## Where the work is done

Local `main` is diverged from `origin/main`, so the work goes in a new worktree: `git worktree add -b fix/US-0046 .claude/worktrees/fix-0046 origin/main`, then `npm ci` in it. Squash-merged pull request into `main`.

Files this plan changes (some are also listed by the spec-kit work; only the lines named here change):
- `src/renderer/AgentDialog.jsx`: new prop `showProject` (default `false`); when true, a band `agent-dialog-project` with `t('agentDialog.project', { project })` above the title head.
- `src/renderer/App.jsx`: passes `showProject={tabs.length > 1}`.
- `src/renderer/theme.css`: `.agent-dialog-project`, an LCARS pill in the theme's colours (no new colours).
- `src/shared/locales/sv.json`, `src/shared/locales/en.json`: key `agentDialog.project` ("PROJEKT {project}" / "PROJECT {project}").
- `tests/renderer/AgentDialog.test.jsx`: the new tests.
- `docs/features/epic-00-fixes.md`, `docs/FEATURES.md`: story status.

## Steps

- [x] Step 1: Make the worktree and branch as above; set US-0046 to 🚧 In progress, for v0.2.15 (status marker, the epic's **Status** line, the FEATURES.md row). (US-0046, story lifecycle)
- [x] Step 2: Verify the runner: `npx vitest run --project renderer tests/renderer/AgentDialog.test.jsx` passes on the unchanged tree.
- [x] Step 3: Frontend Red: in `tests/renderer/AgentDialog.test.jsx` add (a) `showProject` with an event from project "alpha" shows `agent-dialog-project` with "alpha" (AC1); (b) two events from "alpha" and "beta", Next shows "beta" and Previous "alpha" (AC2); (c) without `showProject` there is no `agent-dialog-project` and the where line is unchanged (AC3). Run; (a) and (b) fail.
- [x] Step 4: Frontend Green: the `showProject` prop, the band, the locale key in both files (AC4), the CSS class. Run; all pass. `tests/main/i18nKeys.test.js` passes.
- [x] Step 5: App Red/Green: `showProject={tabs.length > 1}` in `App.jsx`. If `tests/renderer/AppShell.test.jsx` already opens the agent dialog with projects open, add one test there with two projects (band shown) and one project (no band), Red first; if it does not, the prop is one expression and is covered by the dialog tests: note that in `code-summary.md`.
- [x] Step 6: Refactor with tests green; ESLint and Prettier on the changed files.
- [x] Step 7: Documentation and traceability: `code-summary.md`, `traceability.json`; module comment names `US-0046`.

## Story traceability

| Acceptance criterion | Steps |
|---|---|
| AC1 page names its project when 2+ open | 3, 4, 5 |
| AC2 each page shows its own project when paging | 3, 4 |
| AC3 one project: looks as now | 3, 4, 5 |
| AC4 `t()` with ICU placeholder, key in sv and en | 4 |
| AC5 tests fail without, pass with; suite green | 3–6, Build and Test |

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
      "text": "- **Methodology**: tdd\n- **Methodology evidence**: Decided at the practices interview (test first for new work), carried over from the baseline. Git history cannot show test-first ordering, so this is not re-proven from evidence.\n- **Ordering**: For each behaviour, write a failing test first, then the code that makes it pass, then refactor with the suite green.\n- **Runner**: vitest 5.1.0 with three projects: `main` (node, `tests/main/**`, 98 files), `scripts` (the timed hook-script tests, run after the others, retried twice), and `renderer` (jsdom, `tests/renderer/**`, 53 files, Swedish locale).\n- **End-to-end**: Playwright 1.65 drives the built app through Electron (`tests/e2e`, US-0608). This is new since the baseline.\n- **Test count**: about 1,630 `it`/`test` lines by a static grep (1,136 in `main`, 497 in `renderer`). The baseline's 353 was out of date. Not counted by running the suite.\n- **Coverage floor**: 80% line coverage, v8, over `src/**` and the app's opencode plugin. Some agent and dialog files each hold 80% on their own. Set up in `vitest.config.mjs` and checked in CI. Current percentage not measured here.\n- **Suite green before merge**: the full suite (`npx vitest run tests/ --coverage`) runs in CI on every pull request into `main` and on every version tag.\n- **Manual check**: the built macOS `.dmg` is still checked by hand before a release tag. The built-app Playwright tests in CI do not replace this check."
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
  "input_sha256": "sha256:88a731b4ee7244a446aff4ca6ed5dc5172b18032c5eb29d520ce15f5f12b868b",
  "contract_sha256": "sha256:0753d09afb0bc3b53aaf639e33074da4c539985c42e493c67138981db2bcb87b"
}
```

Only the Frontend behavior layer applies: no data model, data access, business logic or API changes.
