# Code Summary: US-0032 one committer for feature docs

## Files changed

- `src/shared/costRules.js`: `COST_RULES_PACK.project` gains the line "On `main`, NEVER commit `docs/FEATURES.md`, `docs/features/` or `docs/releases/`; THADEUS commits and pushes them." Header names US-0032.
- `src/main/costRules.js`: `costRulesStatus` returns `missing`: per target with a present block, the shipped lines that block lacks (`{}` when none).
- `src/renderer/CostRulesSection.jsx`: note `cost-rules-missing` lists missing lines; button `cost-rules-add-missing` appends them to the text areas. Nothing is saved until the usual preview is confirmed.
- `src/shared/locales/sv.json`, `en.json`: keys `costRules.missingTitle`, `costRules.addMissing`.
- `tests/main/costRules.test.js`: 3 new tests (pack holds the rule; no clash with the repo's `team.md`; `missing` in the status).
- `tests/renderer/CostRulesSection.test.jsx`: 2 new tests (offer and add without saving; no offer when nothing is missing).
- `docs/features/epic-00-fixes.md`, `docs/FEATURES.md`: US-0032 set to 🚧 In progress, for v0.2.11.

## Key decisions

- `missing` is worked out from the current text, so the note goes away once the lines are added, by the button or by hand.
- The note shows only while the pack is switched on, using classes already in the section (`field`, `field-label`, `tag tag-warn`, `btn`).
- The new rule is the last line of the pack's `project` list; the NFR2 limits (≤ 8 lines, ≤ 800 characters) still hold.

## Tests (TDD)

- Red, Step 3: the pack-rule test failed (`expected [ …(3) ] to include 'On \`main\`, NEVER commit …'`), 1 failed / 27 passed.
- Red, Step 5: the `missing` test failed (`expected undefined to deeply equal {}`), 1 failed / 28 passed.
- Red, Step 7: the renderer test failed (`Unable to find an element by: [data-testid="cost-rules-missing"]`), 1 failed / 30 passed.
- Green: `npx vitest run tests/main/costRules.test.js tests/renderer/CostRulesSection.test.jsx tests/main/i18nKeys.test.js`: 3 files, 31 tests passed. With `tests/main/featureDocsStatus.test.js` added: 4 files, 39 tests passed.

## Not run in this stage

- The full suite (`npx vitest run tests/`) and coverage: left for Build and Test.
- AC3 ("exactly one commit") needs an agent session and is checked by hand.

## Deviations from the plan

- The Step 4 clash test was written with the Step 3 Red test and passed at once (no clash keyword pair matches the new rule), so it had no failing run.
- One extra renderer edge-case test: no note when nothing is missing.
