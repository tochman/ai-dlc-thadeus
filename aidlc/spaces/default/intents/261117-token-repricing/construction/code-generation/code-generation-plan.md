# Code Generation Plan: US-0211 Reprice recorded tokens

## Summary

- Builds: a current price table with per-model sources, USD repriced from stored tokens, and "recorded · at current prices" in every cost view
- Touches: new `src/main/modelRates.js`, `src/main/reprice.js`, `src/main/data/model-rates.json`; `ledger.js`, `auditCost.js`, `projectService.js`, `ipc.js`, `settings.js`, `format.js`, the cost views, `ProjectSettingsView.jsx`, `sv.json`/`en.json`
- Tests: about 40 new unit tests in 2 new and 9 extended vitest files (main and renderer)

## Approach

- **Rates (FR1)**: `loadRates(root, settings)` builds one table per model: the override file (path from project settings `ratesPath`, else `env.AIDLC_MODEL_RATES` in `.claude/settings.local.json`, else `.claude/settings.json`), then the app's table, then `.claude/tools/data/model-rates.json`. Each row carries `source: 'project' | 'app' | 'aidlc'`. A missing or invalid override file is skipped and gives a note (`overrideMissing` / `overrideInvalid` + path). The result is cached per project and read again only when the mtime of one of those files changes (NFR2, AC1.5.2), checked once per `project:cost` call, never per row.
- **Model matching**: the same as AI-DLC's `normalizeModel` (provider prefix, `claude-`, `[1m]`, `-vN[:M]`, `-YYYYMMDD` dropped, exact key only). A bare key such as `opus-5-5`, as the ledger stores it, also matches. No family fallback (FR2.3).
- **Repricing (FR2)**: `priceTokens(model, tokens, table)` returns USD or null. Every cost row from `summarizeLedger` gets `currentUsd` (null when no model in it has a rate) and `currentMissing` (count of models without a rate): model rows from their own tokens; stage, intent, scope and project totals by summing their `byModel`; timeline points and per-machine figures (`mergeIntentCosts`) likewise. Audit rows already carry their cache writes as 5m (FR2.2); the summary marks `auditFiveMinute: true` when any audit part was used.
- **Display (FR3)**: `formatCostPair(c)` in `format.js` gives the recorded USD, plus "· at current prices $Y" when the two differ by $0.01 or more. Detail views (intent detail, cost tab totals and per-machine figures, cost panel, token detail) show it inline; intent list rows and chart points put the current figure in their tooltip. The cost tab's model table gets a source column; notes say which override was skipped and why, that `haiku-5-5` is priced at its higher prompt-size tier, and that audit cache writes are priced as 5m. Every text goes through `t()` in both locales, LCARS look.
- **Settings**: project settings gain `ratesPath` (relative to the project, or empty), validated like `featuresPath`, with a field in the project settings view.
- **Read only (NFR1)**: nothing is written under `aidlc/` or `.claude/`; a test checks it.

## Deviations to note

- Per-agent rows keep only the recorded figure: the record does not tie an agent's tokens to a model, so they cannot be repriced without guessing (FR2.3). The token-history readings (`.thadeus/tokens/`) are kept as recorded for the same reason.
- `.claude/` is the only harness folder read for AI-DLC's table (FR1.1 names it). ponytail: other harnesses' tables when a project needs them.
- Per the person's note when the work was parked ("Commit records to main"), the workflow records under `aidlc/` go to `main` in their own commit, not in the story's pull request.

## Steps

Story order US1.1 → US1.3 → US1.2, US1.4, US1.5. Each Red step records the failing run's output in `code-summary.md`.

