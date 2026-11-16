# Code Generation Plan: US-0208, detailed token view

## Summary

- Builds: stored token readings per intent, and a token detail view in the intent's main panel that follows the approved visual mockups
- Touches: new `src/main/tokenReadings.js`, `src/renderer/TokenDetail.jsx`, `src/renderer/tokenChart.js`; `src/main/ipc.js`, `src/preload/index.js`, `src/renderer/IntentDetail.jsx`, `src/renderer/TokenView.jsx`, `src/renderer/theme.css`, the locales, `package.json` (`@visx/*`)
- Tests: about 13 new tests in `tests/main/tokenReadings.test.js`, `tests/main/tokenChart.test.js` and `tests/renderer/TokenDetail.test.jsx`

## Design in brief

The source of truth for the look is the approved canvas https://claude.ai/artifact/WrphyHBekrup5wdVzwi8Yt and `inception/refined-mockups/` (style, colours, layout).

- **Readings (FR2), `src/main/tokenReadings.js`.**
  - Pure `readingOf(intentCost, now)` gives `{at, input, output, cacheWrite5m, cacheWrite1h, cacheRead, usd}`.
  - Pure `addReading(list, reading)` skips a reading taken less than 30 s after the last or with unchanged totals. Above 2000 readings it drops every second one from the oldest half (FR2.2).
  - `readReadings(root, dirName)` and `recordReading(root, dirName, reading)` use `.thadeus/tokens/<dirName>.json` through `resolveInRoot` and `writeAtomic`. The dir name is checked against `^[\w.-]+$` and must not contain `..`. A missing file reads as `[]`; a corrupt one is logged and reads as `[]` (FR2.1, NFR2).
- **Where readings are taken (FR2).** In `ipc.js`'s `project:cost` handler, for each in-flight intent with ledger totals, after the summary is built. It is fire-and-forget: `recordReading(...).catch(log)`, so the cost answer never waits (NFR2). It needs `ledger.js`'s per-intent `byStage` totals, which the summary already returns.
- **The ledger's 5 m / 1 h split.** `costOf` merges cache writes into one `cacheWrite`. `intentCost` also keeps a raw `tokens` object with `cacheCreate5m` and `cacheCreate1h` for the readings and the tooltip. This is additive and nothing that reads `cacheWrite` changes.
- **IPC.** `tokens:readings` (projectId, dirName) returns `readReadings`, and the preload gets `getTokenReadings`.
- **Chart helpers, `src/renderer/tokenChart.js` (pure).**
  - `elapsedLabel(ms)` gives `h:mm`.
  - `stackSeries(readings)` gives the five stacked kinds over elapsed time.
  - `rateSeries(readings)` gives tokens per minute between consecutive readings.
  - `splitRows(rows, measure)` gives the top 12 and "other", in tokens by kind or in dollars.
- **View, `src/renderer/TokenDetail.jsx`**, laid out as on the canvas:
  - slate frame, ‹ Back, steel Antonio title with tags;
  - Tokens over time (visx `AreaStack` on a faint grid, coral marker and tooltip, Diagram / Table);
  - By stage, By agent and By model cards (stacked `BarStack` or one steel `Bar`, Tokens / $);
  - a right column with Mode, Tokens, Cost, Recorded, the rate line and Model;
  - empty states as dashed boxes with one sentence (FR6).

  Back and Esc call `onBack`, and focus moves to the `h2` on open (FR1, NFR3).
- **Wiring.** `TokenView` gets `onOpen` and becomes one button (click, Enter, Space). `IntentDetail` keeps `showTokens` state and renders `TokenDetail` in place of its main panel, and Back returns focus to the small view (FR1).
- **Style (FR7).** New `.token-detail-*` classes in `theme.css` from the existing variables. Add `--steel-mid: #2f6f9f` for cache write 5 m. Easing only with `data-motion='full'`.
- **Decided at the mockup gate:** the split cards carry only Tokens / $. Diagram / Table is on Tokens over time.

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

Layers:

- No database. The data-access layer is the readings file (Steps 3–4).
- The business logic is the pure reading and chart helpers (Steps 3–6).
- The API is the `tokens:readings` IPC and the reading hook in `project:cost` (Step 7).
- The frontend is the view and its wiring (Steps 8–9).

## Steps

- [x] **Step 1: Structure and dependency.** Run `npm install @visx/shape @visx/scale @visx/group @visx/axis @visx/grid @visx/tooltip @visx/responsive` (NFR1). The new files get header comments naming US-0208.
- [x] **Step 2: Runner.** Verify `npx vitest run tests/renderer/TokenView.test.jsx tests/main/ledger.test.js` passes as it stands; record the counts.
- [x] **Step 3: Readings, Red.** `tests/main/tokenReadings.test.js`, failing tests:
  1. `readingOf` maps an intent cost to the reading shape, with 5 m and 1 h kept apart (FR2.3).
  2. `addReading` skips a reading under 30 s after the last and an unchanged one, and appends otherwise (FR2).
  3. Past 2000 readings it thins the oldest half and keeps the newest (FR2.2, NFR4).
  4. `recordReading`/`readReadings` round-trip in a temp project under `.thadeus/tokens/` (missing file reads `[]`, corrupt file reads `[]`), and a dir name with `..` or `/` is refused (FR2.1).
- [x] **Step 4: Readings, Green and Refactor.** Implement `src/main/tokenReadings.js` and the additive raw `tokens` on `intentCost` in `ledger.js`.
- [x] **Step 5: Chart helpers, Red.** `tests/main/tokenChart.test.js`:
  5. `elapsedLabel` formats `0:00`, `0:51`, `1:42` and past 24 h (FR3.1).
  6. `stackSeries` stacks the five kinds in order over elapsed time; `rateSeries` gives tokens per minute and nothing for fewer than two readings (FR3.1, FR3.2).
  7. `splitRows` keeps the top 12 plus "other", in tokens by kind or in dollars (FR3.3).
- [x] **Step 6: Chart helpers, Green and Refactor.** Implement `src/renderer/tokenChart.js`.
- [x] **Step 7: IPC.** Add `tokens:readings`, the preload `getTokenReadings`, and the fire-and-forget reading in `project:cost` for in-flight intents (FR2, NFR2). Covered by Steps 3–4 and the view tests' bridge mock.
- [x] **Step 8: View, Red.** `tests/renderer/TokenDetail.test.jsx` (Swedish UI, bridge mocked):
  8. Clicking the small view or pressing Enter opens the detail in place of the main panel; Back and Esc return with focus on the small view (FR1).
  9. Live: the summary column shows Mode Live, tokens, cost and readings; the charts render with text labels for every kind (FR3, FR5, FR7).
  10. The over-time Diagram / Table switch shows a real `<table>` of the readings; a split card's Tokens / $ switch changes the figures to dollars (FR4).
  11. A finished intent with no readings shows Recorded and the one-sentence empty message in place of the over-time chart; the splits still show (FR5, FR6).
  12. Focusing a point shows the tooltip with each kind and the cost (FR4, NFR3).
  13. Every new text exists in both locales (`tests/main/i18nKeys.test.js`, FR8).
- [x] **Step 9: View, Green and Refactor.** Implement `TokenDetail.jsx`, the `TokenView` button, the `IntentDetail` swap, the `theme.css` classes, and the locale keys, matching the canvas.
- [x] **Step 10: Documentation and traceability.** Write `code-summary.md` and `traceability.json` (`upstream_ids` with leaf IDs + `coverage[{id, status, target}]`, every target a real file).

Environment/build configuration: only the `@visx/*` entries in `package.json` and `package-lock.json` (Step 1).
