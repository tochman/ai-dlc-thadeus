# Code Generation Plan: U5 u5-speckit-commands (US3.1 / US-1403)

## Summary

- Builds: Spec Kit command buttons: the next command for the active feature, a quick bar (specify, clarify, analyze, constitution, extension commands), typed with Enter into the agent tab in the tab's harness form
- Touches: `src/shared/speckitCommands.js` (new), `src/renderer/SpeckitCommandButton.jsx` and `SpeckitQuickCommands.jsx` (new), `SpeckitFeatureDetail.jsx`, `SpeckitFeatures.jsx`, `SpeckitRules.jsx`, the sv/en locales, feature docs, contract C7
- Tests: about 40 tests: command form, next command and description (main, 18), button (renderer, 9), quick bar (renderer, 7), feature detail and the two changed views (renderer, 6)

**Branch and precondition:** U5 builds on U6 (US-1402) and U7 (US-1404), both on `main`. Before Step 1, the intent record changes now uncommitted on `feat/US-1406` are committed there (`chore(US-1406): intent record through u5 NFR Design`). Then `git switch -c feat/US-1403 main` and bring the intent record over with `git checkout feat/US-1406 -- aidlc/spaces/default/intents/261119-spec-kit-framework .thadeus/tokens/261119-spec-kit-framework.json`. When #122 merges first, merge `main` into `feat/US-1403` and rerun the suite, as the project rule says.

**Sources:** `functional-spec.md`, `rules.md` (BR5.1–BR5.9), `frontend-components.md`, `security-design.md`, `performance-design.md`, `logical-components.md`, contracts C5, C6, C7. The functional review's five Minor findings are settled in Steps 3, 5, 7 and 13. Each step's criteria are in brackets.

## Steps

- [ ] **Step 1: Branch and story status.** The precondition above. Set US-1403 to 🚧 In progress, "for v0.3.0", in its epic marker, the epic's Status line and its FEATURES.md row.
- [ ] **Step 2: Runner check.** Run the unit-scoped commands from `unit-test-instructions.md` on the unchanged tree and record the baseline. No new dependency. [NFR8.4]
- [ ] **Step 3: Command form and description, Red.** `tests/main/speckitCommands.test.js`:
  - `speckitCommand`: claude `plan` gives `/speckit-plan`; opencode gives `/speckit.plan`; `speckit.git.commit` gives `/speckit-git-commit` and `/speckit.git.commit`; a leading `speckit.` on a core name is stripped to its stem (`speckit.plan` equals `plan`, review finding); arguments follow one space.
  - Unsafe names give `null`: `a;rm -rf`, `x\ny`, `speckit.`, `''`. Codex, `null` and an unknown harness give `null`.
  - `specifyText`: `a\nb\tc\u001b[2J` gives `a b c[2J`; U+0085, U+2028 and U+2029 become spaces; 1,500 characters give 1,000; blanks give `null`.
  - Record the failing output. [BR5.1, BR5.6, NFR4.2, NFR4.3]
- [ ] **Step 4: Command form and description, Green and Refactor.** `src/shared/speckitCommands.js` with `speckitCommand(harness, name, args)` and `specifyText(raw)`, pure, header naming `US-1403 FR5`. [NFR7.3, NFR8.1]
- [ ] **Step 5: Next command, Red.** Same file, `nextCommand(feature)` from U6's `flow` and `tasks`:
  - no spec gives specify; no plan gives plan; no `tasks.md` gives tasks;
  - a `tasks.md` that is empty or unreadable (`tasks.total === 0`) gives tasks, never converge (review finding);
  - an open task in a phase or a round gives implement;
  - all done, with or without rounds, gives converge, with `converged: 'unknown'` for the note.
  - Record the failing output. [BR5.2, BR5.3]
- [ ] **Step 6: Next command, Green and Refactor.** `nextCommand` in the same module.
- [ ] **Step 7: Button, Red.** `tests/renderer/SpeckitCommandButton.test.jsx` with a stubbed `useTerminal`:
  - Ready shows the typed text; a click calls `type('agent', text, { submit: true })` once and shows the terminal.
  - Disabled with its reason for: no agent tab; harness not known yet (`terminal.checking`); codex or another harness (not supported); busy (`intents.resume.busy`); asking (`intents.resume.asking`).
  - Text, harness and busy state all come from the one tab the command goes to (`terminal.lastAgent`, review finding).
  - Two clicks with `type` pending give one call [NFR7.4].
  - `type` resolving `false` or rejecting shows `speckit.commands.sendFailed` and warns.
  - Mount makes zero `type` calls.
  - Record the failing output. [BR5.7, BR5.8, NFR4.4, NFR6.1]
