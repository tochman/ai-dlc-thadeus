# Code Summary: US-0033 commit subject names only the stories that changed

## Files changed

- `src/main/parsers/features.js`: `splitChange` adds `named` beside `ids` on each change, through new helpers `clausesOf` and `namedIn`. A `US-XXXX` or `row:US-XXXX` block names its key id; any other block (`~` text, `row:EPIC-…`) names the ids whose clauses differ between before and after.
- `src/main/planningSync.js`: `subjectOf` cuts each id list after five with "and N more" (`idList`); `recordOnTarget` and `recordOnStory` record `storyIds` from `changes[].named`.
- `tests/main/planningSplit.test.js`: 5 new tests (AC1 story block, AC1 `3349d29`, AC2/AC3 `b2ed89e`, AC2 nothing named, AC5 split kept).
- `tests/main/planningSync.test.js`: 2 new tests (AC4 cut and keep five, AC2 fallback).
- `docs/features/epic-00-fixes.md`, `docs/FEATURES.md`: US-0033 set to 🚧 In progress, for v0.2.11.

## Key decisions

- `ids` (which decides the story branch's own blocks, US-0608 FR3) is unchanged; the subject uses `named`.
- Clauses: `**` removed, then split on `·`, `|`, line breaks, `, `, `. `, `; `, `: `. The `: ` keeps the `Status (date):` label apart, so a changed date names nothing.
- A changed range like `US-0001–US-0020` names both ends (`ponytail:` comment).
- The Features view label shows the narrower `storyIds` with no change there.

## Tests (TDD)

- Red, Step 3: 4 failed / 35 passed (`named` was `undefined`).
- Red, Step 6: 1 failed / 41 passed (`… US-1405, US-1406, US-1407` instead of `… US-1405 and 2 more`).
- Green: `npx vitest run tests/main/planningSplit.test.js tests/main/planningSync.test.js tests/main/features.test.js`: 3 files, 42 tests passed. With `tests/main/featureDocsStatus.test.js`: 43 passed. ESLint and Prettier clean on the four files.

## Not run in this stage

- The full suite and coverage: left for Build and Test.

## Deviations from the plan

- Release lists (`plan … for vX`, take-out lists) are also cut after five, as "each id list" reads; one extra assertion covers it.
- The AC5 guard passed on its first run, as the plan expected; the AC2 fallback test passed on its first run (the fallback already existed).
- `: ` added to the clause separators.
