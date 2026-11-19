# Unit Test Instructions: US-0033

## Framework

vitest 5.1.0, already set up (`vitest.config.mjs`), project `main` (node) for `tests/main/**`. Nothing to install.

## Run this work's tests

```bash
npx vitest run tests/main/planningSplit.test.js tests/main/planningSync.test.js tests/main/features.test.js
```

This command works on the unchanged tree and is the Red/Green command for every step.

## Tests

1. `tests/main/planningSplit.test.js`: a story block and a story row name only their own story (the `3349d29` case).
2. `tests/main/planningSplit.test.js`: epic "Stories:" and "Status" lines and a `FEATURES.md` row name only the stories whose clause changed; a new story names itself alone (the `b2ed89e` case); nothing told, nothing named.
3. `tests/main/planningSplit.test.js`: the story-branch split (`keep`, `ids`) is unchanged.
4. `tests/main/planningSync.test.js`: `subjectOf` cuts after five stories with "and N more", keeps five, and falls back to `docs: update the feature docs`.

## Coverage

The project floor is 80% line coverage, measured by Build and Test on the full suite. This command does not judge it.

## Mocking and data

Pure functions: inline markdown strings shaped like the real epic, `FEATURES.md` and release-plan files. No mocks.
