# Code Generation Plan: US-0051 and US-0053

## Summary

- Builds: a gap under the Spec Kit Edit button (US-0051); a planning sync that clears entries already committed and pushes local `main` from any branch (US-0053)
- Touches: `src/renderer/SpeckitRules.jsx`, `src/renderer/theme.css`, `src/main/planningSync.js`, `tests/e2e/speckitLayout.spec.js`, `tests/main/planningSync.test.js`, `docs/features/epic-00-fixes.md`, `docs/FEATURES.md`
- Tests: 1 built-app test (L7) and 4 planning-sync tests, each red before its fix

## Causes

- **US-0051**: the constitution's wrapper `<div data-testid="speckit-rules-constitution">` is a plain block, so the Edit button sits flush on the file view.
- **US-0053 fault 1**: in `replayStep`, a pending entry whose change is already in HEAD (committed outside the app) gives `commitIn` nothing to commit, so it stays pending and joins the next commit's subject.
- **US-0053 fault 2**: `sourcesOf` adds local `main` only while it is checked out; on a story branch an app commit on `main` is never pushed, and `pushStep` drops the committed entries.

## Steps

- [x] Step 1: Verify the runners: `npx vitest run tests/main/planningSync.test.js` and, after `npm run build`, `npx playwright test tests/e2e/speckitLayout.spec.js -g L7`.
- [x] Step 2 (US-0051, Frontend Red): add `L7` to `tests/e2e/speckitLayout.spec.js`: at 1280 and 1920, the top of the constitution's file view is below the bottom of `speckit-rules-edit` (gap > 0). Build, run, record the failing output.
- [x] Step 3 (US-0051, Frontend Green): give the wrapper class `speckit-rules-constitution`, styled `display: grid; gap: var(--gap); min-width: 0`, with the button `justify-self: start`. L7 passes.
- [x] Step 4 (US-0053 AC1, AC4, Business logic Red): in `tests/main/planningSync.test.js`, (a) a recorded content entry whose text is then committed and pushed outside the app is cleared by the next cycle; (b) with such an entry and a new edit for another story, the next commit's subject names only the new story. Record the failing output.
- [x] Step 5 (US-0053 AC1, AC4, Green): in `replayStep`, a pending content entry whose text equals the file at the worktree's HEAD is marked committed and left out of `going`; when the commit finds nothing to commit, every remaining pending entry in `going` is marked committed too. `pushStep` then drops them once nothing is ahead of origin (AC4 needs no migration: an old entry takes the same path).
- [x] Step 6 (US-0053 AC2, AC3, Red): (c) an app commit on local `main`, then a checkout of a story branch, then a cycle: origin has the commit; offline, the entries stay; (d) the same with a commit of the person's own on local `main`: both are pushed, as on `main`. Record the failing output.
- [x] Step 7 (US-0053 AC2, AC3, Green): `sourcesOf` adds local `main` whenever it is ahead of origin (detached worktree at `main`). After the push, a checked-out `main` fast-forwards as before; one not checked out moves with `update-ref` only when it is an ancestor of the pushed commit.
- [x] Step 8 (Refactor): tidy both changes with the planning-sync file green; doc comments name `US-0053 FR1`/`FR2` and `US-0051`.
- [x] Step 9 (Docs): US-0051 and US-0053 to ✅ Done, for v0.3.1, ticked criteria, epic Status line and the FEATURES.md row.

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

Layers not touched by this fix (data model, repository, API) have no steps.