- [x] Step 1: Verify the runner: `npx vitest run tests/main/ledger.test.js` passes on the unchanged tree; record it in `unit-test-instructions.md`. (all)
- [x] Step 2: App table, data: write `src/main/data/model-rates.json` in AI-DLC's format with `sonnet-5-5` (cache read $0.10/M), `fable-5-2` ($8 / $40, cache read $0.20/M) and `haiku-5-5` at its higher tier, with the as-of date. Prices not given in the story (the `haiku-5-5` row, `fable-5-2` cache writes) are read from the published pricing page; if it cannot be read, stop and ask the person. (US1.1 AC1.1.5, FR1.3, FR1.4)
- [x] Step 3: Rates loading, Red: `tests/main/modelRates.test.js`: resolution order per model, settings.local over settings.json, project `ratesPath` wins, missing and invalid override skipped with a note, the app's table values, re-read only on mtime change. (US1.1 AC1.1.1–AC1.1.5, US1.5 AC1.5.2)
- [x] Step 4: Rates loading, Green: `src/main/modelRates.js` with `loadRates` and `normalizeModel`. (FR1.1, FR1.2, FR1.6, NFR2)
- [x] Step 5: Rates loading, Refactor with the tests green.
- [x] Step 6: Repricing, Red: `tests/main/reprice.test.js` (sonnet-5-5 ledger node from its five counts, audit row cache writes at 5m, a model with no rate stays null and borrows nothing, sources per model, totals and byScope sum their models with missing ones counted, agent rows have no current figure); extend `tests/main/crossMachineCost.test.js` (per-machine `currentUsd`, no file under `aidlc/` or `.claude/` written). (US1.3 AC1.3.1–AC1.3.4, US1.5 AC1.5.1)
- [x] Step 7: Repricing, Green: `src/main/reprice.js`; `summarizeLedger` and `mergeIntentCosts` take the table and add `currentUsd` / `currentMissing`; `loadCrossMachineCost` passes it. (FR2.1–FR2.3)
- [x] Step 8: Repricing, Refactor with the tests green.
- [x] Step 9: Cost call and settings, Red: extend `tests/main/settings.test.js` (`ratesPath` kept, invalid path refused) and the `project:cost` test in `tests/main/crossMachineCost.test.js` (result carries `rates.sources` and `rates.notes`). (FR1.2, FR1.5, FR1.6)
- [x] Step 10: Cost call and settings, Green: `settings.js` `ratesPath`; `ipc.js` `project:cost` loads the rates once per call and returns the sources and notes.
- [x] Step 11: Cost call and settings, Refactor with the tests green.
- [x] Step 12: Views, Red: extend `tests/renderer/format.test.jsx` (both figures from $0.01, one below, price missing), `CostTab.test.jsx` and `CostTabMachines.test.jsx` (pair inline, source column, the three notes), `CostPanel.test.jsx` (pair, chart point tooltip), `IntentDetail.test.jsx`, `IntentList.test.jsx` (tooltip), `TokenDetail.test.jsx`, `ProjectSettingsView.test.jsx` (rates path field). (US1.2 AC1.2.1–AC1.2.3, US1.4 AC1.4.1–AC1.4.4)
- [x] Step 13: Views, Green: `formatCostPair` and the view changes; new keys in `sv.json` and `en.json`; `data-testid` on new elements.
- [x] Step 14: Views, Refactor with the tests green.
- [x] Step 15: Run the unit-scoped command and the full suite `npx vitest run tests/` (team rule) green.
- [x] Step 16: Feature docs: US-0211 stays 🚧 until Build and Test; header comments name US-0211 and their FR.

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
      "text": "- **Methodology**: tdd\n- **Methodology evidence**: Decided by the person at the practices interview (Q1: test first, TDD, for new work). Earlier Code Generation plans recorded the framework default `test-after`; the affirmed choice replaces it for new work.\n- **Ordering**: For each behaviour, write a failing test first, then the code that makes it pass, then refactor with the suite green.\n- **Runner**: vitest 5.1.0 with two projects, `main` (node, `tests/main/**/*.test.js`) and `renderer` (jsdom, `tests/renderer/**/*.test.jsx`, Swedish locale). Currently 353 `it`/`test` call sites by static count; the knowledge base's \"about 490\" is not reconciled.\n- **Coverage floor**: 80% line coverage, checked in CI with `@vitest/coverage-v8` (Q2). Not set up yet; it is to be added to the repository and to the `verify` job of `.github/workflows/release.yml`. No coverage is measured today.\n- **Suite green before merge**: the full `npx vitest run tests/` suite must pass before any story pull request merges. CI runs it on every pull request into `main` and on every version tag.\n- **Manual check**: the built macOS `.dmg` is checked by hand before a release tag. Jsdom tests do not run the built app."
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
  "input_sha256": "sha256:966ae7aa76a3ff867860dd0a2f0ee2fa471dead8c2ee6b26e903919b9f425698",
  "contract_sha256": "sha256:89b142ff38d5934191dfc83fed7aed0fa585c14d568cc2a017bf79391c7e68d1"
}
```