- [ ] **Step 8: Button, Green and Refactor.** `SpeckitCommandButton.jsx`: an LCARS `btn btn-accent` pill, the reason in the small label style, a `sending` flag set before `await type` and cleared in `finally`. [NFR2.1, NFR8.2]
- [ ] **Step 9: Quick bar, Red.** `tests/renderer/SpeckitQuickCommands.test.jsx`:
  - the core four show; extension commands show grouped by id in the reader's order;
  - a rejected `speckit:rules`, read errors or `hooksChecked: false` keep the core four and show `speckit-commands-rules-error`;
  - a `speckit:changed` push reads the rules again and types nothing;
  - specify stays disabled until the description is valid, sends `specifyText`'s result as its argument, clears the field only after a send that resolved `true`, and keeps it after a failed send.
  - Record the failing output. [BR5.5, BR5.6, NFR5.1, NFR7.1]
- [ ] **Step 10: Quick bar, Green and Refactor.** `SpeckitQuickCommands.jsx`, reading `speckit:rules` on mount and on `speckit:changed`, as `SpeckitRules` does.
- [ ] **Step 11: Feature detail and views, Red.** In `SpeckitFeatures.test.jsx` and `SpeckitRules.test.jsx`:
  - the active feature shows `speckit-commands-next` with its next command;
  - a feature that is not active shows `speckit-commands-not-active` naming the active one;
  - with no active feature (SPECIFY_FEATURE_NO_PERSIST) the note says no feature is active (review finding);
  - converge shows `speckit-commands-converge-note`;
  - a new `plan.md` after `speckit:changed` turns the button into tasks;
  - the empty state and the rules view's constitution button use `speckitCommand` (opencode gets `/speckit.specify`, `/speckit.constitution`);
  - the existing write-spy test, with every button clicked, still sees zero fs writes.
  - Record the failing output. [BR5.4, BR5.9, NFR3.1, NFR7.1]
- [ ] **Step 12: Feature detail and views, Green and Refactor.** Add the button and notes to `SpeckitFeatureDetail.jsx`; mount the quick bar above the list in `SpeckitFeatures.jsx`; remove `SPECIFY` and `RUN_CONSTITUTION`. Add the `speckit.commands.*` keys to `sv.json` and `en.json`. Run ESLint and Prettier on the changed files. [NFR1.1, NFR2.1, NFR8.3]
- [ ] **Step 13: Documentation and traceability.**
  - C7 in `contract-summary.md`: O1 settled (claude `/speckit-…`, opencode `/speckit.…`); codex (`$speckit-…`) is out of scope (review finding).
  - Write `code-summary.md`, `source-manifest.json` and `traceability.json`.
  - Set US-1403 to ✅ Done, tick its criteria, keep "for v0.3.0", and update the FEATURES.md row.

## Story-to-step map

| Story / AC | Steps |
|---|---|
| US3.1 AC3.1.1 (the next command for the active feature, one click) | 5, 6, 7, 8, 11, 12 |
| AC3.1.2 (quick commands, specify with a description, extension commands) | 3, 4, 9, 10 |
| AC3.1.3 (the harness's own form; the two hard-coded strings go) | 3, 4, 11, 12 |
| AC3.1.4 (a button that cannot run says why; nothing queued) | 7, 8 |

## Testing Contract

```json
{
  "version": 1,
  "methodology": "tdd",
  "source": "team",
  "ordering": "For each behaviour, write a failing test first, then the code that makes it pass, then refactor with the suite green.",
  "scope": "classic",
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
  "input_sha256": "sha256:36dbd137c1dafd3e8f4a29e23917b2a23c6dca6c2eacae2219e2473d1661458b",
  "contract_sha256": "sha256:bfe3fc216905988409d5a13f51ed4ab2709768afac7dac9ce951c1faa1c86abd"
}
```
