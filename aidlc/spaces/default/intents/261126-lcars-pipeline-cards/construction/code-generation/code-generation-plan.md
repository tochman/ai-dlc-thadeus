# Code Generation Plan — US-0412 LCARS pipeline cards

## Summary

- Builds: the elbow stage card, the power-up, sweep, flash and level-bar fill, all held to the animations setting
- Touches: `src/renderer/Pipeline.jsx`, `src/renderer/theme.css`, `src/renderer/IntentDetail.jsx` (one `key`), `tests/renderer/Pipeline.test.jsx`, `tests/main/theme.test.js`
- Tests: about 10 new unit tests (change detection, card markup, CSS rules), 2 existing Pipeline tests updated for the number's new place

Sources: `inception/user-stories/stories.md` (US1.1–US4.1), `inception/refined-mockups/` (mockups, interaction spec, design-system mapping), `inception/requirements-analysis/requirements.md`. No Units: one stage-level build. Brownfield: files are changed in place.

## How it works

- **Elbow (US1.1):** `.stage-card` drops its 14 px side border and gets `padding-left: 36px`; the card's own `--card-tone` background shows there as the elbow, with the body's rounded corner as the inner bend. A new `<span className="stage-num">` holds "03" or "—" in the elbow's top block (first in the button's text, so it is read first). The body line starts with the status. Done and skipped cards outline the elbow with a 1 px inset line on the body's left edge.
- **Change detection (US3.1–US3.3):** a pure exported function `stageChanges(prev, stages)` compares each stage with the previous render by slug: status changed to done → `flash`; other status change → `sweep`; more lit level segments → `litFrom` (the old lit count). `prev` null (first render) → no changes. `Pipeline` keeps `prev` in a `useRef`, puts the result in state in a `useEffect`, and clears it after 900 ms.
- **Effects in markup:** sweep = an `aria-hidden` `<span className="stage-sweep">` inside the card, keyed by a counter so a repeat change restarts it; flash = `is-flashing` on the card; fill = `is-new` on segments at index ≥ `litFrom`.
- **Power-up (US2.1):** each `<li>` gets `style={{ '--i': n }}` (its order across phases); the CSS animates the `li` (not the card, so `is-breathing`/`is-attn` keep their own animation): delay `min(n, 9) × 40 ms`, 240 ms, so the last card ends by 600 ms.
- **Intent switch (US2.1 AC2.1.2):** `IntentDetail` renders `<Pipeline key={detail.dirName} …>`, so another intent's pipeline mounts fresh: it powers up and has no previous render, so it plays no sweep.
- **Animation setting (US4.1):** every new rule sits under `:root[data-motion='full']`; base styles are the final look, so the existing global Reduced/Off rules show cards at once. Only `transform`, `opacity` and `filter` animate (the sweep moves with `transform`, not `background-position`).

## Testing Contract

```json
{
  "version": 1,
  "methodology": "tdd",
  "source": "team",
  "ordering": "For each behaviour, write a failing test first, then the code that makes it pass, then refactor with the suite green.",
  "scope": "visual-express",
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
  "input_sha256": "sha256:bf67781c5d9a2d62eafa313b11753532c1c908603ae144c766ca5e11e2de8029",
  "contract_sha256": "sha256:273bd40f2c77c86af32e7d39b98a93c2a4a7aa8eb1cfd51862dbaaedbe03c825"
}
```

Not applicable layers: data model, repository and API (a renderer-only change, no data or IPC changes).

## Steps

- [x] **Step 1 — Structure.** No new files or config; work stays in the five files above. (all stories)
- [x] **Step 2 — Runner.** Run `npx vitest run tests/renderer/Pipeline.test.jsx tests/main/theme.test.js` on the unchanged tree and record that it is green. (all stories)
- [x] **Step 3 — Business logic, Red.** In `tests/renderer/Pipeline.test.jsx`, add `stageChanges` tests and record the failing run: first render gives nothing (AC3.1.2, AC3.3.2); status change gives `sweep` (AC3.1.1); change to done gives `flash`, not sweep (AC3.2.1, AC3.2.2); several changes in one update all come back (AC3.1.3); a rise in lit segments gives `litFrom` (AC3.3.1); a stage new to the list gives nothing. (US3.1, US3.2, US3.3)
- [x] **Step 4 — Business logic, Green.** Export `stageChanges(prev, stages)` from `Pipeline.jsx`, using `levelBar` for lit counts. (US3.1–US3.3)
- [x] **Step 5 — Business logic, Refactor.** Tidy with the tests green.
- [x] **Step 6 — Frontend, Red.** Add tests and record the failing run: the number sits in `.stage-num` and the body starts with the status, "—" with no number (AC1.1.2); each `li` carries its `--i` order (AC2.1.1); rerendering with a changed status adds one `.stage-sweep` to that card only, and a change to done adds `is-flashing` instead (AC3.1.1, AC3.2.2); two changes in one rerender mark both cards (AC3.1.3); a rise in approved units marks the new segment `is-new` (AC3.3.1); the first render marks nothing (AC3.1.2); effects add no text (AC1.1.5). In `tests/renderer/IntentDetail.test.jsx`, add that another `dirName` gives a new pipeline element (AC2.1.2). Update the two existing tests that read `01 · Klar` to the new body text. (US1.1, US2.1, US3.x)
- [x] **Step 7 — Frontend, Green.** In `Pipeline.jsx`: the `stage-num` span, the `--i` style, the `prev` ref, effect state with its 900 ms clear, the `stage-sweep` span, `is-flashing`, `is-new`. In `IntentDetail.jsx`: `key={detail.dirName}` on `<Pipeline>`. Header comments name US-0412 and the requirement. (US1.1, US2.1, US3.x)
- [x] **Step 8 — Frontend, Refactor.** Tidy with the tests green.
- [x] **Step 9 — Styles, Red.** In `tests/main/theme.test.js`, add a `US-0412` block and record the failing run: `.stage-card` has a 36 px elbow (`padding-left: 36px`) and `.stage-num` exists (AC1.1.1); `stage-power`, `stage-sweep`, `stage-flash` and `stage-fill` keyframes exist and use only `transform`, `opacity` and `filter` (AC4.1.4); every rule that uses them sits under `:root[data-motion='full']` (AC4.1.1–AC4.1.3); power-up delay is capped so the last ends by 600 ms (AC2.1.3); the flash has 2 peaks in 800 ms (AC3.2.3); the sweep runs 600 ms once, the fill 300 ms. (US1.1, US2.1, US3.x, US4.1)
- [x] **Step 10 — Styles, Green.** In `theme.css`, next to the US-0411 `stage-card` rules: the elbow, `.stage-num`, the done and skipped elbow outline, height about 84 px, the four keyframes and their full-motion rules. Check the long slug wraps inside the head row at 1280 px (AC1.1.4). (US1.1, US2.1, US3.x, US4.1)
- [x] **Step 11 — Styles, Refactor.** Tidy with the tests green; run ESLint and Prettier on the changed files.
- [x] **Step 12 — Docs and traceability.** Code summary and `traceability.json`; no new user-facing text, so no `sv.json`/`en.json` change (NFR4).
