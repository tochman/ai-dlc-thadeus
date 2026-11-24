# Code Summary: U5 u5-speckit-commands (US3.1 / US-1403)

## Files

New:
- `src/shared/speckitCommands.js`: `speckitCommand`, `commandName`, `nextCommand`, `specifyText`. These are pure functions and the only place that knows the command form (C7).
- `src/renderer/SpeckitCommandButton.jsx`: one LCARS pill. It is ready, or disabled with its reason. It has a `sending` guard and sends one `type` call with Enter. A failed send shows a note.
- `src/renderer/SpeckitQuickCommands.jsx`: specify with a description, then clarify, analyze and constitution, then the extension commands grouped by id. It reads `speckit:rules` on mount and on each `speckit:changed`.
- Tests: `tests/main/speckitCommands.test.js`, `tests/renderer/SpeckitCommandButton.test.jsx`, `tests/renderer/SpeckitQuickCommands.test.jsx`.

Changed:
- `SpeckitFeatureDetail.jsx`: the next command for the active feature, the not-active note (which names the active feature, or says none is active) and the converge note. It takes a new `activeName` prop.
- `SpeckitFeatures.jsx`: the quick bar sits above the list and in the empty state. `SPECIFY` and the empty state's own button are gone.
- `SpeckitRules.jsx`: `RUN_CONSTITUTION` is gone. The constitution button is now a `SpeckitCommandButton`.
- `sv.json` and `en.json`: new `speckit.commands.*` keys. `speckit.features.empty` and `speckit.rules.noConstitution` no longer name the claude form. The now unused `speckit.features.specify` and `speckit.rules.runConstitution` are removed.
- `theme.css`: five lines for the pill and the bar, in the existing Spec Kit strip-edged style.
- The two view tests, the feature docs, and C7 in `contract-summary.md` (record side).

## Key decisions

- **Constitution in the rules view keeps `submit: false`.** `/speckit-constitution` takes the principles as its argument, so the person adds them before sending. The quick bar's constitution uses Enter, like every other U5 button (BR5.7).
- **The empty state's specify is the quick bar's specify**, which needs a description and sends with Enter. The old separate button typed the command with no argument.
- **Harness, state and text come from `terminal.lastAgent`** through `harnessOf`, never from the global `harness` field.
- **The terminal is not shown by a separate call.** `type` already shows the tab (`TerminalContext.run`), so the button only calls `type`.
- **Arguments are cleaned inside `speckitCommand`** through `specifyText`, so no caller can pass a line break.
- **`nextCommand` returns `converged: 'unknown'` for every converge**, as the plan says, so the note shows with or without rounds.
- `ponytail:` the core command list is written by hand for Spec Kit 1.4.3.

## Tests (TDD, Red before Green)

| Command | Red | Green |
|---|---|---|
| `npx vitest run --project main tests/main/speckitCommands.test.js` | Step 3: import of `speckitCommands.js` failed to resolve. Step 5: 4 failed, `TypeError: nextCommand is not a function` | 15 passed |
| renderer `SpeckitCommandButton.test.jsx` | the import failed to resolve | 9 passed |
| renderer `SpeckitQuickCommands.test.jsx` | the import failed to resolve | 7 passed |
| renderer `SpeckitFeatures.test.jsx` and `SpeckitRules.test.jsx` | 9 failed (no `speckit-commands-next`, `-not-active`, `-root`, `speckit-rules-constitution-run`; the old label) | 28 passed (17 and 11) |
| `--project main tests/main/i18nKeys.test.js tests/main/featureDocsStatus.test.js` | not applicable | 13 passed |

Baseline (Step 2): the main file did not exist yet ("no test files"). The two existing renderer files had 21 passed.

ESLint and Prettier `--check` pass on every changed file.

**Written but not run here:** the full suite and coverage, and `tests/renderer/SpeckitShell.test.jsx`, a consumer of the changed views. The brief limits this stage to the unit's scoped commands, so Build and Test runs these.

## Deviations from the plan

- 15 main tests instead of about 18, with several cases grouped in each `it`. The total is 38 new tests plus 2 rewritten ones, against about 40 planned.
- `theme.css` is not in the plan's file list. It gets five CSS lines for the LCARS look.
- An extra test id, `speckit-commands-reason`, is used for the disabled reason. `speckit-commands-send-failed` is used for the failed-send note.
- The NFR3.1 check in the renderer asserts that no bridge call other than `speckitFeatures`, `speckitRules` and `onSpeckitChanged` happens with every button clicked. The main-side fs write spies are U6 and U7 tests and are unchanged. NFR4.1 is a static import check in `tests/main/speckitCommands.test.js`.
- In jsdom, a text input strips line breaks from its value. The renderer specify test therefore uses a tab, and line breaks are covered in the main test.
