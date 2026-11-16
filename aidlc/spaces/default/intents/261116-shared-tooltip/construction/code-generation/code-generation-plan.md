# Code Generation Plan: US-0414 one LCARS tooltip across the app

## Summary

- Builds: one shared LCARS `Tooltip` (portal, hover and focus, flips and clamps inside the window) that replaces all 31 native `title=` tooltips and the split-bar row tip, with the chart tooltip taking the same look
- Touches: new `src/renderer/Tooltip.jsx` and `src/renderer/tooltipPlacement.js`; `theme.css`; App, IntentList, IntentDetail, Pipeline, CostPanel, CostTab, ConfigEdit, FeaturesView, ArtifactReader, ResumeButton, TerminalPanel, Lcars, editor/EditorPanel, TokenDetail; locales
- Tests: about 12 new unit tests (placement, component, no-`title=` guard, Resume and button-part focus), plus the 4 test files that check `.title` updated

Zero-Unit express work: one iteration, built from `inception/requirements-analysis/requirements.md` and the scan's "Tooltip Inventory" in `inception/reverse-engineering/developer-scan.md`.

## Testing Contract

```json
{
  "version": 1,
  "methodology": "tdd",
  "source": "team",
  "ordering": "For each behaviour, write a failing test first, then the code that makes it pass, then refactor with the suite green.",
  "scope": "express",
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
  "input_sha256": "sha256:3a3e99f1e55b225dce936715ddd095cabaceeab0e44cf8ec6eeab8daf73e4d52",
  "contract_sha256": "sha256:c203aae185bed3ce09c3c921ca1ec08a65e296b2cff7f7791c1a0522e7468af4"
}
```

## Steps

Layers that do not apply: there is no data model, repository or API layer (renderer only). "Business logic" is the pure placement function; the rest is frontend behaviour. Each frontend Red/Green/Refactor step covers one group of views.

- [x] **Step 1: Structure.** New files: `src/renderer/tooltipPlacement.js` (pure, no DOM), `src/renderer/Tooltip.jsx` (the component), one `.lcars-tip` block in `theme.css` that replaces `.token-detail-row-tip` and supplies the chart tooltip's look. No new dependency.
- [x] **Step 2: Runner.** Verify that `npx vitest run tests/renderer/TokenDetail.test.jsx` is green on the unchanged tree, and record the scoped command from `unit-test-instructions.md`.
- [x] **Step 3: Placement, Red (FR1.4).** `tests/renderer/tooltipPlacement.test.js`: it opens below by default; flips above when there is no room below; shifts left or right so it stays at least 4 px inside the window; and clamps when the window is smaller than the tooltip. Run and record the failure.
- [x] **Step 4: Placement, Green.** `placeTooltip(anchorRect, tipSize, viewport)` returns `{top, left, side}`. The header names US-0414 FR1.4.
- [x] **Step 5: Placement, Refactor** with the tests green.
- [x] **Step 6: Component, Red (FR1.1–FR1.3, FR1.5, NFR1).** `tests/renderer/Tooltip.test.jsx`:
  - focus on the anchor opens it at once;
  - hover opens it after the delay (fake timers);
  - blur, leave and Esc close it;
  - it carries `role="tooltip"`, and the anchor's `aria-describedby` points to it while it is open;
  - the anchor's `aria-label` is kept;
  - it renders in `document.body` with the `lcars-tip` class.
- [x] **Step 7: Component, Green.** `Tooltip({ text, children, focusable })` clones its single child with handlers and an `aria-describedby`. With `focusable`, it gives the child `tabIndex=0`. It renders through `createPortal`, measures with `getBoundingClientRect`, places with `placeTooltip`, and opens on hover after about 300 ms (`ponytail:` a fixed delay, no global hover-intent manager).
- [x] **Step 8: Component, Refactor** with the tests green. Choose the z-index between 50 and 100 (FR1.5) in `theme.css`.
- [x] **Step 9: Guard, Red (FR2.1).** `tests/renderer/noNativeTitle.test.js` reads every `src/renderer/**/*.jsx` file and fails on a `title=` JSX attribute on a DOM element. It allows the `CostTable` and `Section` `title` props. It fails now with the 31 sites.
- [x] **Step 10: Interactive sites, Red (FR2.4, FR2.5, FR2.3).**
  - `ResumeButton.test.jsx`: while Resume is unavailable it is focusable, its `aria-disabled` is true, focus shows the reason, and a click does nothing. Its 11 `.title` asserts move to the tooltip.
  - `TerminalPanel.test.jsx`: the "no command" hint shows in the quick-command list's tooltip.
  - `IntentList.test.jsx`: an intent row's button shows the combined cost, plan, done and error text on focus, and each part still shows its own on hover. The `.title` asserts move to the tooltip.
- [x] **Step 11: Interactive sites, Green.** Wrap inventory rows 2–4, 6, 11, 13, 27 and 28 (App tabs and tools, intent rows, the story chip, stage cards, Resume, the quick-command list) and 31 (editor tabs) in `Tooltip`.
  - **Resume:** use `aria-disabled` plus a click guard instead of `disabled`.
  - **"No command" option:** drop its title and add its hint to the list's tooltip.
  - **Button parts (rows 5, 7–9, 12, 14, 15):** each keeps a hover-only `Tooltip`. The parent button gets the combined text through its own `Tooltip`.
- [x] **Step 12: Interactive sites, Refactor** with the tests green.
- [x] **Step 13: Plain-text sites, Red (FR2.2, FR4.1).** `CostPanel.test.jsx` and a `CostTab` case: the ⓘ, the warning tags and the cost figures are focusable (`tabIndex=0`) and show their text on focus. The `model-mismatch` `.title` assert moves to the tooltip.
- [x] **Step 14: Plain-text sites, Green.** Wrap rows 1, 10, 16–26 and 30 in `<Tooltip focusable>`. Label texts stay `t()`; data values are shown as they are. Add any missing keys to `sv.json` and `en.json`.
- [x] **Step 15: Plain-text sites, Refactor** with the tests green. The guard test from Step 9 now passes.
- [x] **Step 16: Token detail, Red (FR3.1, FR3.2).** `TokenDetail.test.jsx`: a split-bar row shows the shared tooltip on focus and hover. The chart tooltip carries the `lcars-tip` class and is clamped on the left as well as the right.
- [x] **Step 17: Token detail, Green.** The row tip uses `Tooltip`. The visx `Tooltip` gets `className="lcars-tip ..."` and a left clamp. Remove `.token-detail-row-tip` from `theme.css`, and keep the chart's grid layout rules.
- [x] **Step 18: Token detail, Refactor** with the tests green.
- [x] **Step 19: Config.** No build or config change.
- [x] **Step 20: Docs and full suite.** Header comments name US-0414 and the FR. Run `npx vitest run tests/`, `npx eslint .` and `npx prettier --check src tests` green.

## Traceability

| Requirement | Steps |
|---|---|
| FR1.1–FR1.3, FR1.5 | 6–8 |
| FR1.4 | 3–5, 7 |
| FR2.1 | 9, 11, 14, 15 |
| FR2.2 | 13–15 |
| FR2.3 | 10–12 |
| FR2.4, FR2.5 | 10–12 |
| FR3.1, FR3.2 | 16–18 |
| FR4.1 | 13–14 |
| NFR1 | 3, 6, 9 |
| NFR2 | 6, 10 |
| NFR3 | 2, 20 |
