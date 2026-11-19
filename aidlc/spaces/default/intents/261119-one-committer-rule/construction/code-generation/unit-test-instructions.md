# Unit Test Instructions: US-0032

## Framework

vitest 5.1.0, already set up (`vitest.config.mjs`): project `main` (node) for `tests/main/**`, project `renderer` (jsdom, Swedish locale) for `tests/renderer/**`. Nothing to install.

## Run this work's tests

```bash
npx vitest run tests/main/costRules.test.js tests/renderer/CostRulesSection.test.jsx tests/main/i18nKeys.test.js
```

This command works on the unchanged tree and is the Red/Green command for every step.

## Tests

1. `tests/main/costRules.test.js`: the shipped pack's `project` lines hold the one-committer rule.
2. `tests/main/costRules.test.js`: the rule finds no clash with the repository's `team.md` "Docs and small chores may go straight to `main`"; the NFR2 limits test stays green.
3. `tests/main/costRules.test.js`: `costRulesStatus` reports `missing` lines for a block with the older pack, and none for a full pack or no block.
4. `tests/renderer/CostRulesSection.test.jsx`: missing lines show with an add button that puts them in the text area, without saving.

## Coverage

The project floor is 80% line coverage, measured by Build and Test on the full suite. This command does not judge it.

## Mocking and data

Main tests use the existing temp-folder project and `fakeExec` helpers in `tests/main/costRules.test.js`. Renderer tests use the existing `window.bridge` mock in `tests/renderer/CostRulesSection.test.jsx`. No other test data.
