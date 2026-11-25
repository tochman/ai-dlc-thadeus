# Code Summary: two unstable tests (US-0052)

Built in the conversation, not by the developer agent: a few lines in two test files. No source file changed.

- **`ConfigView.test.jsx`:** waits for React's effects and requires one timer before the clock moves.
- **`TokenDetail.test.jsx`:** the long test is two, and finds the heading by its text inside the detail instead of by role in the whole document. The role lookups took about 0.3 s of 0.77 s.

## Shown

| Check | Result |
|---|---|
| Counter does not update (view changed for one run, put back) | ConfigView fails |
| No interval at all (the same) | ConfigView fails |
| Focus does not come back (the same) | both new TokenDetail tests fail |
| 24 busy loops on the machine, three runs | old test 3.3–4.9 s of 5 s; new tests 1.2–2.5 s each |
| The two files, 50 times in a row | 50 passed |
| Full suite with coverage | exit 0: 2682 passed, 1 skipped, 93.52% lines |
| ESLint, Prettier | clean |

## Deviations

- The ConfigView fault itself was not reproduced; the plan's "fails when the timer is not started" is shown with the interval removed.
- No limit is raised and no retry is added.
- The load test ran the two files under load, not the full suite.
